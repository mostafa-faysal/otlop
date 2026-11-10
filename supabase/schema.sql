-- =====================================================================
--  أطلب (Otlob) — Supabase schema (الإصدار الشامل: العروض والتقييمات والطلبات)
--  شغّله يدويًا من: Supabase Dashboard → SQL Editor
--
--  - الملف داخل transaction واحدة: أي خطأ = rollback كامل.
--  - Idempotent: آمن للتشغيل أكثر من مرة، ولا يحذف أي بيانات.
--  - يدعم نظام العروض والخصومات المتكامل بأنواعه الأربعة مع فض التضارب لأفضل توفير.
--  - يدعم نظام التقييمات وتحديث المتوسط تلقائيًا وإخفاء المخالف وبلاغات الإساءة.
--  - يدعم ربط طلبات الضيوف بحساباتهم بعد التسجيل للتمكن من التقييم بأمان.
--  - يدعم حفظ السعر الأصلي وسعر البيع وعمولة المنصة 5% لتقارير المبيعات.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Enums & Types
-- ---------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('customer', 'merchant', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum
    ('pending', 'accepted', 'preparing', 'on_the_way', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.offer_type as enum
    ('percentage', 'fixed_price', 'fixed_amount', 'free_delivery');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.offer_status as enum
    ('draft', 'scheduled', 'active', 'paused', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status as enum
    ('pending', 'investigating', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.statement_status as enum
    ('pending', 'partially_paid', 'paid', 'overdue');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ledger_entry_type as enum
    ('order_commission', 'commission_refund', 'adjustment', 'statement_settlement');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method_type as enum ('cash', 'bank_transfer');
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------
-- 2) Tables
-- ---------------------------------------------------------------------

-- الملفات الشخصية
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 80),
  phone       text check (phone is null or phone ~ '^01[0125][0-9]{8}$'),
  avatar_url  text,
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- العناوين
create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  label       text not null default 'المنزل' check (char_length(label) <= 40),
  city        text,
  area        text,
  street      text not null check (char_length(street) between 3 and 200),
  building    text,
  notes       text check (notes is null or char_length(notes) <= 300),
  lat         numeric(9, 6) check (lat is null or lat between -90 and 90),
  lng         numeric(9, 6) check (lng is null or lng between -180 and 180),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses (user_id);
create unique index if not exists addresses_one_default_per_user
  on public.addresses (user_id) where is_default;

-- التصنيفات
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  image_url   text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- إعدادات المنصة العامة (يتحكم بها السوبر أدمن حصريًا)
create table if not exists public.platform_settings (
  id                           int primary key default 1 check (id = 1),
  default_commission_rate      numeric(5, 2) not null default 5.00 check (default_commission_rate between 0 and 100),
  service_fee_active           boolean not null default false,
  service_fee_amount           numeric(8, 2) not null default 0 check (service_fee_amount >= 0),
  suspension_grace_period_days int not null default 7 check (suspension_grace_period_days >= 0),
  updated_at                   timestamptz not null default now(),
  updated_by                   uuid references public.profiles (id) on delete set null
);

insert into public.platform_settings (id, default_commission_rate, service_fee_active, service_fee_amount, suspension_grace_period_days)
values (1, 5.00, false, 0, 7)
on conflict (id) do nothing;

-- المتاجر
create table if not exists public.stores (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid references public.profiles (id) on delete set null,
  name              text not null,
  slug              text not null unique,
  description       text,
  address           text,
  logo_url          text,
  cover_url         text,
  rating            numeric(2, 1) not null default 0 check (rating between 0 and 5),
  reviews_count     int not null default 0 check (reviews_count >= 0),
  commission_rate   numeric(5, 2) not null default 5.00 check (commission_rate between 0 and 100), -- نسبة عمولة المتجر المحددة من السوبر أدمن
  delivery_fee      numeric(8, 2) not null default 0 check (delivery_fee >= 0),
  delivery_minutes  int not null default 30 check (delivery_minutes > 0),
  min_order         numeric(8, 2) not null default 0 check (min_order >= 0),
  is_open           boolean not null default true,
  is_active         boolean not null default true,                                                  -- حالة تشغيل المتجر واستقبال الطلبات
  suspension_reason text check (suspension_reason is null or char_length(suspension_reason) <= 300),-- سبب الإيقاف في حال تجميده
  suspended_at      timestamptz,
  suspended_by      uuid references public.profiles (id) on delete set null,
  reactivated_at    timestamptz,
  reactivated_by    uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists stores_owner_idx on public.stores (owner_id);

-- تصنيفات المتاجر
create table if not exists public.store_categories (
  store_id     uuid not null references public.stores (id) on delete cascade,
  category_id  uuid not null references public.categories (id) on delete cascade,
  primary key (store_id, category_id)
);

-- المنتجات والأطباق (السعر الأصلي يظل ثابتًا دائمًا)
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores (id) on delete cascade,
  category_id   uuid references public.categories (id) on delete set null,
  name          text not null,
  description   text,
  price         numeric(8, 2) not null check (price >= 0),
  image_url     text,
  is_available  boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists products_store_idx on public.products (store_id);

-- العروض والخصومات الشاملة
create table if not exists public.offers (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid references public.stores (id) on delete cascade,  -- null = عرض عام للمنصة
  title           text not null check (char_length(title) between 3 and 100),
  description     text,
  code            text,                                                  -- اختياري (كوبون أو عرض تلقائي)
  discount_type   public.offer_type not null default 'percentage',
  discount_value  numeric(8, 2) not null default 0 check (discount_value >= 0),
  applies_to      text not null default 'all' check (applies_to in ('all', 'specific')),
  min_order       numeric(8, 2) not null default 0 check (min_order >= 0),
  max_discount    numeric(8, 2) check (max_discount is null or max_discount > 0),
  priority        int not null default 0 check (priority >= 0),          -- لفض تداخل العروض
  usage_limit           int check (usage_limit is null or usage_limit > 0),
  used_count            int not null default 0 check (used_count >= 0),
  status                public.offer_status not null default 'active',
  delivery_cost_bearer  text default 'store' check (
    (discount_type = 'free_delivery' and delivery_cost_bearer in ('store', 'platform'))
    or (discount_type <> 'free_delivery' and (delivery_cost_bearer is null or delivery_cost_bearer in ('store', 'platform')))
  ), -- الطرف المتحمل للتوصيل المجاني
  starts_at             timestamptz,
  ends_at               timestamptz,
  is_public             boolean not null default true,                         -- هل يظهر في صفحة العروض العامة
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (
    (discount_type <> 'percentage' or (discount_value between 0.01 and 100)) and
    (discount_type = 'free_delivery' or discount_value > 0)
  ),
  check (starts_at is null or ends_at is null or starts_at <= ends_at)
);
create unique index if not exists offers_code_unique
  on public.offers (upper(code)) where code is not null;
create index if not exists offers_store_status_idx on public.offers (store_id, status);
create index if not exists offers_public_active_idx
  on public.offers (status, is_public, priority desc, created_at desc)
  where is_public;

-- ضمان ترقية قيود offers إذا كان الجدول موجودًا مسبقًا
alter table public.offers alter column delivery_cost_bearer drop not null;
do $$
declare v_con record;
begin
  for v_con in
    select c.conname from pg_constraint c
    where c.conrelid = 'public.offers'::regclass and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~* 'delivery_cost_bearer'
      and c.conname <> 'offers_delivery_cost_bearer_chk'
  loop
    execute format('alter table public.offers drop constraint %I', v_con.conname);
  end loop;
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.offers'::regclass and conname = 'offers_delivery_cost_bearer_chk'
  ) then
    alter table public.offers add constraint offers_delivery_cost_bearer_chk check (
      (discount_type = 'free_delivery' and delivery_cost_bearer in ('store', 'platform'))
      or (discount_type <> 'free_delivery' and (delivery_cost_bearer is null or delivery_cost_bearer in ('store', 'platform')))
    );
  end if;
end $$;

-- المنتجات المشمولة في العرض (عندما يكون applies_to = 'specific')
create table if not exists public.offer_products (
  offer_id    uuid not null references public.offers (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  primary key (offer_id, product_id)
);
create index if not exists offer_products_product_idx on public.offer_products (product_id);

-- الطلبات (تدعم Guest Checkout وحساب الخصومات وعمولة المنصة 5% للتقارير)
create table if not exists public.orders (
  id                    uuid primary key default gen_random_uuid(),
  order_number          text not null unique check (order_number ~ '^OT-[0-9A-F]{8}$'),
  customer_id           uuid references public.profiles (id) on delete set null,
  store_id              uuid not null references public.stores (id) on delete restrict,
  address_id            uuid references public.addresses (id) on delete set null,
  customer_name         text not null check (char_length(customer_name) between 2 and 80),
  customer_phone        text not null check (customer_phone ~ '^01[0125][0-9]{8}$'),
  delivery_address      text not null check (char_length(delivery_address) between 5 and 300),
  delivery_lat          numeric(9, 6) check (delivery_lat is null or delivery_lat between -90 and 90),
  delivery_lng          numeric(9, 6) check (delivery_lng is null or delivery_lng between -180 and 180),
  notes                 text check (notes is null or char_length(notes) <= 500),
  status                public.order_status not null default 'pending',
  payment_method        text not null default 'cod' check (payment_method = 'cod'),
  currency              char(3) not null default 'EGP' check (currency = 'EGP'),
  coupon_code              text,
  offer_id                 uuid references public.offers (id) on delete set null,  -- العرض الرئيسي/كوبون الطلب
  original_subtotal        numeric(10, 2) not null default 0 check (original_subtotal >= 0), -- مجموع الأسعار الأصلية قبل أي خصم
  subtotal                 numeric(10, 2) not null check (subtotal >= 0),          -- مجموع أسعار البيع للأصناف (وعاء العمولة)
  original_delivery_fee    numeric(10, 2) not null default 0 check (original_delivery_fee >= 0),
  delivery_fee             numeric(10, 2) not null check (delivery_fee >= 0),      -- رسوم التوصيل بعد الخصم (0 لو free_delivery)
  free_delivery_bearer     text check (free_delivery_bearer is null or free_delivery_bearer in ('store', 'platform')), -- الطرف المتحمل للتوصيل المجاني
  discount                 numeric(10, 2) not null default 0 check (discount >= 0),-- خصم الكوبون أو خصم إضافي على الطلب
  service_fee              numeric(10, 2) not null default 0 check (service_fee >= 0), -- رسوم الخدمة المستقبلية (0 حاليًا ومفصولة عن العمولة والتوصيل)
  total                    numeric(10, 2) not null check (total >= 0),
  commission_rate_snapshot numeric(5, 2) not null default 5.00 check (commission_rate_snapshot between 0 and 100), -- نسبة عمولة المتجر المحفوظة وقت الطلب
  commission_base_amount   numeric(10, 2) not null check (commission_base_amount >= 0), -- وعاء احتساب العمولة = subtotal المنتجات
  platform_commission      numeric(10, 2) not null default 0 check (platform_commission >= 0), -- عمولة المنصة الفعلية = base * rate / 100
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (total = subtotal + delivery_fee + service_fee - discount),
  check (subtotal <= original_subtotal),
  constraint orders_commission_base_formula_chk check (commission_base_amount = greatest(subtotal - discount, 0))
);
create index if not exists orders_customer_idx on public.orders (customer_id, created_at desc);
create index if not exists orders_store_idx    on public.orders (store_id, created_at desc);
create index if not exists orders_phone_idx    on public.orders (customer_phone, created_at desc);
create index if not exists orders_status_idx   on public.orders (status);

-- ضمان ترقية قيد وعاء العمولة في orders إذا كان الجدول موجودًا مسبقًا دون المساس بقيد (>= 0)
do $$
declare v_con record;
begin
  for v_con in
    select c.conname from pg_constraint c
    where c.conrelid = 'public.orders'::regclass and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~* 'commission_base_amount\s*=\s*subtotal'
      and pg_get_constraintdef(c.oid) !~* 'discount'
  loop
    execute format('alter table public.orders drop constraint %I', v_con.conname);
  end loop;
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.orders'::regclass and conname = 'orders_commission_base_formula_chk'
  ) then
    alter table public.orders add constraint orders_commission_base_formula_chk
      check (commission_base_amount = greatest(subtotal - discount, 0));
  end if;
end $$;

-- رمز تتبع طلبات الضيف (SHA-256 فقط)
create table if not exists public.order_tracking_tokens (
  order_id    uuid primary key references public.orders (id) on delete cascade,
  token_hash  text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at  timestamptz not null default now()
);

-- سطور الطلب: توثيق دقيق للسعر الأصلي وسعر البيع وقيمة الخصم والعرض المطبق
create table if not exists public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  product_id       uuid references public.products (id) on delete set null,
  product_name     text not null,
  original_price   numeric(8, 2) not null check (original_price >= 0),
  unit_price       numeric(8, 2) not null check (unit_price >= 0),
  discount_amount  numeric(8, 2) not null default 0 check (discount_amount >= 0),
  offer_id         uuid references public.offers (id) on delete set null,
  quantity         int not null check (quantity between 1 and 50),
  line_total       numeric(10, 2) generated always as (unit_price * quantity) stored,
  check (unit_price <= original_price)
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- سجل أحداث الطلب
create table if not exists public.order_events (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders (id) on delete cascade,
  status      public.order_status not null,
  actor_id    uuid,
  created_at  timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at);

-- ---------------------------------------------------------------------
-- النظام المالي وعمولات المحلات والتحصيلات
-- ---------------------------------------------------------------------

-- 1) دفتر أستاذ حركات العمولات المالية للمحلات (Ledger)
create table if not exists public.merchant_commission_ledger (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores (id) on delete cascade,
  order_id    uuid references public.orders (id) on delete set null,
  entry_type  public.ledger_entry_type not null default 'order_commission',
  amount      numeric(10, 2) not null, -- موجب: عمولة مستحقة على المحل للمنصة / سالب: سداد أو تسوية لصالحه
  notes       text,
  created_at  timestamptz not null default now(),
  constraint merchant_commission_ledger_amount_sign_chk check (
    (entry_type = 'order_commission'     and amount > 0) or
    (entry_type = 'commission_refund'    and amount < 0) or
    (entry_type = 'statement_settlement' and amount < 0) or
    (entry_type = 'adjustment'           and amount <> 0)
  )
);

-- قيد يمنع تكرار تسجيل عمولة الطلب الواحد أو استردادها نهائيًا
drop index if exists public.commission_ledger_order_unique;
create unique index if not exists commission_ledger_order_unique
  on public.merchant_commission_ledger (order_id, entry_type)
  where order_id is not null and entry_type in ('order_commission', 'commission_refund');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.merchant_commission_ledger'::regclass and conname = 'merchant_commission_ledger_amount_sign_chk'
  ) then
    alter table public.merchant_commission_ledger add constraint merchant_commission_ledger_amount_sign_chk check (
      (entry_type = 'order_commission'     and amount > 0) or
      (entry_type = 'commission_refund'    and amount < 0) or
      (entry_type = 'statement_settlement' and amount < 0) or
      (entry_type = 'adjustment'           and amount <> 0)
    );
  end if;
