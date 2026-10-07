-- ─── ADMIN PROFILE EDIT ───────────────────────────────────────────────────────
-- One audited RPC so the admin users page can edit every editable profile
-- field. Email is REVOKE'd from client updates and sign-in reads
-- auth.users.email, so the email change is applied there first and the
-- sync_profile_email_verification trigger mirrors it onto profiles.

CREATE OR REPLACE FUNCTION admin_update_profile(
  target_user_id        UUID,
  p_full_name           TEXT,
  p_email               TEXT,
  p_company_name        TEXT,
  p_role                public.user_role,
  p_subscription_status public.subscription_status,
  p_bgv_seats_total     INT,
  p_bgv_seats_used      INT
)
RETURNS void AS $$
DECLARE
  actor         UUID := auth.uid();
  prev_email    TEXT;
  prev_snapshot JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = actor AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT u.email INTO prev_email FROM auth.users u WHERE u.id = target_user_id;

  SELECT jsonb_build_object(
    'full_name', p.full_name,
    'email', prev_email,
    'company_name', p.company_name,
    'role', p.role,
    'subscription_status', p.subscription_status,
    'bgv_seats_total', p.bgv_seats_total,
    'bgv_seats_used', p.bgv_seats_used
  ) INTO prev_snapshot
  FROM public.profiles p
  WHERE p.id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  IF p_full_name IS NULL OR btrim(p_full_name) = '' THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  IF p_email IS NULL OR p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'A valid email is required';
  END IF;

  IF p_bgv_seats_total IS NULL OR p_bgv_seats_used IS NULL
     OR p_bgv_seats_total < 0 OR p_bgv_seats_used < 0
     OR p_bgv_seats_used > p_bgv_seats_total THEN
    RAISE EXCEPTION 'Invalid seat counts';
  END IF;

  IF prev_email IS DISTINCT FROM p_email THEN
    BEGIN
      -- Never clobber a real confirmation: the admin is correcting the
      -- address, not un-verifying the user. A pending address gets confirmed
      -- so it can actually sign in — GoTrue sends no confirmation mail for a
      -- server-side email change.
      UPDATE auth.users
      SET email             = p_email,
          email_confirmed_at = COALESCE(email_confirmed_at, NOW())
      WHERE id = target_user_id;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'Another user already uses this email';
    END;
  END IF;

  BEGIN
    UPDATE public.profiles
    SET full_name           = btrim(p_full_name),
        email               = p_email,
        company_name        = NULLIF(btrim(COALESCE(p_company_name, '')), ''),
        role                = p_role,
        subscription_status = p_subscription_status,
        bgv_seats_total     = p_bgv_seats_total,
        bgv_seats_used      = p_bgv_seats_used
    WHERE id = target_user_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'An HR user with this company name already exists';
  END;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor,
    'profile_updated',
    'profile',
    target_user_id,
    jsonb_build_object(
      'source', 'admin',
      'previous', prev_snapshot,
      'full_name', btrim(p_full_name),
      'email', lower(p_email),
      'company_name', NULLIF(btrim(COALESCE(p_company_name, '')), ''),
      'role', p_role,
      'subscription_status', p_subscription_status,
      'bgv_seats_total', p_bgv_seats_total,
      'bgv_seats_used', p_bgv_seats_used
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION admin_update_profile(UUID, TEXT, TEXT, TEXT, public.user_role, public.subscription_status, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_update_profile(UUID, TEXT, TEXT, TEXT, public.user_role, public.subscription_status, INT, INT) TO authenticated;
