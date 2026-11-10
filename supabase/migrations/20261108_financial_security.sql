-- =====================================================================
-- Migration: 20261108_financial_security.sql
-- تأمين المعاملات والعمليات المالية وحظر تلاعب العميل بالأسعار أو حالة الدفع
-- =====================================================================

-- 1) تحديث دالة orders_guard لحظر تعديل حالة الدفع payment_status من طرف العميل
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

  -- منع تعديل الحقول المالية وحقول الطلب الثابتة بعد إنشائه
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

  -- فحص التحول في حالة الطلب وفق صلاحيات العميل والتاجر والأدمن
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

-- 2) تحديث سياسات الأمان RLS على جدول الطلبات orders
drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update to authenticated
  using (
    customer_id = (select auth.uid())
    or public.is_merchant_of(store_id)
    or public.is_admin()
  )
  with check (
    -- العميل يمكنه فقط إلغاء الطلب إذا كان قيد الانتظار دون لمس أي مبالغ أو حالة دفع
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

-- حظر الـ INSERT المباشر على جدول الطلبات لليوزر العادي (الإنشاء حصراً عبر دالة RPC الذرية create_order)
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert to authenticated
  with check (public.is_admin());

-- حظر الـ INSERT و UPDATE و DELETE المباشر على تفاصيل أصناف الطلب order_items
drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items for insert to authenticated
  with check (public.is_admin());

drop policy if exists order_items_update on public.order_items;
create policy order_items_update on public.order_items for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists order_items_delete on public.order_items;
create policy order_items_delete on public.order_items for delete to authenticated
  using (public.is_admin());