end $$;

create index if not exists commission_ledger_store_idx
  on public.merchant_commission_ledger (store_id, created_at desc);

-- 2) كشوف الحسابات الشهرية للمحلات
create table if not exists public.merchant_monthly_statements (
  id                 uuid primary key default gen_random_uuid(),
  store_id           uuid not null references public.stores (id) on delete cascade,
  statement_number   text not null unique,
  year               int not null check (year between 2024 and 2100),
  month              smallint not null check (month between 1 and 12),
  orders_count       int not null default 0 check (orders_count >= 0),
  gross_sales        numeric(10, 2) not null default 0 check (gross_sales >= 0),
  total_discounts    numeric(10, 2) not null default 0 check (total_discounts >= 0),
  items_subtotal     numeric(10, 2) not null default 0 check (items_subtotal >= 0),  -- مبيعات المنتجات بعد الخصم
  delivery_fees      numeric(10, 2) not null default 0 check (delivery_fees >= 0),
  commission_total   numeric(10, 2) not null default 0 check (commission_total >= 0),-- عمولة المنصة المستحقة
  paid_amount        numeric(10, 2) not null default 0 check (paid_amount >= 0),
  remaining_balance  numeric(10, 2) generated always as (greatest(commission_total - paid_amount, 0)) stored,
  status             public.statement_status not null default 'pending',
  due_date           date not null,
  is_closed          boolean not null default false,
  closed_at          timestamptz,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (store_id, year, month),
  constraint statements_paid_not_exceeding_total_chk check (paid_amount <= commission_total)
);

create index if not exists monthly_statements_store_idx
  on public.merchant_monthly_statements (store_id, year desc, month desc);
create index if not exists monthly_statements_status_idx
  on public.merchant_monthly_statements (status);
create index if not exists monthly_statements_overdue_check_idx
  on public.merchant_monthly_statements (status, due_date)
  where status in ('pending', 'partially_paid', 'overdue');

do $$
declare v_con record;
begin
  for v_con in
    select c.conname from pg_constraint c
    where c.conrelid = 'public.merchant_monthly_statements'::regclass and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~* 'paid_amount\s*<=\s*commission_total'
      and c.conname <> 'statements_paid_not_exceeding_total_chk'
  loop
    execute format('alter table public.merchant_monthly_statements drop constraint %I', v_con.conname);
  end loop;
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.merchant_monthly_statements'::regclass and conname = 'statements_paid_not_exceeding_total_chk'
  ) then
    alter table public.merchant_monthly_statements add constraint statements_paid_not_exceeding_total_chk
      check (paid_amount <= commission_total);
  end if;
end $$;

-- 3) مدفوعات وتحصيلات المحلات المستلمة بواسطة السوبر أدمن
create table if not exists public.merchant_payments (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references public.stores (id) on delete cascade,
  statement_id      uuid references public.merchant_monthly_statements (id) on delete set null,
  amount            numeric(10, 2) not null check (amount > 0),
  payment_date      date not null default current_date,
  payment_method    public.payment_method_type not null default 'cash',
  reference_number  text,
  notes             text,
  recorded_by       uuid not null references public.profiles (id) on delete restrict,
  created_at        timestamptz not null default now()
);

create index if not exists merchant_payments_store_idx
  on public.merchant_payments (store_id, payment_date desc);
create index if not exists merchant_payments_statement_idx
  on public.merchant_payments (statement_id);

-- التقييمات والمراجعات (مرتبطة بالطلب المسلَّم - تقييم واحد لكل طلب)
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null unique references public.orders (id) on delete cascade,
  store_id    uuid not null references public.stores (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete set null,
  rating      smallint not null check (rating between 1 and 5),
  comment     text check (comment is null or char_length(comment) <= 500),
  is_visible  boolean not null default true, -- للأدمن لإخفاء المخالف دون حذفه
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists reviews_store_idx on public.reviews (store_id, created_at desc);
create index if not exists reviews_store_visible_idx on public.reviews (store_id, created_at desc) where is_visible;

-- بلاغات التقييمات المسيئة
create table if not exists public.review_reports (
  id           uuid primary key default gen_random_uuid(),
  review_id    uuid not null references public.reviews (id) on delete cascade,
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  reason       text not null check (char_length(reason) between 5 and 500),
  status       public.report_status not null default 'pending',
  admin_notes  text check (admin_notes is null or char_length(admin_notes) <= 500),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (review_id, reporter_id) -- منع تكرار بلاغ نفس المستخدم على نفس التقييم
);
create index if not exists review_reports_status_idx on public.review_reports (status);

-- الإشعارات
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  body        text,
  link        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- سجل تغييرات حالة المتجر الإداري (فتح/إغلاق الظهور واستقبال الطلبات بواسطة السوبر أدمن)
create table if not exists public.store_status_logs (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references public.stores (id) on delete cascade,
  changed_by     uuid references public.profiles (id) on delete set null,
  old_is_active  boolean,
  new_is_active  boolean not null,
  old_is_open    boolean,
  new_is_open    boolean not null,
  reason         text check (reason is null or char_length(reason) <= 300),
  created_at     timestamptz not null default now()
);
create index if not exists store_status_logs_store_idx
  on public.store_status_logs (store_id, created_at desc);

-- تنبيهات التأخر في السداد بعد 7 أيام (للسوبر أدمن فقط دون إغلاق تلقائي للمتاجر)
create table if not exists public.admin_overdue_alerts (
  id                  uuid primary key default gen_random_uuid(),
  statement_id        uuid not null unique references public.merchant_monthly_statements (id) on delete cascade,
  store_id            uuid not null references public.stores (id) on delete cascade,
  statement_number    text not null,
  due_date            date not null,
  remaining_amount    numeric(10, 2) not null check (remaining_amount >= 0),
  days_overdue        int not null check (days_overdue >= 0),
  is_resolved         boolean not null default false,
  resolved_at         timestamptz,
  admin_acknowledged  boolean not null default false,
  acknowledged_by     uuid references public.profiles (id) on delete set null,
  acknowledged_at     timestamptz,
  admin_notes         text check (admin_notes is null or char_length(admin_notes) <= 500),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists admin_overdue_alerts_active_idx
  on public.admin_overdue_alerts (is_resolved, days_overdue desc, due_date asc);
create index if not exists admin_overdue_alerts_store_idx
  on public.admin_overdue_alerts (store_id, is_resolved);


-- ---------------------------------------------------------------------
-- 3) Helper functions
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.is_merchant_of(p_store_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.stores s
    join public.profiles p on p.id = s.owner_id
    where s.id = p_store_id
      and s.owner_id = auth.uid()
      and p.role = 'merchant'
  );
$$;

create or replace function public.normalize_eg_phone(p text)
returns text
language plpgsql immutable set search_path = ''
as $$
declare d text;
begin
  if p is null then return null; end if;
  d := translate(p, '٠١٢٣٤٥٦٧٨٩', '0123456789');
  d := regexp_replace(d, '\D', '', 'g');
  if d like '0020%' then
    d := '0' || substr(d, 5);
  elsif d like '20%' and length(d) = 12 then
    d := '0' || substr(d, 3);
  elsif length(d) = 10 and d like '1%' then
    d := '0' || d;
  end if;
  if d ~ '^01[0125][0-9]{8}$' then return d; end if;
  return null;
end $$;


-- ---------------------------------------------------------------------
-- 4) Trigger functions
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- إنشاء profile تلقائيًا
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80))
  on conflict (id) do nothing;
  return new;
end $$;

-- حماية الـ profiles
create or replace function public.profiles_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.role := 'customer';
    else
      if new.id is distinct from old.id then
        raise exception 'forbidden';
      end if;
      if new.role is distinct from old.role and not public.is_admin() then
        raise exception 'forbidden_role_change';
      end if;
    end if;
  end if;
  return new;
end $$;

-- حماية المتاجر: السوبر أدمن فقط يعدل نسبة العمولة وحالة التفعيل والفتح وحقول الإيقاف والتقييمات
create or replace function public.stores_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if tg_op = 'INSERT' then
      raise exception 'forbidden';
    end if;
    if (new.owner_id, new.is_active, new.is_open, new.commission_rate, new.rating, new.reviews_count,
        new.suspension_reason, new.suspended_at, new.suspended_by,
        new.reactivated_at, new.reactivated_by)
       is distinct from
       (old.owner_id, old.is_active, old.is_open, old.commission_rate, old.rating, old.reviews_count,
        old.suspension_reason, old.suspended_at, old.suspended_by,
        old.reactivated_at, old.reactivated_by) then
      raise exception 'forbidden_store_field';
    end if;
  end if;
  return new;
