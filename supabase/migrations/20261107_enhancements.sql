-- ========================================================
-- OTLOB ENHANCEMENTS MIGRATION (Phase 1, 2, 3)
-- Date: 2026-11-07
-- Region: Bassous (باسوس) & Operational Improvements
-- ========================================================

-- 1. إضافة أعمدة الخصومات الترويجية على مستوى المنتجات (Item-Level Promotions)
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS discount_type text CHECK (discount_type IN ('percentage', 'fixed')),
  ADD COLUMN IF NOT EXISTS discount_value numeric(10, 2) DEFAULT 0;

-- 2. تحسين جدول المتاجر لدعم أسباب التجميد وتاريخ التجميد وتثبيت المتاجر بالرئيسية
ALTER TABLE IF EXISTS public.stores
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS reactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- 3. التأكد من هيكل جدول التقييمات والمراجعات (Reviews Table)
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- السماح بتقييم المتجر مباشرة من صفحته بدون اشتراط وجود طلب فوري
ALTER TABLE IF EXISTS public.reviews ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.reviews DROP CONSTRAINT IF EXISTS reviews_order_id_key;

-- 4. فهارس الأداء لسرعة استرجاع التقييمات والمنتجات المخفضة
CREATE INDEX IF NOT EXISTS idx_products_discount ON public.products(store_id) WHERE discount_value > 0;
CREATE INDEX IF NOT EXISTS idx_reviews_store ON public.reviews(store_id, is_visible);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON public.reviews(order_id);

-- 5. صلاحيات وسياسات الأمان لجدول reviews لتمكين القراءة والإضافة
GRANT ALL ON public.reviews TO anon, authenticated, service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_read" ON public.reviews;
CREATE POLICY "reviews_public_read" ON public.reviews
  FOR SELECT USING (is_visible = true);

DROP POLICY IF EXISTS "reviews_public_insert" ON public.reviews;
CREATE POLICY "reviews_public_insert" ON public.reviews
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "reviews_admin_all" ON public.reviews;
CREATE POLICY "reviews_admin_all" ON public.reviews
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'service_role');


