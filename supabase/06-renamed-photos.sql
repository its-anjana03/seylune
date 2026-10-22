-- =====================================================================
-- SEYLUNE — STEP 10: THE NOIRA PHOTOS MOVED
-- Run once (SQL Editor → + → Create a new snippet → paste → Run),
-- BEFORE the new version of the site is pushed to GitHub.
--
-- The three Noira Satin Dress photos that lived in the misspelled folder
-- "Prodcut Details-Noira Satin Dress/" now sit with the other dresses:
--   Noira-Satin-Dress-2.jpg  →  home/images/products/Dresses/noira-satin-dress-4.jpg
--   Noira-Satin-Dress-1.jpg  →  home/images/products/Dresses/noira-satin-dress-5.jpg
--   Noira-Satin-Dress-3.jpg  →  home/images/products/Dresses/noira-satin-dress-6.jpg
-- This points the database at the new addresses, wherever an old one is
-- used (main photo or more views), and changes nothing else.
-- Safe to run again: once nothing points at the old folder it does nothing.
-- =====================================================================

create or replace function pg_temp.moved(p text) returns text language sql immutable as $$
  select case p
    when 'Prodcut Details-Noira Satin Dress/Noira-Satin-Dress-2.jpg' then 'home/images/products/Dresses/noira-satin-dress-4.jpg'
    when 'Prodcut Details-Noira Satin Dress/Noira-Satin-Dress-1.jpg' then 'home/images/products/Dresses/noira-satin-dress-5.jpg'
    when 'Prodcut Details-Noira Satin Dress/Noira-Satin-Dress-3.jpg' then 'home/images/products/Dresses/noira-satin-dress-6.jpg'
    else p
  end
$$;

update public.products p
   set image   = pg_temp.moved(p.image),
       gallery = (select coalesce(array_agg(pg_temp.moved(g) order by n), '{}')
                    from unnest(p.gallery) with ordinality as t(g, n)),
       updated_at = now()
 where p.image like 'Prodcut Details-%'
    or exists (select 1 from unnest(p.gallery) as g where g like 'Prodcut Details-%');