end $$;

-- توثيق كل تغيير في حالة المتجر (is_active / is_open) تلقائيًا في store_status_logs
create or replace function public.log_store_status_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.store_status_logs (
      store_id, changed_by, old_is_active, new_is_active, old_is_open, new_is_open, reason
    ) values (
      new.id, auth.uid(), null, new.is_active, null, new.is_open, 'إنشاء المتجر'
    );
  elsif tg_op = 'UPDATE' and (new.is_active is distinct from old.is_active or new.is_open is distinct from old.is_open) then
    insert into public.store_status_logs (
      store_id, changed_by, old_is_active, new_is_active, old_is_open, new_is_open, reason
    ) values (
      new.id,
      coalesce(auth.uid(), new.suspended_by, new.reactivated_by),
      old.is_active,
      new.is_active,
      old.is_open,
      new.is_open,
      coalesce(
        new.suspension_reason,
        case
          when new.is_active and not old.is_active then 'إعادة تفعيل المتجر بواسطة السوبر أدمن'
          when new.is_open is distinct from old.is_open then 'تغيير حالة استقبال الطلبات بواسطة السوبر أدمن'
          else 'تحديث حالة المتجر بواسطة السوبر أدمن'
        end
      )
    );
  end if;
  return null;
end $$;

-- حماية العروض والتحقق من التاجر
create or replace function public.offers_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    -- التاجر لا ينشئ إلا لمتجره
    if new.store_id is null or not public.is_merchant_of(new.store_id) then
      raise exception 'forbidden_store_offer';
    end if;
    -- الحفاظ على عداد الاستخدام دون تلاعب
    if tg_op = 'INSERT' then
      new.used_count := 0;
    else
      new.used_count := old.used_count;
    end if;
  end if;
  return new;
end $$;

-- حماية التقييمات: العميل يعدل التقييم والتعليق فقط، ولا يغير الطلب أو المحل أو الظهور
create or replace function public.reviews_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.is_visible := true;
    elsif tg_op = 'UPDATE' then
      if (new.id, new.order_id, new.store_id, new.user_id, new.is_visible)
         is distinct from (old.id, old.order_id, old.store_id, old.user_id, old.is_visible) then
        raise exception 'forbidden_review_edit';
      end if;
    end if;
  end if;
  return new;
end $$;

-- حماية بلاغات التقييمات: غير الأدمن لا يعدل حالة البلاغ أو ملاحظات الأدمن
create or replace function public.review_reports_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.admin_notes := null;
    elsif tg_op = 'UPDATE' then
      raise exception 'forbidden_report_edit';
    end if;
  end if;
  return new;
end $$;

-- حماية الطلبات
create or replace function public.orders_guard()
returns trigger language plpgsql set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_staff boolean;
  v_ok    boolean := false;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if v_uid is null then
    raise exception 'forbidden';
  end if;

  if (new.id, new.order_number, new.customer_id, new.store_id, new.address_id,
      new.customer_name, new.customer_phone, new.delivery_address,
      new.delivery_lat, new.delivery_lng, new.notes, new.payment_method,
      new.currency, new.coupon_code, new.offer_id, new.original_subtotal, new.subtotal,
      new.original_delivery_fee, new.delivery_fee, new.free_delivery_bearer,
      new.discount, new.service_fee, new.total,
      new.commission_rate_snapshot, new.commission_base_amount, new.platform_commission,
      new.created_at)
     is distinct from
     (old.id, old.order_number, old.customer_id, old.store_id, old.address_id,
      old.customer_name, old.customer_phone, old.delivery_address,
      old.delivery_lat, old.delivery_lng, old.notes, old.payment_method,
      old.currency, old.coupon_code, old.offer_id, old.original_subtotal, old.subtotal,
      old.original_delivery_fee, old.delivery_fee, old.free_delivery_bearer,
      old.discount, old.service_fee, old.total,
      old.commission_rate_snapshot, old.commission_base_amount, old.platform_commission,
      old.created_at) then
    raise exception 'immutable_order_field';
  end if;

  -- حظر تعديل حالة الدفع أو المرجع أو تاريخ السداد إلا للأدمن أو التاجر المعتمد
  if (new.payment_status, new.payment_reference, new.paid_at)
     is distinct from
     (old.payment_status, old.payment_reference, old.paid_at) then
    v_staff := public.is_admin() or public.is_merchant_of(old.store_id);
    if not v_staff then
      raise exception 'forbidden_payment_status_update';
    end if;
  end if;

  if new.status is distinct from old.status then
    v_staff := public.is_admin() or public.is_merchant_of(old.store_id);

    if v_staff then
      v_ok := (old.status::text, new.status::text) in (
        ('pending',    'accepted'),
        ('pending',    'cancelled'),
        ('accepted',   'preparing'),
        ('accepted',   'cancelled'),
        ('preparing',  'on_the_way'),
        ('preparing',  'cancelled'),
        ('on_the_way', 'delivered')
      );
    elsif old.customer_id = v_uid then
      v_ok := (old.status = 'pending' and new.status = 'cancelled');
    end if;

    if not v_ok then
      raise exception 'invalid_status_transition';
    end if;
  end if;

  return new;
end $$;

-- أحداث الطلب وتوثيق العمولة في الـ Ledger وإشعار المستخدم
create or replace function public.orders_after_status()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_title    text;
  v_offer_id uuid;
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_events (order_id, status, actor_id)
    values (new.id, new.status, auth.uid());
  end if;

  -- استرجاع عداد الكوبون/العروض عند الإلغاء بترتيب id ثابت لمنع Deadlock
  if tg_op = 'UPDATE' and new.status = 'cancelled' and old.status <> 'cancelled' then
    for v_offer_id in
      select distinct u.oid
      from (
        select new.offer_id as oid
        where new.offer_id is not null
        union
        select oi.offer_id as oid
        from public.order_items oi
        where oi.order_id = new.id
          and oi.offer_id is not null
      ) u
      order by u.oid
    loop
      update public.offers
         set used_count = greatest(used_count - 1, 0)
       where id = v_offer_id;
    end loop;
  end if;

  -- توثيق عمولة المنصة المستحقة على المنتجات فقط في دفتر الأستاذ (Ledger) عند التسليم
  if tg_op = 'UPDATE' and new.status = 'delivered' and old.status <> 'delivered' then
    if new.platform_commission > 0 then
      insert into public.merchant_commission_ledger (
        store_id, order_id, entry_type, amount, notes
      ) values (
        new.store_id, new.id, 'order_commission', new.platform_commission,
        'عمولة الطلب ' || new.order_number || ' بنسبة ' || new.commission_rate_snapshot || '% (وعاء العمولة بعد الخصم: ' || new.commission_base_amount || ' ج.م)'
      )
      on conflict (order_id, entry_type)
      where order_id is not null and entry_type in ('order_commission', 'commission_refund')
      do nothing;
    end if;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status
     and new.customer_id is not null then
    v_title := case new.status::text
      when 'accepted'   then 'تم قبول طلبك'
      when 'preparing'  then 'جاري تحضير طلبك'
      when 'on_the_way' then 'طلبك في الطريق إليك'
      when 'delivered'  then 'تم توصيل طلبك'
      when 'cancelled'  then 'تم إلغاء طلبك'
      else null end;
    if v_title is not null then
      insert into public.notifications (user_id, title, body, link)
      values (new.customer_id, v_title, 'رقم الطلب ' || new.order_number,
              '/orders/' || new.order_number);
    end if;
  end if;
  return null;
end $$;

-- تحديث متوسط تقييم وعدد تقييمات المتجر تلقائيًا (عند الإضافة أو التعديل أو الحذف أو الإخفاء)
create or replace function public.reviews_after_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_store_id uuid;
begin
  v_store_id := coalesce(new.store_id, old.store_id);

  update public.stores s
     set rating = coalesce((
           select round(avg(r.rating)::numeric, 1)
           from public.reviews r
           where r.store_id = v_store_id
             and r.is_visible = true
         ), 0),
         reviews_count = coalesce((
           select count(*)
           from public.reviews r
           where r.store_id = v_store_id
             and r.is_visible = true
         ), 0)
   where s.id = v_store_id;

  return null;
end $$;


-- ---------------------------------------------------------------------
-- 5) Triggers
-- ---------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_guard_trg on public.profiles;
create trigger profiles_guard_trg
  before insert or update on public.profiles
  for each row execute function public.profiles_guard();

drop trigger if exists stores_guard_trg on public.stores;
create trigger stores_guard_trg
  before insert or update on public.stores
  for each row execute function public.stores_guard();

drop trigger if exists offers_guard_trg on public.offers;
create trigger offers_guard_trg
  before insert or update on public.offers
  for each row execute function public.offers_guard();

drop trigger if exists reviews_guard_trg on public.reviews;
create trigger reviews_guard_trg
  before insert or update on public.reviews
  for each row execute function public.reviews_guard();

drop trigger if exists review_reports_guard_trg on public.review_reports;
create trigger review_reports_guard_trg
  before insert or update on public.review_reports
  for each row execute function public.review_reports_guard();

drop trigger if exists orders_guard_trg on public.orders;
create trigger orders_guard_trg
  before update on public.orders
  for each row execute function public.orders_guard();

drop trigger if exists orders_after_status_trg on public.orders;
create trigger orders_after_status_trg
  after insert or update of status on public.orders
  for each row execute function public.orders_after_status();

drop trigger if exists reviews_after_change_trg on public.reviews;
create trigger reviews_after_change_trg
  after insert or update of rating, is_visible or delete on public.reviews
  for each row execute function public.reviews_after_change();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists stores_updated_at on public.stores;
create trigger stores_updated_at before update on public.stores
  for each row execute function public.set_updated_at();
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
drop trigger if exists offers_updated_at on public.offers;
create trigger offers_updated_at before update on public.offers
  for each row execute function public.set_updated_at();
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
drop trigger if exists reviews_updated_at on public.reviews;
create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();
drop trigger if exists review_reports_updated_at on public.review_reports;
create trigger review_reports_updated_at before update on public.review_reports
  for each row execute function public.set_updated_at();
drop trigger if exists admin_overdue_alerts_updated_at on public.admin_overdue_alerts;
create trigger admin_overdue_alerts_updated_at before update on public.admin_overdue_alerts
  for each row execute function public.set_updated_at();
drop trigger if exists stores_status_audit_trg on public.stores;
create trigger stores_status_audit_trg
  after insert or update of is_active, is_open on public.stores
  for each row execute function public.log_store_status_change();

insert into public.profiles (id)
select u.id from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);


