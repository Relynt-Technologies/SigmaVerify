-- ─── ADMIN EMPLOYEE POWERS ────────────────────────────────────────────────────
-- Lets an admin add a BGV candidate to any organization from the admin org
-- section, without being logged in as that organization's HR profile.
-- Employees land in 'pending_initiation'; the seat is only consumed when HR or
-- the admin initiates the BGV from the employee list.

CREATE POLICY "employees_insert_admin" ON employees
  FOR INSERT WITH CHECK (get_user_role() = 'admin');
