-- =====================================================================
-- SEYLUNE — DATABASE SETUP (run once in Supabase: SQL Editor → New query)
--
-- What this creates, in plain words:
--   products       the database's own price list (the site's photos and
--                  descriptions stay in shared/products.js)
--   product_stock  how many of each piece are left, per size
--   orders         one row per order, owned by the customer who placed it
--   order_items    the pieces inside each order
--   place_order()  the ONLY way to create an order: it checks everything
--                  and works out the prices itself
--
-- The golden rule: the browser is not trusted. Anyone can open DevTools
-- and send any request with our public (publishable) key. So every table
-- has Row Level Security (RLS) switched on, and the rules below decide
-- exactly what a visitor may read or change. Anything not allowed by a
-- rule is refused.
--
-- Safe to run again: it drops and recreates the function and policies.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. PRODUCTS — the price list
--    Prices are whole rupees (integers): no rounding surprises.
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id         text primary key,                 -- e.g. 'noira-satin-dress'
  name       text not null,
  category   text not null,
  price      integer not null check (price > 0),
  active     boolean not null default true,     -- false = no longer sold
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 2. PRODUCT STOCK — how many are left, per size
-- ---------------------------------------------------------------------
create table if not exists public.product_stock (
  product_id text not null references public.products (id) on delete cascade,
  size       text not null,                     -- 'XS' … 'XL' or 'One Size'
  quantity   integer not null check (quantity >= 0),
  primary key (product_id, size)
);


-- ---------------------------------------------------------------------
-- 3. ORDERS + ORDER ITEMS
--    user_id links each order to the account that placed it.
--    Prices are copied into order_items at the moment of purchase, so an
--    old order still shows what was paid even if a price changes later.
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  number       text not null unique,            -- e.g. 'SEY-261022-4F7A'
  user_id      uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'processing'
               check (status in ('processing', 'shipped', 'delivered', 'cancelled')),
  delivery     text not null check (delivery in ('standard', 'express')),
  payment      text not null check (payment in ('cod', 'bank')),
  subtotal     integer not null,
  shipping     integer not null,
  total        integer not null,
  ship_name    text not null,
  ship_phone   text not null,
  ship_address text not null,
  ship_city    text not null,
  ship_postal  text not null,
  notes        text,
  created_at   timestamptz not null default now()
);

create table if not exists public.order_items (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders (id) on delete cascade,
  product_id text not null references public.products (id),
  name       text not null,
  size       text not null,
  unit_price integer not null,
  quantity   integer not null check (quantity between 1 and 10)
);

create index if not exists orders_user_id_idx      on public.orders (user_id, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);


-- ---------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY — who may do what
--    "anon" = a visitor who is not signed in
--    "authenticated" = a signed-in customer
--    auth.uid() = the id of the signed-in customer making the request
-- ---------------------------------------------------------------------
alter table public.products      enable row level security;
alter table public.product_stock enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;

-- Everyone may READ the price list and the stock (the shop window).
drop policy if exists "Anyone can read products" on public.products;
create policy "Anyone can read products"
  on public.products for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can read stock" on public.product_stock;
create policy "Anyone can read stock"
  on public.product_stock for select
  to anon, authenticated
  using (true);

-- A customer may read ONLY their own orders…
drop policy if exists "Customers read their own orders" on public.orders;
create policy "Customers read their own orders"
  on public.orders for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- …and only the items inside their own orders.
drop policy if exists "Customers read their own order items" on public.order_items;
create policy "Customers read their own order items"
  on public.order_items for select
  to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.user_id = (select auth.uid())
  ));

-- There are deliberately NO insert / update / delete policies. With RLS on,
-- that means nobody can write to these tables from the browser at all:
-- not prices, not stock, not order statuses. Orders are created only by
-- place_order() below. Belt and braces: remove the write permissions too.
revoke insert, update, delete on public.products, public.product_stock,
  public.orders, public.order_items from anon, authenticated;


-- ---------------------------------------------------------------------
-- 5. place_order() — the checkout, done by the database
--
--    The browser sends only: which pieces, which sizes, how many, the
--    delivery + payment choice and the address. It never sends a price.
--    This function:
--      - refuses visitors who are not signed in
--      - checks every field (Sri Lankan mobile, 5-digit postal code, …)
--      - limits a customer to 5 orders an hour (stops spam scripts)
--      - looks up each price from the products table
--      - locks the stock rows, refuses sizes that have run out, and takes
--        the pieces out of stock — all in one transaction, so two people
--        can never buy the last dress at the same moment
--      - works out delivery (free standard over Rs. 10,000) and the total
--
--    "security definer" lets it write to the tables that the browser can't
--    touch. That is powerful, so it re-checks everything itself, uses
--    fully qualified names, and runs with an empty search_path.
-- ---------------------------------------------------------------------
drop function if exists public.place_order(jsonb, text, text, jsonb);

create function public.place_order(
  p_items    jsonb,   -- [{ "id": "noira-satin-dress", "size": "M", "quantity": 1 }, …]
  p_delivery text,    -- 'standard' | 'express'
  p_payment  text,    -- 'cod' | 'bank'
  p_ship     jsonb    -- { "name", "phone", "address", "city", "postal", "notes" }
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
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
  -- Who is ordering?
  if v_user is null then
    raise exception 'Please sign in to place an order.' using errcode = '28000';
  end if;

  -- Is the request well formed?
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

  -- Slow down scripts: at most 5 orders per customer per hour.
  if (select count(*) from public.orders
      where user_id = v_user and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many orders in a short time. Please try again later.' using errcode = '53400';
  end if;

  -- Create the order first (totals are filled in once the lines are priced).
  v_number := 'SEY-' || to_char(now() at time zone 'Asia/Colombo', 'YYMMDD') || '-'
              || upper(substr(md5(gen_random_uuid()::text), 1, 4));

  insert into public.orders (number, user_id, delivery, payment, subtotal, shipping, total,
                             ship_name, ship_phone, ship_address, ship_city, ship_postal, notes)
  values (v_number, v_user, p_delivery, p_payment, 0, 0, 0,
          v_name, v_phone, v_address, v_city, v_postal, nullif(v_notes, ''))
  returning id into v_order_id;

  -- Price every line from the database and take it out of stock.
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

    -- "for update" locks this row until the order is saved.
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

  -- Delivery: standard is free over Rs. 10,000; express is always Rs. 950.
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

-- Only signed-in customers may call it (visitors and the public cannot).
revoke execute on function public.place_order(jsonb, text, text, jsonb) from public, anon;
grant  execute on function public.place_order(jsonb, text, text, jsonb) to authenticated;
