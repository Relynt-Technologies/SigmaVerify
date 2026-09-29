-- ─── UNIQUE ORG NAME ──────────────────────────────────────────────────────────
-- Admins register orgs by name, so two orgs must not end up with the same one.
-- Partial + case-insensitive: admin/bgv_team rows carry company_name = '' and
-- must not collide with each other, and '' must stay available as "no company".

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_hr_company_name
  ON profiles (lower(company_name))
  WHERE role = 'hr' AND company_name IS NOT NULL AND company_name <> '';