-- ---------------------------------------------------------------------
-- 6) RPC: إنشاء الطلب مع احتساب العروض وحسم التضارب للأكثر توفيرًا
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  p_store_id         uuid,
  p_items            jsonb,      -- [{"product_id": "...", "quantity": 2}, ...]
  p_customer_name    text,
  p_customer_phone   text,
  p_delivery_address text,
  p_address_id       uuid    default null,
  p_notes            text    default null,
  p_coupon_code      text    default null,
  p_delivery_lat     numeric default null,
  p_delivery_lng     numeric default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid                   uuid := auth.uid();
  v_store                 public.stores%rowtype;
  v_coupon                public.offers%rowtype;
  v_name                  text := btrim(coalesce(p_customer_name, ''));
  v_phone                 text := public.normalize_eg_phone(p_customer_phone);
  v_addr                  text := btrim(coalesce(p_delivery_address, ''));
  v_notes                 text := nullif(btrim(coalesce(p_notes, '')), '');
  v_code                  text := nullif(upper(btrim(coalesce(p_coupon_code, ''))), '');
  v_item_elem             jsonb;
  v_pid                   uuid;
  v_qty                   int;
  v_prod                  public.products%rowtype;
  v_best_offer_id         uuid;
  v_unit_price            numeric(8, 2);
  v_item_discount         numeric(8, 2);
  v_raw_subtotal          numeric(10, 2) := 0;
  v_orig_subtotal         numeric(10, 2) := 0;
  v_subtotal              numeric(10, 2) := 0;
  v_cart_discount         numeric(10, 2) := 0;
  v_orig_delivery_fee     numeric(10, 2);
  v_final_delivery_fee    numeric(10, 2);
  v_total                 numeric(10, 2);
  v_commission            numeric(10, 2);
  v_store_commission_rate numeric(5, 2);
  v_commission_base       numeric(10, 2);
  v_service_fee           numeric(10, 2) := 0;
  v_service_fee_active    boolean;
  v_service_fee_amount    numeric(8, 2);
  v_address_id            uuid := null;
  v_order_id              uuid;
  v_number                text;
  v_token                 text := null;
  v_attempt               int := 0;
  v_free_delivery_active  boolean := false;
  v_free_delivery_offer   uuid := null;
  v_free_delivery_bearer  text := null;
  v_lock_offer_id         uuid;
begin
  -- 1) التحقق من صحة المدخلات
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'invalid_name';
  end if;
  if v_phone is null then
    raise exception 'invalid_phone';
  end if;
  if char_length(v_addr) < 5 or char_length(v_addr) > 300 then
    raise exception 'invalid_address';
  end if;
  if v_notes is not null and char_length(v_notes) > 500 then
    raise exception 'invalid_notes';
  end if;
  if (p_delivery_lat is not null and p_delivery_lat not between -90 and 90)
     or (p_delivery_lng is not null and p_delivery_lng not between -180 and 180) then
    raise exception 'invalid_location';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'invalid_items';
  end if;

  -- 2) قفل المتجر وفحص حالته (الترتيب: stores أولًا)
  select * into v_store from public.stores where id = p_store_id for share;
  if not found then raise exception 'store_unavailable'; end if;
  if not v_store.is_active then raise exception 'store_suspended'; end if;
  if not v_store.is_open then raise exception 'store_closed'; end if;

  -- 3) حماية من الإغراق: 5 طلبات كحد أقصى لكل هاتف كل 10 دقائق
  if (select count(*) from public.orders o
       where (o.customer_phone = v_phone or (v_uid is not null and o.customer_id = v_uid))
         and o.created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'rate_limited';
  end if;

  -- 4) قفل العروض النشطة المرشحة لهذا المتجر بترتيب id ثابت قبل الاختيار
  for v_lock_offer_id in
    select o.id
    from public.offers o
    where o.status = 'active'
      and (o.store_id is null or o.store_id = p_store_id)
      and (o.starts_at is null or o.starts_at <= now())
      and (o.ends_at   is null or o.ends_at   >  now())
    order by o.id
    for update
  loop
    null;
  end loop;

  v_orig_delivery_fee  := v_store.delivery_fee;
  v_final_delivery_fee := v_store.delivery_fee;

  -- 5) التحقق من صحة الأصناف وحساب إجمالي السلة بالأسعار الأصلية بأمان
  create temporary table temp_order_items (
    product_id       uuid,
    product_name     text,
    original_price   numeric(8, 2),
    unit_price       numeric(8, 2),
    discount_amount  numeric(8, 2),
    offer_id         uuid,
    quantity         int
  ) on commit drop;

  for v_item_elem in select * from jsonb_array_elements(p_items) loop
    v_pid := (v_item_elem ->> 'product_id')::uuid;
    v_qty := (v_item_elem ->> 'quantity')::int;

    if v_pid is null or v_qty is null or v_qty not between 1 and 50 then
      raise exception 'invalid_quantity';
    end if;

    select * into v_prod from public.products
    where id = v_pid and store_id = p_store_id and is_available;
    if not found then raise exception 'product_unavailable'; end if;

    v_raw_subtotal := v_raw_subtotal + (v_prod.price * v_qty);
  end loop;

  -- 6) حساب أفضل عرض تلقائي متاح لكل صنف (إذا نفدت كميته يتم استبعاده تلقائيًا دون إلغاء الطلب)
  for v_item_elem in select * from jsonb_array_elements(p_items) loop
    v_pid := (v_item_elem ->> 'product_id')::uuid;
    v_qty := (v_item_elem ->> 'quantity')::int;

    select * into v_prod from public.products
    where id = v_pid and store_id = p_store_id and is_available;

    select
      sub.cand_offer_id,
      sub.cand_final_price,
      sub.cand_saving
    into
      v_best_offer_id,
      v_unit_price,
      v_item_discount
    from (
      select
        o.id as cand_offer_id,
        case
          when o.discount_type = 'percentage'
            then greatest(v_prod.price - round(v_prod.price * o.discount_value / 100, 2), 0)
          when o.discount_type = 'fixed_price'
            then least(v_prod.price, o.discount_value)
          when o.discount_type = 'fixed_amount'
            then greatest(v_prod.price - o.discount_value, 0)
          else v_prod.price
        end as cand_final_price,
        case
          when o.discount_type = 'percentage'
            then round(v_prod.price * o.discount_value / 100, 2)
          when o.discount_type = 'fixed_price'
            then greatest(v_prod.price - o.discount_value, 0)
          when o.discount_type = 'fixed_amount'
            then least(o.discount_value, v_prod.price)
          else 0
        end as cand_saving,
        o.priority,
        o.created_at
      from public.offers o
      where o.status = 'active'
        and o.code is null
        and (o.store_id is null or o.store_id = p_store_id)
        and (o.starts_at is null or o.starts_at <= now())
        and (o.ends_at   is null or o.ends_at   >  now())
        and (o.usage_limit is null or o.used_count < o.usage_limit)
        and (o.min_order = 0 or v_raw_subtotal >= o.min_order)
        and o.discount_type in ('percentage', 'fixed_price', 'fixed_amount')
        and exists (
          select 1 from public.offer_products op
          where op.offer_id = o.id and op.product_id = v_prod.id
        )
      order by
        cand_saving desc,
        o.priority desc,
        o.created_at desc
      limit 1
    ) sub;

    if v_best_offer_id is null or v_item_discount <= 0 then
      v_unit_price    := v_prod.price;
      v_item_discount := 0;
      v_best_offer_id := null;
    end if;

    v_orig_subtotal := v_orig_subtotal + (v_prod.price * v_qty);
    v_subtotal      := v_subtotal + (v_unit_price * v_qty);

    insert into temp_order_items (
      product_id, product_name, original_price, unit_price,
      discount_amount, offer_id, quantity
    ) values (
      v_prod.id, v_prod.name, v_prod.price, v_unit_price,
      v_item_discount, v_best_offer_id, v_qty
    );
  end loop;

  -- 7) فحص الحد الأدنى للطلب باستخدام v_subtotal
  if v_subtotal < v_store.min_order then
    raise exception 'below_min_order';
  end if;

  -- 8) فحص عروض التوصيل المجاني التلقائية المتاحة للمتجر (بدون كود يدوي)
  select o.id, coalesce(o.delivery_cost_bearer, 'store')
  into v_free_delivery_offer, v_free_delivery_bearer
  from public.offers o
  where o.status = 'active'
    and o.code is null
    and (o.store_id is null or o.store_id = p_store_id)
    and o.discount_type = 'free_delivery'
    and (o.starts_at is null or o.starts_at <= now())
    and (o.ends_at   is null or o.ends_at   >  now())
    and (o.usage_limit is null or o.used_count < o.usage_limit)
    and v_subtotal >= o.min_order
  order by o.priority desc, o.created_at desc
  limit 1;

  if v_free_delivery_offer is not null then
    v_final_delivery_fee   := 0;
    v_free_delivery_active := true;
  end if;

  -- 9) حساب الخصم على توتال الطلب (كوبون يدوي أو عرض تلقائي مع الالتزام بسقف الخصم max_discount)
  if v_code is not null then
    select * into v_coupon
    from public.offers o
    where upper(o.code) = v_code
      and o.status = 'active'
      and (o.store_id is null or o.store_id = p_store_id)
      and (o.starts_at is null or o.starts_at <= now())
      and (o.ends_at   is null or o.ends_at   >  now())
    for update;
    if not found then raise exception 'invalid_coupon'; end if;
    if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
      raise exception 'coupon_exhausted';
    end if;
    if v_subtotal < v_coupon.min_order then
      raise exception 'coupon_min_order';
    end if;

    if v_coupon.discount_type = 'percentage' then
      v_cart_discount := round(v_subtotal * v_coupon.discount_value / 100, 2);
      if v_coupon.max_discount is not null and v_coupon.max_discount > 0 then
        v_cart_discount := least(v_cart_discount, v_coupon.max_discount);
      end if;
    elsif v_coupon.discount_type = 'fixed_amount' then
      v_cart_discount := v_coupon.discount_value;
      if v_coupon.max_discount is not null and v_coupon.max_discount > 0 then
        v_cart_discount := least(v_cart_discount, v_coupon.max_discount);
      end if;
    elsif v_coupon.discount_type = 'free_delivery' and not v_free_delivery_active then
      v_final_delivery_fee   := 0;
      v_free_delivery_bearer := coalesce(v_coupon.delivery_cost_bearer, 'store');
    end if;
    v_cart_discount := least(v_cart_discount, v_subtotal);
  else
    -- فحص العرض التلقائي المطبق على توتال السلة (بدون كود يدوي)
    select * into v_coupon
    from public.offers o
    where o.code is null
      and o.status = 'active'
      and (o.store_id is null or o.store_id = p_store_id)
      and (o.applies_to = 'all' or o.applies_to is null)
      and o.discount_type in ('percentage', 'fixed_amount')
      and (o.starts_at is null or o.starts_at <= now())
      and (o.ends_at   is null or o.ends_at   >  now())
      and (o.usage_limit is null or o.used_count < o.usage_limit)
      and (o.min_order = 0 or v_subtotal >= o.min_order)
    order by o.priority desc, o.created_at desc
    limit 1
    for update;

    if v_coupon.id is not null then
      if v_coupon.discount_type = 'percentage' then
        v_cart_discount := round(v_subtotal * v_coupon.discount_value / 100, 2);
        if v_coupon.max_discount is not null and v_coupon.max_discount > 0 then
          v_cart_discount := least(v_cart_discount, v_coupon.max_discount);
        end if;
      elsif v_coupon.discount_type = 'fixed_amount' then
        v_cart_discount := v_coupon.discount_value;
        if v_coupon.max_discount is not null and v_coupon.max_discount > 0 then
          v_cart_discount := least(v_cart_discount, v_coupon.max_discount);
        end if;
      end if;
      v_cart_discount := least(v_cart_discount, v_subtotal);
    end if;
  end if;

  -- 10) فحص رسوم الخدمة من إعدادات المنصة
  select service_fee_active, service_fee_amount
  into v_service_fee_active, v_service_fee_amount
  from public.platform_settings
  where id = 1;

  if coalesce(v_service_fee_active, false) then
    v_service_fee := coalesce(v_service_fee_amount, 0);
  else
    v_service_fee := 0;
  end if;

  v_total := v_subtotal + v_final_delivery_fee + v_service_fee - v_cart_discount;

  -- 11) حساب عمولة المنصة على صافي المنتجات بعد خصم الكوبون (subtotal - discount)
  -- رسوم التوصيل خارج أساس احتساب العمولة تمامًا
  v_store_commission_rate := coalesce(v_store.commission_rate, 5.00);
  v_commission_base       := greatest(v_subtotal - v_cart_discount, 0);
  v_commission            := round(v_commission_base * v_store_commission_rate / 100, 2);

  -- 12) العنوان المحفوظ للمسجل
  if v_uid is not null and p_address_id is not null then
    select a.id into v_address_id
    from public.addresses a where a.id = p_address_id and a.user_id = v_uid;
    if not found then raise exception 'invalid_address_id'; end if;
  end if;

  -- 13) إنشاء الطلب برقم فريد
  loop
    v_attempt := v_attempt + 1;
    v_number := 'OT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.orders (
        order_number, customer_id, store_id, address_id,
        customer_name, customer_phone, delivery_address, delivery_lat, delivery_lng,
        notes, coupon_code, offer_id, original_subtotal, subtotal, original_delivery_fee,
        delivery_fee, free_delivery_bearer, discount, service_fee, total,
        commission_rate_snapshot, commission_base_amount, platform_commission
      ) values (
        v_number, v_uid, p_store_id, v_address_id,
        v_name, v_phone, v_addr, p_delivery_lat, p_delivery_lng,
        v_notes, case when v_code is not null then v_code end,
        coalesce(v_coupon.id, v_free_delivery_offer),
        v_orig_subtotal, v_subtotal, v_orig_delivery_fee,
        v_final_delivery_fee, v_free_delivery_bearer, v_cart_discount, v_service_fee, v_total,
        v_store_commission_rate, v_commission_base, v_commission
      ) returning id into v_order_id;
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then raise exception 'order_number_failed'; end if;
    end;
  end loop;

  insert into public.order_items (
    order_id, product_id, product_name, original_price,
    unit_price, discount_amount, offer_id, quantity
  )
  select
    v_order_id, product_id, product_name, original_price,
    unit_price, discount_amount, offer_id, quantity
  from temp_order_items;

  -- 14) تحديث عداد الاستخدام للعروض المطبقة بترتيب id ثابت
  for v_lock_offer_id in
    select distinct u.oid
    from (
      select v_free_delivery_offer as oid where v_free_delivery_offer is not null
      union
      select v_coupon.id as oid where v_coupon.id is not null
      union
      select oi.offer_id as oid from temp_order_items oi where oi.offer_id is not null
    ) u
    order by u.oid
  loop
    update public.offers
       set used_count = used_count + 1
     where id = v_lock_offer_id;
  end loop;

  -- 15) رمز تتبع للضيف فقط (SHA-256)
  if v_uid is null then
    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    insert into public.order_tracking_tokens (order_id, token_hash)
    values (v_order_id, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'));
  end if;

  -- 16) إشعار التاجر
  if v_store.owner_id is not null then
    insert into public.notifications (user_id, title, body, link)
    values (v_store.owner_id, 'طلب جديد', 'رقم الطلب ' || v_number, '/merchant/orders/' || v_number);
  end if;

  return jsonb_build_object(
    'order_id',          v_order_id,
    'order_number',      v_number,
    'original_subtotal', v_orig_subtotal,
    'subtotal',          v_subtotal,
    'delivery_fee',      v_final_delivery_fee,
    'discount',          v_cart_discount,
    'service_fee',       v_service_fee,
    'total',             v_total,
    'currency',          'EGP',
    'tracking_token',    v_token
  );
