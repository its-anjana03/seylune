-- =====================================================================
-- SEYLUNE — STEP 2: THE ADMIN TEAM + MEMBER PROFILES
-- Run once, after schema.sql and seed.sql
-- (SQL Editor → + → Create a new snippet → paste → Run).
-- Safe to run again.
--
-- What this adds, in plain words:
--   admins          the list of people who may use the admin page.
--                   Nobody can add themselves from the browser: you add
--                   yourself once, here in the SQL Editor (see the end).
--   private.is_admin()   "is the person making this request on that list?"
--                   It lives in a "private" schema that the website API does
--                   not expose, so it can be used by the rules below but can
--                   never be called from the browser.
--   admin rules     admins may read every order and change stock counts
--   admin_set_order_status()   the only way to change an order's status;
--                   cancelling puts the pieces back in stock
--   profiles        each member's name, phone and delivery address,
--                   readable and editable only by that member
--
-- Why a table and not a "role" in the user's profile data? Supabase lets
-- every signed-in user edit their own user_metadata from the browser, so
-- anything stored there must never decide what someone may do. Rows in
-- admins can only be written here, with your dashboard login.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. THE ADMIN TEAM
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Each person may see only their own row (so the page can ask "am I one?")
drop policy if exists "Members see their own admin row" on public.admins;
create policy "Members see their own admin row"
  on public.admins for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No insert / update / delete rules: the list can't be changed from the browser
revoke insert, update, delete on public.admins from anon, authenticated;

-- A schema the website API doesn't expose: helpers here can be used by the
-- security rules, but nobody can call them from the browser.
create schema if not exists private;
grant usage on schema private to authenticated;

-- "Is the person making this request an admin?" Used by the rules below.
-- security definer: it may look at the admins table on the caller's behalf,
-- but it can only ever answer true or false about the caller.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke execute on function private.is_admin() from public, anon;
grant  execute on function private.is_admin() to authenticated;


-- ---------------------------------------------------------------------
-- 2. ORDERS REMEMBER THE CUSTOMER'S EMAIL (for the admin page)
--    Taken from the signed-in session inside place_order(), never from
--    the browser, so it can't be faked.
-- ---------------------------------------------------------------------
alter table public.orders add column if not exists email text;
alter table public.orders add column if not exists status_updated_at timestamptz;

update public.orders o
   set email = u.email
  from auth.users u
 where u.id = o.user_id and o.email is null;


-- ---------------------------------------------------------------------
-- 3. WHAT ADMINS MAY DO
--    These are extra rules: a customer's own rules (schema.sql) still
--    apply. Postgres allows a request if ANY rule for it says yes.
-- ---------------------------------------------------------------------
drop policy if exists "Admins read all orders" on public.orders;
create policy "Admins read all orders"
  on public.orders for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Admins read all order items" on public.order_items;
create policy "Admins read all order items"
  on public.order_items for select
  to authenticated
  using ((select private.is_admin()));

-- Admins may change stock counts — and only the quantity column
drop policy if exists "Admins update stock" on public.product_stock;
create policy "Admins update stock"
  on public.product_stock for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant update (quantity) on public.product_stock to authenticated;

-- A sensible ceiling, so a typo can't set 1,000,000 pieces
do $$ begin
  alter table public.product_stock add constraint product_stock_quantity_max check (quantity <= 999);
exception when duplicate_object then null;
end $$;


