-- =====================================================================
-- SEYLUNE — STEP 3: THE CATALOGUE IN THE DATABASE + SHOP TOOLS
-- Run once, after 02-admin-and-profiles.sql
-- (SQL Editor → + → Create a new snippet → paste → Run).
-- Then run 03-catalogue-content.sql to copy the 24 pieces' details in.
-- Safe to run again.
--
-- What this adds, in plain words:
--   products        now holds EVERYTHING about a piece (description,
--                   colour, sizes, photos, sale price…), so an admin edit
--                   shows across the whole shop at once
--   product photos  a Storage bucket: anyone can view, only admins upload;
--                   only JPG / PNG / WebP up to 5 MB are accepted
--   sale prices     checkout charges the sale price when there is one
--   customers       admins may read members' profiles; a member's email
--                   in their profile is written only by the database
--   messages        contact-form messages + newsletter sign-ups; visitors
--                   may only ADD one (through guarded functions with a
--                   per-visitor limit), only admins may read them
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. PRODUCTS — the whole piece, not just its price
-- ---------------------------------------------------------------------
alter table public.products
  add column if not exists sale_price integer,
  add column if not exists color      text,
  add column if not exists sizes      text[]  not null default '{}',
  add column if not exists is_new     boolean not null default false,
  add column if not exists image      text,
  add column if not exists gallery    text[]  not null default '{}',
  add column if not exists short      text,
  add column if not exists description text,
  add column if not exists fabric     text,
  add column if not exists care       text,
  add column if not exists note       text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