end $$;


-- ---------------------------------------------------------------------
-- 7) RPC: تتبع طلب الضيف (رقم الطلب + رقم الموبايل + رمز التتبع)
-- ---------------------------------------------------------------------
create or replace function public.track_order(p_order_number text, p_phone text, p_token text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_number   text := upper(btrim(coalesce(p_order_number, '')));
  v_phone    text := public.normalize_eg_phone(p_phone);
  v_token    text := lower(btrim(coalesce(p_token, '')));
  v_hash     text;
  v_order_id uuid;
begin
  if v_number !~ '^OT-[0-9A-F]{8}$' or v_phone is null or v_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  v_hash := encode(sha256(convert_to(v_token, 'UTF8')), 'hex');

  select o.id into v_order_id
  from public.orders o
  join public.order_tracking_tokens t on t.order_id = o.id
  where o.order_number = v_number
    and o.customer_phone = v_phone
    and t.token_hash = v_hash;
  if not found then return null; end if;

  return (
    select jsonb_build_object(
      'order_number',          o.order_number,
      'status',                o.status,
      'created_at',            o.created_at,
      'updated_at',            o.updated_at,
      'store',                 jsonb_build_object('name', s.name, 'slug', s.slug),
      'customer_name',         o.customer_name,
      'delivery_address',      o.delivery_address,
      'notes',                 o.notes,
      'payment_method',        o.payment_method,
      'currency',              o.currency,
      'original_subtotal',     o.original_subtotal,
      'subtotal',              o.subtotal,
      'original_delivery_fee', o.original_delivery_fee,
      'delivery_fee',          o.delivery_fee,
      'free_delivery_bearer',  o.free_delivery_bearer,
      'discount',              o.discount,
      'service_fee',           o.service_fee,
      'total',                 o.total,
      'items', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'name', i.product_name, 'original_price', i.original_price,
                 'unit_price', i.unit_price, 'discount_amount', i.discount_amount,
                 'quantity', i.quantity, 'line_total', i.line_total
               ) order by i.product_name), '[]'::jsonb)
        from public.order_items i where i.order_id = o.id),
      'events', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'status', e.status, 'at', e.created_at
               ) order by e.created_at, e.id), '[]'::jsonb)
        from public.order_events e where e.order_id = o.id)
    )
    from public.orders o
    join public.stores s on s.id = o.store_id
    where o.id = v_order_id
  );
end $$;


-- ---------------------------------------------------------------------
-- 8) RPC: ربط طلب الضيف بحساب المستخدم بعد التسجيل (لإثبات الملكية والتقييم)
-- ---------------------------------------------------------------------
create or replace function public.link_guest_order(
  p_order_number text,
  p_phone        text,
  p_token        text
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_number   text := upper(btrim(coalesce(p_order_number, '')));
  v_phone    text := public.normalize_eg_phone(p_phone);
  v_token    text := lower(btrim(coalesce(p_token, '')));
  v_hash     text;
  v_order_id uuid;
begin
  if v_uid is null or v_number !~ '^OT-[0-9A-F]{8}$' or v_phone is null or v_token !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  v_hash := encode(sha256(convert_to(v_token, 'UTF8')), 'hex');

  -- التأكد من صحة رقم الطلب ورقم الهاتف ومطابقة رمز التتبع SHA-256 وأنه غير مربوط بحساب آخر
  select o.id into v_order_id
  from public.orders o
  join public.order_tracking_tokens t on t.order_id = o.id
  where o.order_number = v_number
    and o.customer_phone = v_phone
    and t.token_hash = v_hash
    and o.customer_id is null;

  if not found then
    return false;
  end if;

  -- ربط الطلب بحساب المستخدم الحالي
  update public.orders
     set customer_id = v_uid,
         updated_at = now()
   where id = v_order_id;

  -- تحديث هاتف الملف الشخصي إذا لم يكن مسجلًا مسبقًا
  update public.profiles
     set phone = coalesce(phone, v_phone)
   where id = v_uid and phone is null;

  return true;
end $$;


-- ---------------------------------------------------------------------
-- 8.1) View: تقارير مبيعات المحلات اليومية الفعلية
-- ---------------------------------------------------------------------
drop view if exists public.merchant_sales_reports;
create view public.merchant_sales_reports
with (security_invoker = true)
as
select
  o.store_id,
  s.name as store_name,
  date_trunc('day', o.created_at at time zone 'Africa/Cairo') as sale_date,
  count(o.id) as total_orders,
  count(case when o.status = 'delivered' then 1 end) as delivered_orders,
  count(case when o.status = 'cancelled' then 1 end) as cancelled_orders,
  coalesce(sum(case when o.status = 'delivered' then o.original_subtotal end), 0) as gross_items_sales,
  coalesce(sum(case when o.status = 'delivered' then (o.original_subtotal - o.subtotal) end), 0) as items_discounts,
  coalesce(sum(case when o.status = 'delivered' then o.discount end), 0) as cart_discounts,
  coalesce(sum(case when o.status = 'delivered' then (o.original_subtotal - o.subtotal + o.discount) end), 0) as total_discounts,
  coalesce(sum(case when o.status = 'delivered' then greatest(o.subtotal - o.discount, 0) end), 0) as net_items_sales,
  coalesce(sum(case when o.status = 'delivered' then o.delivery_fee end), 0) as delivery_fees,
  coalesce(sum(case when o.status = 'delivered' then o.platform_commission end), 0) as platform_commission,
  coalesce(sum(case when o.status = 'delivered' then (greatest(o.subtotal - o.discount, 0) - o.platform_commission) end), 0) as net_merchant_earnings
from public.orders o
join public.stores s on s.id = o.store_id
where public.is_admin() or public.is_merchant_of(o.store_id)
group by o.store_id, s.name, date_trunc('day', o.created_at at time zone 'Africa/Cairo');

-- ---------------------------------------------------------------------
-- 8.2) View: لوحة المتابعة والملخص المالي للمحل (Financial Dashboard)
-- ---------------------------------------------------------------------
drop view if exists public.merchant_financial_summary;
create view public.merchant_financial_summary
with (security_invoker = true)
as
select
  s.id as store_id,
  s.name as store_name,
  s.commission_rate,
  s.is_active as store_is_active,
  s.is_open as store_is_open,
  s.suspension_reason,
  coalesce(stats.total_orders, 0) as total_orders,
  coalesce(stats.delivered_orders, 0) as delivered_orders,
  coalesce(stats.cancelled_orders, 0) as cancelled_orders,
  coalesce(stats.gross_items_sales, 0) as gross_items_sales,
  coalesce(stats.total_discounts, 0) as total_discounts,
  coalesce(stats.net_items_sales, 0) as net_items_sales,
  coalesce(stats.total_delivery_fees, 0) as total_delivery_fees,
  coalesce(ledger.net_platform_commission, 0) as total_platform_commission,
  coalesce(payments.total_paid, 0) as total_paid,
  coalesce(ledger.current_debt, 0) as current_debt,
  coalesce((stats.net_items_sales - ledger.net_platform_commission), 0) as net_merchant_receivables
from public.stores s
left join lateral (
  select
    count(o.id) as total_orders,
    count(case when o.status = 'delivered' then 1 end) as delivered_orders,
    count(case when o.status = 'cancelled' then 1 end) as cancelled_orders,
    sum(case when o.status = 'delivered' then o.original_subtotal else 0 end) as gross_items_sales,
    sum(case when o.status = 'delivered' then (o.original_subtotal - o.subtotal + o.discount) else 0 end) as total_discounts,
    sum(case when o.status = 'delivered' then greatest(o.subtotal - o.discount, 0) else 0 end) as net_items_sales,
    sum(case when o.status = 'delivered' then o.delivery_fee else 0 end) as total_delivery_fees
  from public.orders o
  where o.store_id = s.id
) stats on true
left join lateral (
  select coalesce(sum(p.amount), 0) as total_paid
  from public.merchant_payments p
  where p.store_id = s.id
) payments on true
left join lateral (
  select
    coalesce(sum(case when l.entry_type in ('order_commission', 'commission_refund', 'adjustment') then l.amount else 0 end), 0) as net_platform_commission,
    coalesce(sum(l.amount), 0) as current_debt
  from public.merchant_commission_ledger l
  where l.store_id = s.id
) ledger on true
where public.is_admin() or public.is_merchant_of(s.id);

