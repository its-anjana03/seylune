-- =====================================================================
-- SEYLUNE — STEP 4: ADMINS CAN SEE THE WHOLE TEAM LIST
-- Run once, after step 3 (SQL Editor → + → Create a new snippet → Run).
--
-- Until now each person could see only their own row in admins (enough
-- for "am I on the team?"). The admin page also needs the whole list, so
-- that team accounts are left out of Customers. This adds one rule: an
-- admin may read every row of the team list. Customers still see only
-- their own row (which, for them, doesn't exist), and nobody can change
-- the list from the browser.
-- =====================================================================

drop policy if exists "Admins read the team list" on public.admins;
create policy "Admins read the team list"
  on public.admins for select
  to authenticated
  using ((select private.is_admin()));
