-- =====================================================================
-- Migration: 20261109_discount_cap_order_total.sql
-- تفعيل سقف الخصم (max_discount) على توتال الطلب وربطه بقاعدة بيانات Supabase
-- =====================================================================

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

  -- 6) حساب عروض الأصناف المحددة فقط (specific items via offer_products)
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

  -- 11) حساب عمولة المنصة على صافي المنتجات
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
    'tracking_token',    v_token
  );
end;
$$;