-- ---------------------------------------------------------------------
-- 8.2.1) View: تنبيهات الفواتير المتأخرة لأكثر من 7 أيام (للسوبر أدمن فقط)
-- ---------------------------------------------------------------------
drop view if exists public.admin_overdue_alerts_view;
create view public.admin_overdue_alerts_view
with (security_invoker = true)
as
select
  a.id as alert_id,
  a.statement_id,
  a.statement_number,
  a.store_id,
  s.name as store_name,
  s.is_active as store_is_active,
  s.is_open as store_is_open,
  p.full_name as merchant_name,
  p.phone as merchant_phone,
  a.due_date,
  a.remaining_amount,
  a.days_overdue,
  a.is_resolved,
  a.resolved_at,
  a.admin_acknowledged,
  a.acknowledged_by,
  a.acknowledged_at,
  a.admin_notes,
  a.created_at,
  a.updated_at
from public.admin_overdue_alerts a
join public.stores s on s.id = a.store_id
left join public.profiles p on p.id = s.owner_id
where public.is_admin();

-- ---------------------------------------------------------------------
-- 8.3) RPC: تسجيل دفعة تحصيل من المحل (للسوبر أدمن فقط)
-- ---------------------------------------------------------------------
create or replace function public.record_merchant_payment(
  p_store_id         uuid,
  p_amount           numeric,
  p_payment_method   public.payment_method_type,
  p_reference_number text default null,
  p_statement_id     uuid default null,
  p_notes            text default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid           uuid := auth.uid();
  v_payment_id    uuid;
  v_stmt          public.merchant_monthly_statements%rowtype;
  v_applied_id    uuid := p_statement_id;
  v_ledger_debt   numeric(10, 2);
  v_stmt_rem      numeric(10, 2);
  v_cairo_today   date := (now() at time zone 'Africa/Cairo')::date;
begin
  if not public.is_admin() then
    raise exception 'forbidden_admin_only';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  -- 1) قفل المتجر أولًا (stores → merchant_monthly_statements)
  perform 1 from public.stores where id = p_store_id for update;
  if not found then
    raise exception 'store_not_found';
  end if;

  select coalesce(sum(amount), 0)
  into v_ledger_debt
  from public.merchant_commission_ledger
  where store_id = p_store_id;

  -- 2) قفل الكشف المستهدف ثانيًا
  if v_applied_id is null then
    select id into v_applied_id
    from public.merchant_monthly_statements
    where store_id = p_store_id
      and status in ('pending', 'partially_paid', 'overdue')
      and (commission_total - paid_amount) > 0
    order by year asc, month asc
    limit 1
    for update;
  end if;

  if v_applied_id is not null then
    select * into v_stmt
    from public.merchant_monthly_statements
    where id = v_applied_id and store_id = p_store_id
    for update;

    if not found then
      raise exception 'statement_not_found';
    end if;

    v_stmt_rem := greatest(v_stmt.commission_total - v_stmt.paid_amount, 0);
    if p_amount > v_stmt_rem or (v_ledger_debt > 0 and p_amount > greatest(v_ledger_debt, v_stmt_rem)) then
      raise exception 'payment_exceeds_debt';
    end if;
  else
    if p_amount > greatest(v_ledger_debt, 0) then
      raise exception 'payment_exceeds_debt';
    end if;
  end if;

  insert into public.merchant_payments (
    store_id, statement_id, amount, payment_method, reference_number, notes, recorded_by
  ) values (
    p_store_id, v_applied_id, p_amount, p_payment_method, p_reference_number, p_notes, v_uid
  ) returning id into v_payment_id;

  insert into public.merchant_commission_ledger (
    store_id, entry_type, amount, notes
  ) values (
    p_store_id, 'statement_settlement', -1 * p_amount,
    'سداد دفعة للمنصة (' || p_payment_method::text || ') - مرجع: ' || coalesce(p_reference_number, 'بدون')
  );

  if v_applied_id is not null then
    update public.merchant_monthly_statements
       set paid_amount = paid_amount + p_amount,
           status = case
             when (paid_amount + p_amount) >= commission_total then 'paid'::public.statement_status
             when status = 'overdue' or due_date < v_cairo_today then 'overdue'::public.statement_status
             else 'partially_paid'::public.statement_status
           end,
           updated_at = now()
     where id = v_applied_id;

    if (v_stmt.paid_amount + p_amount) >= v_stmt.commission_total then
      update public.admin_overdue_alerts
         set is_resolved = true,
             resolved_at = now(),
             remaining_amount = 0,
             updated_at = now()
       where statement_id = v_applied_id
         and is_resolved = false;
    else
      update public.admin_overdue_alerts
         set remaining_amount = greatest(v_stmt.commission_total - (v_stmt.paid_amount + p_amount), 0),
             updated_at = now()
       where statement_id = v_applied_id
         and is_resolved = false;
    end if;
  end if;

  return jsonb_build_object(
    'payment_id',   v_payment_id,
    'store_id',     p_store_id,
    'statement_id', v_applied_id,
    'amount',       p_amount,
    'recorded_by',  v_uid
  );
end $$;

-- ---------------------------------------------------------------------
-- 8.4) RPC: إنشاء كشوف الحسابات الشهرية للمحلات (للسوبر أدمن / مجدولة)
-- ---------------------------------------------------------------------
create or replace function public.generate_monthly_statements(p_year int, p_month int)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_count            int := 0;
  v_rows             int := 0;
  v_store            record;
  v_local_start      date;
  v_local_end        date;
  v_start_date       timestamptz;
  v_end_date         timestamptz;
  v_due_date         date;
  v_cairo_today      date := (now() at time zone 'Africa/Cairo')::date;
  v_stmt_num         text;
  v_orders_cnt       int;
  v_gross_sales      numeric(10, 2);
  v_discounts        numeric(10, 2);
  v_items_sub        numeric(10, 2);
  v_deliv_fees       numeric(10, 2);
  v_month_ledger_cnt int;
  v_cum_net_comm     numeric(10, 2);
  v_prior_billed     numeric(10, 2);
  v_raw_period_comm  numeric(10, 2);
  v_billable_comm    numeric(10, 2);
  v_existing_stmt    public.merchant_monthly_statements%rowtype;
  v_has_existing     boolean;
  v_carry_note       text;
begin
  if not public.is_admin() then
    raise exception 'forbidden_admin_only';
  end if;

  if p_month not between 1 and 12 or p_year not between 2024 and 2100 then
    raise exception 'invalid_period';
  end if;

  -- حساب حدود الشهر بالتاريخ المحلي أولًا ثم تحويله لـ Africa/Cairo (حماية يوم 31)
  v_local_start := make_date(p_year, p_month, 1);
  v_local_end   := (v_local_start + interval '1 month')::date;
  v_start_date  := v_local_start::timestamp at time zone 'Africa/Cairo';
  v_end_date    := v_local_end::timestamp at time zone 'Africa/Cairo';
  v_due_date    := (v_local_end + 9);

  for v_store in select id from public.stores order by id for update loop
    v_stmt_num := 'ST-' || p_year || '-' || lpad(p_month::text, 2, '0') || '-' || substr(v_store.id::text, 1, 8);

    select
      count(o.id),
      coalesce(sum(o.original_subtotal), 0),
      coalesce(sum(o.original_subtotal - o.subtotal + o.discount), 0),
      coalesce(sum(greatest(o.subtotal - o.discount, 0)), 0),
      coalesce(sum(o.delivery_fee), 0)
    into
      v_orders_cnt, v_gross_sales, v_discounts, v_items_sub, v_deliv_fees
    from public.orders o
    where o.store_id = v_store.id
      and o.status = 'delivered'
      and o.created_at >= v_start_date
      and o.created_at <  v_end_date;

    select count(*)
    into v_month_ledger_cnt
    from public.merchant_commission_ledger l
    where l.store_id = v_store.id
      and l.entry_type in ('order_commission', 'commission_refund', 'adjustment')
      and l.created_at >= v_start_date
      and l.created_at <  v_end_date;

    select coalesce(sum(l.amount), 0)
    into v_cum_net_comm
    from public.merchant_commission_ledger l
    where l.store_id = v_store.id
      and l.entry_type in ('order_commission', 'commission_refund', 'adjustment')
      and l.created_at < v_end_date;

    select coalesce(sum(m.commission_total), 0)
    into v_prior_billed
    from public.merchant_monthly_statements m
    where m.store_id = v_store.id
      and (m.year < p_year or (m.year = p_year and m.month < p_month));

    select * into v_existing_stmt
    from public.merchant_monthly_statements m
    where m.store_id = v_store.id and m.year = p_year and m.month = p_month
    for update;
    v_has_existing := found;

    v_raw_period_comm := v_cum_net_comm - v_prior_billed;

    if not v_has_existing and v_orders_cnt = 0 and v_month_ledger_cnt = 0 and v_raw_period_comm <= 0 then
      continue;
    end if;

    if v_has_existing then
      v_billable_comm := greatest(v_raw_period_comm, v_existing_stmt.paid_amount, 0);
    else
      v_billable_comm := greatest(v_raw_period_comm, 0);
    end if;

    if v_raw_period_comm < v_billable_comm then
      v_carry_note := 'رصيد دائن مرحّل للفترة القادمة: ' || abs(v_raw_period_comm - v_billable_comm) || ' ج.م';
    else
      v_carry_note := null;
    end if;

    insert into public.merchant_monthly_statements (
      store_id, statement_number, year, month, orders_count,
      gross_sales, total_discounts, items_subtotal, delivery_fees,
      commission_total, due_date, status, notes
    ) values (
      v_store.id, v_stmt_num, p_year, p_month, v_orders_cnt,
      v_gross_sales, v_discounts, v_items_sub, v_deliv_fees,
      v_billable_comm, v_due_date,
      case
        when v_billable_comm = 0 then 'paid'::public.statement_status
        when v_due_date < v_cairo_today then 'overdue'::public.statement_status
        else 'pending'::public.statement_status
      end,
      v_carry_note
    )
    on conflict (store_id, year, month) do update
       set orders_count     = excluded.orders_count,
           gross_sales      = excluded.gross_sales,
           total_discounts  = excluded.total_discounts,
           items_subtotal   = excluded.items_subtotal,
           delivery_fees    = excluded.delivery_fees,
           commission_total = greatest(excluded.commission_total, public.merchant_monthly_statements.paid_amount),
           status = case
             when public.merchant_monthly_statements.paid_amount >= greatest(excluded.commission_total, public.merchant_monthly_statements.paid_amount)
               then 'paid'::public.statement_status
             when public.merchant_monthly_statements.status = 'overdue' or public.merchant_monthly_statements.due_date < v_cairo_today
               then 'overdue'::public.statement_status
             when public.merchant_monthly_statements.paid_amount > 0
               then 'partially_paid'::public.statement_status
             else 'pending'::public.statement_status
           end,
           notes      = coalesce(excluded.notes, public.merchant_monthly_statements.notes),
           updated_at = now()
     where not public.merchant_monthly_statements.is_closed;

    get diagnostics v_rows = row_count;
    v_count := v_count + v_rows;
  end loop;

  return v_count;
end $$;