-- ---------------------------------------------------------------------
-- 4. admin_set_order_status() — moving an order along
--    processing → shipped → delivered, or cancelled at any point before
--    delivery. Cancelling returns its pieces to stock. A cancelled or
--    delivered order is final.
-- ---------------------------------------------------------------------
create or replace function public.admin_set_order_status(p_number text, p_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  if not private.is_admin() then
    raise exception 'Only the Seylune team can change orders.' using errcode = '42501';
  end if;
  if p_status not in ('processing', 'shipped', 'delivered', 'cancelled') then
    raise exception 'Unknown status.' using errcode = '22023';
  end if;

  select * into v_order from public.orders where number = p_number for update;
  if not found then
    raise exception 'Order % was not found.', p_number using errcode = 'P0002';
  end if;
  if v_order.status = p_status then
    return p_status;
  end if;
  if v_order.status in ('cancelled', 'delivered') then
    raise exception 'Order % is already %, so it can''t be changed.', p_number, v_order.status using errcode = 'P0001';
  end if;

  -- Cancelling: the pieces go back on the shelf
  if p_status = 'cancelled' then
    update public.product_stock s
       set quantity = least(999, s.quantity + i.quantity)
      from public.order_items i
     where i.order_id = v_order.id
       and s.product_id = i.product_id
       and s.size = i.size;
  end if;

  update public.orders
     set status = p_status, status_updated_at = now()
   where id = v_order.id;

  return p_status;
end;
$$;

revoke execute on function public.admin_set_order_status(text, text) from public, anon;
grant  execute on function public.admin_set_order_status(text, text) to authenticated;


-- ---------------------------------------------------------------------
-- 5. place_order() — now also saves the customer's email on the order
--    (everything else is exactly as in schema.sql)
-- ---------------------------------------------------------------------
create or replace function public.place_order(
  p_items    jsonb,
  p_delivery text,
  p_payment  text,
  p_ship     jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_email    text := auth.jwt() ->> 'email';
  v_item     jsonb;
  v_product  public.products%rowtype;
  v_stock    integer;
  v_qty      integer;
  v_size     text;
  v_subtotal integer := 0;
  v_shipping integer;
  v_order_id uuid;
  v_number   text;
  v_name     text   := btrim(coalesce(p_ship ->> 'name', ''));
  v_phone    text   := regexp_replace(coalesce(p_ship ->> 'phone', ''), '[\s-]', '', 'g');
  v_address  text   := btrim(coalesce(p_ship ->> 'address', ''));
  v_city     text   := btrim(coalesce(p_ship ->> 'city', ''));
  v_postal   text   := btrim(coalesce(p_ship ->> 'postal', ''));
  v_notes    text   := left(btrim(coalesce(p_ship ->> 'notes', '')), 300);
begin
  if v_user is null then
    raise exception 'Please sign in to place an order.' using errcode = '28000';
  end if;

  if p_delivery not in ('standard', 'express') or p_payment not in ('cod', 'bank') then
    raise exception 'Unknown delivery or payment method.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'The cart could not be read.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'An order needs between 1 and 20 lines.' using errcode = '22023';
  end if;
  if length(v_name) not between 2 and 80
     or v_phone !~ '^(\+94|0)7[0-9]{8}$'
     or length(v_address) not between 5 and 200
     or length(v_city) not between 2 and 60
     or v_postal !~ '^[0-9]{5}$' then
    raise exception 'Please check the delivery details.' using errcode = '22023';
  end if;

  if (select count(*) from public.orders
      where user_id = v_user and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many orders in a short time. Please try again later.' using errcode = '53400';
  end if;

  v_number := 'SEY-' || to_char(now() at time zone 'Asia/Colombo', 'YYMMDD') || '-'
              || upper(substr(md5(gen_random_uuid()::text), 1, 4));

  insert into public.orders (number, user_id, email, delivery, payment, subtotal, shipping, total,
                             ship_name, ship_phone, ship_address, ship_city, ship_postal, notes)
  values (v_number, v_user, v_email, p_delivery, p_payment, 0, 0, 0,
          v_name, v_phone, v_address, v_city, v_postal, nullif(v_notes, ''))
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_size := v_item ->> 'size';
    v_qty  := (v_item ->> 'quantity')::integer;

    if v_qty is null or v_qty not between 1 and 10 then
      raise exception 'Quantities must be between 1 and 10.' using errcode = '22023';
    end if;

    select * into v_product from public.products
      where id = v_item ->> 'id' and active;
    if not found then
      raise exception 'A piece in your cart is no longer available.' using errcode = 'P0002';
    end if;

    select quantity into v_stock from public.product_stock
      where product_id = v_product.id and size = v_size
      for update;
    if v_stock is null then
      raise exception '% is not made in size %.', v_product.name, v_size using errcode = '22023';
    end if;
    if v_stock < v_qty then
      raise exception 'Only % left of % in size %.', v_stock, v_product.name, v_size using errcode = 'P0001';
    end if;

    update public.product_stock set quantity = quantity - v_qty
      where product_id = v_product.id and size = v_size;

    insert into public.order_items (order_id, product_id, name, size, unit_price, quantity)
    values (v_order_id, v_product.id, v_product.name, v_size, v_product.price, v_qty);

    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  v_shipping := case
    when p_delivery = 'express' then 950
    when v_subtotal >= 10000    then 0
    else 450
  end;

  update public.orders
     set subtotal = v_subtotal, shipping = v_shipping, total = v_subtotal + v_shipping
   where id = v_order_id;

  return jsonb_build_object(
    'number', v_number, 'subtotal', v_subtotal,
    'shipping', v_shipping, 'total', v_subtotal + v_shipping
  );
end;
$$;

revoke execute on function public.place_order(jsonb, text, text, jsonb) from public, anon;
grant  execute on function public.place_order(jsonb, text, text, jsonb) to authenticated;


-- ---------------------------------------------------------------------
-- 6. MEMBER PROFILES
--    One row per member: name, phone and a default delivery address.
--    The checks mirror the checkout rules, so the database refuses a
--    bad phone number even if someone skips the website's form.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text check (full_name is null or char_length(full_name) between 2 and 80),
  phone      text check (phone is null or phone ~ '^(\+94|0)7[0-9]{8}$'),
  address    text check (address is null or char_length(address) between 5 and 200),
  city       text check (city is null or char_length(city) between 2 and 60),
  postal     text check (postal is null or postal ~ '^[0-9]{5}$'),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Members read their own profile" on public.profiles;
create policy "Members read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Members create their own profile" on public.profiles;
create policy "Members create their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- "using" decides which rows they may touch; "with check" decides what the
-- row may look like afterwards — so nobody can move a profile to another id
drop policy if exists "Members update their own profile" on public.profiles;
create policy "Members update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on public.profiles from anon;
revoke delete on public.profiles from authenticated;

-- Every new account gets an empty profile with the name given at sign-up
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
begin
  insert into public.profiles (id, full_name)
  values (new.id, case when char_length(v_name) between 2 and 80 then v_name end)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Profiles for the accounts that already exist
insert into public.profiles (id, full_name)
select id, case when char_length(btrim(coalesce(raw_user_meta_data ->> 'full_name', ''))) between 2 and 80
                then btrim(raw_user_meta_data ->> 'full_name') end
  from auth.users
on conflict (id) do nothing;


-- =====================================================================
-- LAST STEP — MAKE YOURSELF AN ADMIN
-- Put the email you signed up with on the Seylune site between the quotes,
-- then run just these two lines (select them and press Run).
-- =====================================================================
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'your-email@example.com';
