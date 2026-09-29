-- ─── PROFILE EMAIL VERIFICATION ───────────────────────────────────────────────
-- The SPA only holds the anon key, so auth.users (and its email_confirmed_at)
-- is not readable from the client. Mirror the bits admins need onto profiles,
-- keep an explicit admin override flag, and expose one audited RPC to flip it.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified_override BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified_overridden_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified_overridden_at TIMESTAMPTZ;

-- Single source of truth for "is this email good enough": either GoTrue
-- confirmed it, or an admin said so.
ALTER TABLE profiles DROP COLUMN IF EXISTS email_verified;
ALTER TABLE profiles ADD COLUMN email_verified BOOLEAN
  GENERATED ALWAYS AS (email_verified_at IS NOT NULL OR email_verified_override) STORED;

CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON profiles(email_verified);

-- Backfill existing rows from auth.users.
UPDATE profiles p
SET email           = u.email,
    email_verified_at = u.email_confirmed_at
FROM auth.users u
WHERE u.id = p.id
  AND (p.email IS DISTINCT FROM u.email
       OR p.email_verified_at IS DISTINCT FROM u.email_confirmed_at);

-- ─── TRIGGERS ─────────────────────────────────────────────────────────────────
-- Carry the email + confirmation state onto the profile at signup time.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, company_name, role, subscription_status, email, email_verified_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'hr'),
    'pending',
    NEW.email,
    NEW.email_confirmed_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Keep it in sync afterwards (email change, or the user clicking the link).
CREATE OR REPLACE FUNCTION public.sync_profile_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email             = NEW.email,
      email_verified_at = NEW.email_confirmed_at
  WHERE id = NEW.id
    AND (email IS DISTINCT FROM NEW.email
         OR email_verified_at IS DISTINCT FROM NEW.email_confirmed_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email, email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email_verification();

-- ─── ADMIN OVERRIDE ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_set_email_verified(target_user_id UUID, verified BOOLEAN)
RETURNS void AS $$
DECLARE
  actor UUID := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = actor AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  UPDATE public.profiles
  SET email_verified_override      = verified,
      email_verified_overridden_by = CASE WHEN verified THEN actor ELSE NULL END,
      email_verified_overridden_at = CASE WHEN verified THEN NOW() ELSE NULL END
  WHERE id = target_user_id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor,
    CASE WHEN verified
      THEN 'email_verification_overridden'
      ELSE 'email_verification_override_revoked'
    END,
    'profile',
    target_user_id,
    jsonb_build_object('verified', verified, 'source', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION admin_set_email_verified(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_email_verified(UUID, BOOLEAN) TO authenticated;

-- Keep the mirrored columns and the override flag behind the RPC, so the audit
-- trail can't be skipped with a plain .update() from the client.
REVOKE UPDATE (email, email_verified_at, email_verified_override,
               email_verified_overridden_by, email_verified_overridden_at)
  ON public.profiles FROM authenticated;