-- ---------------------------------------------------------------------
-- 8.5) RPC: فحص الكشوف المتأخرة وإنشاء تنبيهات إدارية بعد 7 أيام (بدون إيقاف تلقائي للمتاجر)
-- ---------------------------------------------------------------------
create or replace function public.refresh_overdue_statements_and_alerts()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_grace_days  int := 7;
  v_cairo_today date := (now() at time zone 'Africa/Cairo')::date;
  v_alerts_cnt  int := 0;
  v_rows        int := 0;
  v_rec         record;
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    raise exception 'forbidden_admin_only';
  end if;

  select coalesce(suspension_grace_period_days, 7)
  into v_grace_days
  from public.platform_settings
  where id = 1;

  update public.merchant_monthly_statements
     set status = 'overdue',
         updated_at = now()
   where status in ('pending', 'partially_paid')
     and due_date < v_cairo_today
     and (commission_total - paid_amount) > 0;

  for v_rec in
    select
      m.id as statement_id,
      m.store_id,
      m.statement_number,
      m.due_date,
      (m.commission_total - m.paid_amount) as remaining_amount,
      (v_cairo_today - m.due_date) as days_overdue
    from public.merchant_monthly_statements m
    where m.status = 'overdue'
      and (m.commission_total - m.paid_amount) > 0
      and (v_cairo_today - m.due_date) >= v_grace_days
  loop
    insert into public.admin_overdue_alerts (
      statement_id, store_id, statement_number, due_date,
      remaining_amount, days_overdue, is_resolved, resolved_at
    ) values (
      v_rec.statement_id, v_rec.store_id, v_rec.statement_number, v_rec.due_date,
      v_rec.remaining_amount, v_rec.days_overdue, false, null
    )
    on conflict (statement_id) do update
       set remaining_amount = excluded.remaining_amount,
           days_overdue     = excluded.days_overdue,
           is_resolved      = false,
           resolved_at      = null,
           updated_at       = now()
     where public.admin_overdue_alerts.remaining_amount is distinct from excluded.remaining_amount
        or public.admin_overdue_alerts.days_overdue     is distinct from excluded.days_overdue
        or public.admin_overdue_alerts.is_resolved      = true;

    get diagnostics v_rows = row_count;
    v_alerts_cnt := v_alerts_cnt + v_rows;
  end loop;

  update public.admin_overdue_alerts a
     set is_resolved      = true,
         resolved_at      = now(),
         remaining_amount = 0,


         
         updated_at       = now()
    from public.merchant_monthly_statements m
   where m.id = a.statement_id
     and a.is_resolved = false
     and (m.status = 'paid' or (m.commission_total - m.paid_amount) <= 0);

  return v_alerts_cnt;
end $$;

create or replace function public.check_overdue_stores_and_suspend()
returns int
language plpgsql security definer set search_path = ''
as $$
begin
  return public.refresh_overdue_statements_and_alerts();
end $$;

create or replace function public.acknowledge_overdue_alert(p_alert_id uuid, p_notes text default null)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden_admin_only';
  end if;

  update public.admin_overdue_alerts
     set admin_acknowledged = true,
         acknowledged_by    = auth.uid(),
         acknowledged_at    = now(),
         admin_notes        = coalesce(p_notes, admin_notes),
         updated_at         = now()
   where id = p_alert_id;

  return found;
end $$;

-- ---------------------------------------------------------------------
-- 8.6) RPC: إعادة تفعيل المحل يدويًا بواسطة السوبر أدمن حصريًا
-- ---------------------------------------------------------------------
create or replace function public.reactivate_store(p_store_id uuid, p_notes text default null)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden_admin_only';
  end if;

  update public.stores
     set is_active = true,
         suspension_reason = null,
         reactivated_at = now(),
         reactivated_by = auth.uid(),
         updated_at = now()
   where id = p_store_id;

  if not found then return false; end if;

  if p_notes is not null then
    update public.store_status_logs
       set reason = left(btrim(p_notes), 300)
     where id = (
       select l.id from public.store_status_logs l
       where l.store_id = p_store_id
       order by l.created_at desc, l.id desc
       limit 1
     );
  end if;

  insert into public.notifications (user_id, title, body, link)
  select owner_id, 'تمت إعادة تفعيل متجرك', 'تمت إعادة تفعيل متجرك بنجاح واستئناف استقبال الطلبات', '/merchant'
  from public.stores where id = p_store_id and owner_id is not null;

  return true;
end $$;

-- ---------------------------------------------------------------------
-- 8.7) RPC: إيقاف المحل يدويًا بواسطة السوبر أدمن
-- ---------------------------------------------------------------------
create or replace function public.suspend_store(p_store_id uuid, p_reason text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden_admin_only';
  end if;

  update public.stores
     set is_active = false,
         suspension_reason = left(btrim(coalesce(p_reason, 'إيقاف إداري بواسطة السوبر أدمن')), 300),
         suspended_at = now(),
         suspended_by = auth.uid(),
         updated_at = now()
   where id = p_store_id;

  if not found then return false; end if;

  return true;
end $$;

-- ---------------------------------------------------------------------
-- 8.7.1) RPC: فتح/إغلاق استقبال الطلبات للمحل يدويًا بواسطة السوبر أدمن (is_open)
-- ---------------------------------------------------------------------
create or replace function public.set_store_open_status(
  p_store_id uuid,
  p_is_open  boolean,
  p_reason   text default null
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden_admin_only';
  end if;

  update public.stores
     set is_open    = p_is_open,
         updated_at = now()
   where id = p_store_id;

  if not found then
    return false;
  end if;

  if p_reason is not null then
    update public.store_status_logs
       set reason = left(btrim(p_reason), 300)
     where id = (
       select l.id from public.store_status_logs l
       where l.store_id = p_store_id
       order by l.created_at desc, l.id desc
       limit 1
     );
  end if;

  return true;
end $$;

-- ---------------------------------------------------------------------
-- 8.8) RPC: تسجيل قيد عكسي لاسترداد عمولة طلب ملغى بعد التسليم (Refund)
-- ---------------------------------------------------------------------
create or replace function public.process_order_commission_refund(p_order_id uuid, p_reason text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_store_id    uuid;
  v_order       public.orders%rowtype;
  v_row_count   int := 0;
  v_stmt        public.merchant_monthly_statements%rowtype;
  v_reduc       numeric(10, 2);
  v_cairo_today date := (now() at time zone 'Africa/Cairo')::date;
begin
  if not public.is_admin() then
    raise exception 'forbidden_admin_only';
  end if;

  select store_id into v_store_id from public.orders where id = p_order_id;
  if not found then raise exception 'order_not_found'; end if;

  -- 1) قفل المتجر أولًا (stores → orders → statements)
  perform 1 from public.stores where id = v_store_id for update;

  -- 2) قفل الطلب ثانيًا
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.platform_commission <= 0 then return false; end if;

  if not exists (
    select 1 from public.merchant_commission_ledger l
    where l.order_id = v_order.id
      and l.entry_type = 'order_commission'
  ) then
    return false;
  end if;

  insert into public.merchant_commission_ledger (
    store_id, order_id, entry_type, amount, notes
  ) values (
    v_order.store_id, v_order.id, 'commission_refund', -1 * v_order.platform_commission,
    'استرداد عمولة الطلب ' || v_order.order_number || ': ' || coalesce(nullif(btrim(p_reason), ''), 'استرداد معتمد')
  )
  on conflict (order_id, entry_type)
  where order_id is not null and entry_type in ('order_commission', 'commission_refund')
  do nothing;

  get diagnostics v_row_count = row_count;
  if v_row_count = 0 then return false; end if;

  -- 3) تخفيض الكشف المفتوح غير المسدد (إن وجد)
  select * into v_stmt
  from public.merchant_monthly_statements m
  where m.store_id = v_order.store_id
    and not m.is_closed
    and (m.commission_total - m.paid_amount) > 0
  order by m.year desc, m.month desc
  limit 1
  for update;

  if found then
    v_reduc := least(v_order.platform_commission, v_stmt.commission_total - v_stmt.paid_amount);
    if v_reduc > 0 then
      update public.merchant_monthly_statements
         set commission_total = commission_total - v_reduc,
             status = case
               when paid_amount >= (commission_total - v_reduc) then 'paid'::public.statement_status
               when status = 'overdue' or due_date < v_cairo_today then 'overdue'::public.statement_status
               when paid_amount > 0 then 'partially_paid'::public.statement_status
               else 'pending'::public.statement_status
             end,
             updated_at = now()
       where id = v_stmt.id;

      if v_stmt.paid_amount >= (v_stmt.commission_total - v_reduc) then
        update public.admin_overdue_alerts
           set is_resolved = true,
               resolved_at = now(),
               remaining_amount = 0,
               updated_at = now()
         where statement_id = v_stmt.id and is_resolved = false;
      else
        update public.admin_overdue_alerts
           set remaining_amount = greatest((v_stmt.commission_total - v_reduc) - v_stmt.paid_amount, 0),
               updated_at = now()
         where statement_id = v_stmt.id and is_resolved = false;
      end if;
    end if;
  end if;

  return true;
end $$;


-- ---------------------------------------------------------------------
-- 9) صلاحيات تنفيذ الدوال
-- ---------------------------------------------------------------------
revoke all on function public.is_admin()                       from public;
revoke all on function public.is_merchant_of(uuid)             from public;
revoke all on function public.normalize_eg_phone(text)         from public;
revoke all on function public.create_order(uuid, jsonb, text, text, text, uuid, text, text, numeric, numeric) from public;
revoke all on function public.track_order(text, text, text)    from public;
revoke all on function public.link_guest_order(text, text, text) from public;
revoke all on function public.record_merchant_payment(uuid, numeric, public.payment_method_type, text, uuid, text) from public;
revoke all on function public.generate_monthly_statements(int, int) from public;
revoke all on function public.check_overdue_stores_and_suspend() from public;
revoke all on function public.refresh_overdue_statements_and_alerts() from public, anon;
revoke all on function public.acknowledge_overdue_alert(uuid, text) from public, anon;
revoke all on function public.reactivate_store(uuid, text)     from public;
revoke all on function public.suspend_store(uuid, text)        from public;
revoke all on function public.set_store_open_status(uuid, boolean, text) from public, anon;
revoke all on function public.process_order_commission_refund(uuid, text) from public;

revoke all on function public.handle_new_user()                from public, anon, authenticated;
revoke all on function public.orders_after_status()            from public, anon, authenticated;
revoke all on function public.reviews_after_change()           from public, anon, authenticated;
revoke all on function public.set_updated_at()                 from public, anon, authenticated;
revoke all on function public.profiles_guard()                 from public, anon, authenticated;
revoke all on function public.stores_guard()                   from public, anon, authenticated;
revoke all on function public.log_store_status_change()        from public, anon, authenticated;
revoke all on function public.offers_guard()                   from public, anon, authenticated;
revoke all on function public.reviews_guard()                  from public, anon, authenticated;
revoke all on function public.review_reports_guard()           from public, anon, authenticated;
revoke all on function public.orders_guard()                   from public, anon, authenticated;

grant execute on function public.is_admin()                    to anon, authenticated;
grant execute on function public.is_merchant_of(uuid)          to anon, authenticated;
grant execute on function public.normalize_eg_phone(text)      to anon, authenticated;
grant execute on function public.create_order(uuid, jsonb, text, text, text, uuid, text, text, numeric, numeric)
                                                               to anon, authenticated;
grant execute on function public.track_order(text, text, text) to anon, authenticated;
grant execute on function public.link_guest_order(text, text, text) to authenticated;
grant execute on function public.record_merchant_payment(uuid, numeric, public.payment_method_type, text, uuid, text) to authenticated;
grant execute on function public.generate_monthly_statements(int, int) to authenticated;
grant execute on function public.check_overdue_stores_and_suspend() to authenticated;
grant execute on function public.refresh_overdue_statements_and_alerts() to authenticated;
grant execute on function public.acknowledge_overdue_alert(uuid, text) to authenticated;
grant execute on function public.reactivate_store(uuid, text)  to authenticated;
grant execute on function public.suspend_store(uuid, text)     to authenticated;
grant execute on function public.set_store_open_status(uuid, boolean, text) to authenticated;
grant execute on function public.process_order_commission_refund(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 10) Row Level Security (RLS)
-- ---------------------------------------------------------------------
alter table public.profiles                     enable row level security;
alter table public.addresses                    enable row level security;
alter table public.categories                   enable row level security;
alter table public.stores                       enable row level security;
alter table public.store_categories             enable row level security;
alter table public.products                     enable row level security;
alter table public.offers                       enable row level security;
alter table public.offer_products               enable row level security;
alter table public.orders                       enable row level security;
alter table public.order_tracking_tokens        enable row level security;
alter table public.order_items                  enable row level security;
alter table public.order_events                 enable row level security;
alter table public.reviews                      enable row level security;
alter table public.review_reports               enable row level security;
alter table public.notifications                enable row level security;
alter table public.platform_settings            enable row level security;
alter table public.merchant_commission_ledger   enable row level security;
alter table public.merchant_monthly_statements  enable row level security;
alter table public.merchant_payments            enable row level security;
alter table public.store_status_logs            enable row level security;
alter table public.admin_overdue_alerts         enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- addresses
drop policy if exists addresses_owner_all on public.addresses;
create policy addresses_owner_all on public.addresses for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists addresses_admin_select on public.addresses;
create policy addresses_admin_select on public.addresses for select to authenticated
  using (public.is_admin());