-- The database refuses bad edits, whoever sends them
do $$ begin
  alter table public.products add constraint products_id_format
    check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 60);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.products add constraint products_name_length
    check (char_length(name) between 2 and 80);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.products add constraint products_category_known
    check (category in ('Dresses', 'Tops', 'Bottoms', 'Outerwear', 'Accessories'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.products add constraint products_price_range
    check (price between 1 and 1000000);
exception when duplicate_object then null; end $$;
-- A sale price must be a real discount
do $$ begin
  alter table public.products add constraint products_sale_below_price
    check (sale_price is null or (sale_price > 0 and sale_price < price));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.products add constraint products_text_lengths
    check (coalesce(char_length(short), 0) <= 400
       and coalesce(char_length(description), 0) <= 2000
       and coalesce(char_length(fabric), 0) <= 200
       and coalesce(char_length(care), 0) <= 200
       and coalesce(char_length(note), 0) <= 200
       and cardinality(gallery) <= 8
       and cardinality(sizes) <= 6);
exception when duplicate_object then null; end $$;

-- Who may read and change products:
-- shoppers see pieces that are on sale in the shop (active); admins see
-- every piece, may add new ones and edit them. Nobody may delete one —
-- old orders point at it — an admin archives it instead (active = false).
drop policy if exists "Anyone can read products" on public.products;
drop policy if exists "Shoppers read active products" on public.products;
create policy "Shoppers read active products"
  on public.products for select
  to anon, authenticated
  using (active);

drop policy if exists "Admins read every product" on public.products;
create policy "Admins read every product"
  on public.products for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Admins add products" on public.products;
create policy "Admins add products"
  on public.products for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "Admins edit products" on public.products;
create policy "Admins edit products"
  on public.products for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant insert, update on public.products to authenticated;

-- New sizes need a stock row: admins may add them
drop policy if exists "Admins add stock rows" on public.product_stock;
create policy "Admins add stock rows"
  on public.product_stock for insert
  to authenticated
  with check ((select private.is_admin()));

grant insert on public.product_stock to authenticated;


-- ---------------------------------------------------------------------
-- 2. PRODUCT PHOTOS — a Storage bucket
--    public = anyone can VIEW a photo by its address (the shop needs
--    that). Uploading, replacing and deleting are admins only. The
--    bucket itself refuses other file types and anything over 5 MB.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins upload product photos" on storage.objects;
create policy "Admins upload product photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and (select private.is_admin()));

drop policy if exists "Admins replace product photos" on storage.objects;
create policy "Admins replace product photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()))
  with check (bucket_id = 'product-images' and (select private.is_admin()));

drop policy if exists "Admins delete product photos" on storage.objects;
create policy "Admins delete product photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()));


-- ---------------------------------------------------------------------
-- 3. place_order() — charges the sale price when a piece has one
--    (everything else is exactly as before)
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
  v_price    integer;
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

    -- The sale price when there is one, otherwise the full price
    v_price := coalesce(v_product.sale_price, v_product.price);

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
    values (v_order_id, v_product.id, v_product.name, v_size, v_price, v_qty);

    v_subtotal := v_subtotal + v_price * v_qty;
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
-- 4. CUSTOMERS — admins may read members' profiles
--    The profile now also keeps the member's email, copied by the
--    database from their account. Members may still edit their name,
--    phone and address, but NOT the email column: column-level
--    permissions below list exactly which columns they may write.
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

update public.profiles p
   set email = u.email, created_at = u.created_at
  from auth.users u
 where u.id = p.id and p.email is null;

revoke insert, update on public.profiles from authenticated;
grant insert (id, full_name, phone, address, city, postal, updated_at) on public.profiles to authenticated;
grant update (full_name, phone, address, city, postal, updated_at)     on public.profiles to authenticated;

drop policy if exists "Admins read every profile" on public.profiles;
create policy "Admins read every profile"
  on public.profiles for select
  to authenticated
  using ((select private.is_admin()));

-- New accounts: the profile gets the name AND the email
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, case when char_length(v_name) between 2 and 80 then v_name end, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- 5. MESSAGES + NEWSLETTER
--    Visitors (signed in or not) may only ADD, through the two
--    functions below. They check every field and allow a few sends per
--    visitor every 10 minutes — the visitor is recognised by a scrambled
--    (hashed) form of their IP address, so the real address is never
--    stored. Only admins can read, mark done or delete.
-- ---------------------------------------------------------------------
create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(name) between 2 and 80),
  email      text not null check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message    text not null check (char_length(message) between 10 and 2000),
  handled    boolean not null default false,
  visitor    text,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter (
  email      text primary key check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  visitor    text,
  created_at timestamptz not null default now()
);

alter table public.messages   enable row level security;
alter table public.newsletter enable row level security;
revoke all on public.messages, public.newsletter from anon;
revoke insert, update, delete on public.messages, public.newsletter from authenticated;
grant update (handled) on public.messages to authenticated;
grant delete on public.messages, public.newsletter to authenticated;

drop policy if exists "Admins read messages" on public.messages;
create policy "Admins read messages" on public.messages for select
  to authenticated using ((select private.is_admin()));
drop policy if exists "Admins mark messages" on public.messages;
create policy "Admins mark messages" on public.messages for update
  to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "Admins delete messages" on public.messages;
create policy "Admins delete messages" on public.messages for delete
  to authenticated using ((select private.is_admin()));

drop policy if exists "Admins read the newsletter list" on public.newsletter;
create policy "Admins read the newsletter list" on public.newsletter for select
  to authenticated using ((select private.is_admin()));
drop policy if exists "Admins remove newsletter emails" on public.newsletter;
create policy "Admins remove newsletter emails" on public.newsletter for delete
  to authenticated using ((select private.is_admin()));

-- Who is sending? A one-way hash of the visitor's IP address
create or replace function private.visitor_key()
returns text
language sql
stable
set search_path = ''
as $$
  select md5('seylune:' || coalesce(
    split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1),
    'unknown'));
$$;

create or replace function public.send_message(p_name text, p_email text, p_message text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visitor text := private.visitor_key();
begin
  if (select count(*) from public.messages
      where visitor = v_visitor and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Too many messages in a short time. Please try again later.' using errcode = '53400';
  end if;
  insert into public.messages (name, email, message, visitor)
  values (btrim(p_name), lower(btrim(p_email)), btrim(p_message), v_visitor);
  return true;
exception when check_violation then
  raise exception 'Please check your name, email and message.' using errcode = '22023';
end;
$$;

create or replace function public.join_newsletter(p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visitor text := private.visitor_key();
begin
  if (select count(*) from public.newsletter
      where visitor = v_visitor and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Too many sign-ups in a short time. Please try again later.' using errcode = '53400';
  end if;
  insert into public.newsletter (email, visitor)
  values (lower(btrim(p_email)), v_visitor)
  on conflict (email) do nothing;   -- already on the list: same friendly answer
  return true;
exception when check_violation then
  raise exception 'Please enter a valid email address.' using errcode = '22023';
end;
$$;

revoke execute on function public.send_message(text, text, text), public.join_newsletter(text) from public;
grant  execute on function public.send_message(text, text, text), public.join_newsletter(text) to anon, authenticated;