-- categories
drop policy if exists categories_public_select on public.categories;
create policy categories_public_select on public.categories for select to anon, authenticated
  using (is_active);
drop policy if exists categories_admin_all on public.categories;
create policy categories_admin_all on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- stores
drop policy if exists stores_public_select on public.stores;
create policy stores_public_select on public.stores for select to anon, authenticated
  using (is_active);
drop policy if exists stores_owner_select on public.stores;
create policy stores_owner_select on public.stores for select to authenticated
  using (owner_id = (select auth.uid()));
drop policy if exists stores_owner_update on public.stores;
create policy stores_owner_update on public.stores for update to authenticated
  using (public.is_merchant_of(id)) with check (public.is_merchant_of(id));
drop policy if exists stores_admin_all on public.stores;
create policy stores_admin_all on public.stores for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- store_categories
drop policy if exists store_categories_public_select on public.store_categories;
create policy store_categories_public_select on public.store_categories for select to anon, authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.is_active));
drop policy if exists store_categories_manage on public.store_categories;
create policy store_categories_manage on public.store_categories for all to authenticated
  using (public.is_admin() or public.is_merchant_of(store_id))
  with check (public.is_admin() or public.is_merchant_of(store_id));

-- products
drop policy if exists products_public_select on public.products;
create policy products_public_select on public.products for select to anon, authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.is_active));
drop policy if exists products_merchant_all on public.products;
create policy products_merchant_all on public.products for all to authenticated
  using (public.is_merchant_of(store_id))
  with check (public.is_merchant_of(store_id));
drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- offers (تظهر العروض النشطة للمتاجر النشطة فقط في الواجهة)
drop policy if exists offers_public_select on public.offers;
create policy offers_public_select on public.offers for select to anon, authenticated
  using (
    status = 'active' and is_public
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >  now())
    and (usage_limit is null or used_count < usage_limit)
    and (
      store_id is null
      or exists (select 1 from public.stores s where s.id = offers.store_id and s.is_active = true)
    )
  );
drop policy if exists offers_merchant_all on public.offers;
create policy offers_merchant_all on public.offers for all to authenticated
  using (store_id is not null and public.is_merchant_of(store_id))
  with check (store_id is not null and public.is_merchant_of(store_id));
drop policy if exists offers_admin_all on public.offers;
create policy offers_admin_all on public.offers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- offer_products
drop policy if exists offer_products_public_select on public.offer_products;
create policy offer_products_public_select on public.offer_products for select to anon, authenticated
  using (
    exists (
      select 1
      from public.offers o
      join public.products p on p.id = offer_products.product_id
      join public.stores s on s.id = p.store_id
      where o.id = offer_products.offer_id
        and s.is_active = true
        and p.is_available = true
        and o.status = 'active'
        and o.is_public = true
        and (o.starts_at is null or o.starts_at <= now())
        and (o.ends_at   is null or o.ends_at   >  now())
        and (o.usage_limit is null or o.used_count < o.usage_limit)
        and (o.store_id is null or o.store_id = s.id)
    )
  );
drop policy if exists offer_products_merchant_manage on public.offer_products;
create policy offer_products_merchant_manage on public.offer_products for all to authenticated
  using (exists (select 1 from public.offers o where o.id = offer_id and (public.is_merchant_of(o.store_id) or public.is_admin())))
  with check (
    exists (
      select 1 from public.offers o
      join public.products p on p.id = product_id and (p.store_id = o.store_id or o.store_id is null)
      where o.id = offer_id and (public.is_merchant_of(o.store_id) or public.is_admin())
    )
  );

-- orders
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated
  using (customer_id = (select auth.uid())
         or public.is_merchant_of(store_id)
         or public.is_admin());

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update to authenticated
  using (
    customer_id = (select auth.uid())
    or public.is_merchant_of(store_id)
    or public.is_admin()
  )
  with check (
    (
      customer_id = (select auth.uid())
      and status in ('pending', 'cancelled')
      and payment_status = (select o.payment_status from public.orders o where o.id = orders.id)
      and total = (select o.total from public.orders o where o.id = orders.id)
      and subtotal = (select o.subtotal from public.orders o where o.id = orders.id)
    )
    or public.is_merchant_of(store_id)
    or public.is_admin()
  );

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert to authenticated
  with check (public.is_admin());

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o
                 where o.id = order_id
                   and (o.customer_id = (select auth.uid())
                        or public.is_merchant_of(o.store_id)
                        or public.is_admin())));

drop policy if exists order_events_select on public.order_events;
create policy order_events_select on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o
                 where o.id = order_id
                   and (o.customer_id = (select auth.uid())
                        or public.is_merchant_of(o.store_id)
                        or public.is_admin())));

-- reviews: قراءة التقييمات الظاهرة للمتاجر النشطة للجميع، وإمكانية تعديل التقييم لصاحبه
drop policy if exists reviews_public_select on public.reviews;
create policy reviews_public_select on public.reviews for select to anon, authenticated
  using (
    (is_visible and (
      exists (select 1 from public.stores s where s.id = reviews.store_id and s.is_active = true)
      or public.is_merchant_of(reviews.store_id)
    ))
    or public.is_admin()
    or (auth.uid() is not null and user_id = (select auth.uid()))
  );

drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own on public.reviews for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.orders o
                where o.id = order_id
                  and o.customer_id = (select auth.uid())
                  and o.store_id = reviews.store_id
                  and o.status = 'delivered')
  );

drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own on public.reviews for update to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists reviews_admin_delete on public.reviews;
create policy reviews_admin_delete on public.reviews for delete to authenticated
  using (public.is_admin());

-- review_reports: العملاء والتجار يبلغون، والأدمن يدير
drop policy if exists review_reports_insert on public.review_reports;
create policy review_reports_insert on public.review_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

drop policy if exists review_reports_select on public.review_reports;
create policy review_reports_select on public.review_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());

drop policy if exists review_reports_admin_update on public.review_reports;
create policy review_reports_admin_update on public.review_reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- notifications
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- platform_settings (الإعدادات المالية العامة - للسوبر أدمن حصريًا)
drop policy if exists platform_settings_select on public.platform_settings;
create policy platform_settings_select on public.platform_settings for select to authenticated
  using (public.is_admin());

drop policy if exists platform_settings_admin_all on public.platform_settings;
create policy platform_settings_admin_all on public.platform_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- merchant_commission_ledger (التاجر يشاهد فقط حركات متجره، السوبر أدمن يدير ويشاهد الكل)
drop policy if exists merchant_ledger_select on public.merchant_commission_ledger;
create policy merchant_ledger_select on public.merchant_commission_ledger for select to authenticated
  using (public.is_merchant_of(store_id) or public.is_admin());

drop policy if exists merchant_ledger_admin_all on public.merchant_commission_ledger;
create policy merchant_ledger_admin_all on public.merchant_commission_ledger for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- merchant_monthly_statements (كشوف الحسابات الشهرية - التاجر يقرأ كشوفه فقط، السوبر أدمن يدير الكل)
drop policy if exists merchant_statements_select on public.merchant_monthly_statements;
create policy merchant_statements_select on public.merchant_monthly_statements for select to authenticated
  using (public.is_merchant_of(store_id) or public.is_admin());

drop policy if exists merchant_statements_admin_all on public.merchant_monthly_statements;
create policy merchant_statements_admin_all on public.merchant_monthly_statements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- merchant_payments (سجل المدفوعات والتحصيلات - التاجر يرى مدفوعاته فقط، السوبر أدمن يدير ويسجل الكل)
drop policy if exists merchant_payments_select on public.merchant_payments;
create policy merchant_payments_select on public.merchant_payments for select to authenticated
  using (public.is_merchant_of(store_id) or public.is_admin());

drop policy if exists merchant_payments_admin_all on public.merchant_payments;
create policy merchant_payments_admin_all on public.merchant_payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- store_status_logs (سجل تغييرات حالة المتجر - السوبر أدمن يرى الكل والتاجر يرى سجل متجره)
drop policy if exists store_status_logs_select on public.store_status_logs;
create policy store_status_logs_select on public.store_status_logs for select to authenticated
  using (public.is_admin() or public.is_merchant_of(store_id));

-- admin_overdue_alerts (تنبيهات التأخر بعد 7 أيام - للسوبر أدمن حصريًا)
drop policy if exists admin_overdue_alerts_admin_all on public.admin_overdue_alerts;
create policy admin_overdue_alerts_admin_all on public.admin_overdue_alerts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 11) Table privileges
-- ---------------------------------------------------------------------
revoke truncate, references, trigger on
  public.profiles, public.addresses, public.categories, public.stores,
  public.store_categories, public.products, public.offers, public.offer_products,
  public.orders, public.order_tracking_tokens, public.order_items,
  public.order_events, public.reviews, public.review_reports, public.notifications,
  public.platform_settings, public.merchant_commission_ledger,
  public.merchant_monthly_statements, public.merchant_payments,
  public.store_status_logs, public.admin_overdue_alerts
from anon, authenticated;

-- الزائر: قراءة فقط للمعلومات العامة
revoke insert, update, delete on
  public.profiles, public.addresses, public.categories, public.stores,
  public.store_categories, public.products, public.offers, public.offer_products,
  public.orders, public.order_items, public.order_events, public.reviews,
  public.review_reports, public.notifications, public.platform_settings,
  public.merchant_commission_ledger, public.merchant_monthly_statements,
  public.merchant_payments, public.store_status_logs, public.admin_overdue_alerts
from anon;

revoke all on public.profiles, public.addresses, public.orders, public.order_items,
  public.order_events, public.review_reports, public.notifications,
  public.platform_settings, public.merchant_commission_ledger,
  public.merchant_monthly_statements, public.merchant_payments,
  public.store_status_logs, public.admin_overdue_alerts from anon;

revoke all on public.order_tracking_tokens from anon, authenticated;

-- المستخدم والتاجر: منع التعديل المباشر على الحسابات والماليات والسجل الإداري
revoke insert, update, delete on
  public.platform_settings, public.merchant_commission_ledger,
  public.merchant_monthly_statements, public.merchant_payments,
  public.store_status_logs, public.admin_overdue_alerts
from authenticated;

grant select on public.store_status_logs to authenticated;
grant select, update on public.admin_overdue_alerts to authenticated;

-- المسجل: التحكم في الطلبات والتقييمات
revoke insert, delete on public.orders, public.order_items, public.order_events from authenticated;
revoke update on public.orders from authenticated;
grant  update (status) on public.orders to authenticated;

revoke insert on public.notifications from authenticated;
revoke update on public.notifications from authenticated;
grant  update (is_read) on public.notifications to authenticated;

revoke insert, delete on public.profiles from authenticated;

-- تقارير المبيعات والملخص المالي وتنبيهات التأخر
revoke all on public.merchant_sales_reports, public.merchant_financial_summary, public.admin_overdue_alerts_view from public, anon;
grant select on public.merchant_sales_reports to authenticated;
grant select on public.merchant_financial_summary to authenticated;
grant select on public.admin_overdue_alerts_view to authenticated;

commit;
