-- ─── MAKE THE OVERRIDE ACTUALLY UNLOCK LOGIN ───────────────────────────────────
-- The first pass stored the override on profiles only. That is cosmetic:
-- GoTrue rejects sign-in with "Email not confirmed" before any profile column
-- is read, so an admin override did not actually let anyone in.
--
-- The override now writes auth.users.email_confirmed_at directly. The
-- sync_profile_email_verification trigger (installed in
-- 20260929010000_profile_email_verification.sql) mirrors it back onto
-- profiles.email_verified_at, so the UI stays in step for free.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_verified_prev_confirmed_at TIMESTAMPTZ;

-- Reconcile rows the admin already overrode under the old, cosmetic-only RPC:
-- their profiles flag says verified but auth.users was never touched, so they
-- are still locked out. The trigger mirrors the result back onto profiles.
UPDATE auth.users u
SET email_confirmed_at = NOW()
FROM public.profiles p
WHERE p.id = u.id
  AND p.email_verified_override
  AND p.email_verified_at IS NULL
  AND u.email_confirmed_at IS NULL;

CREATE OR REPLACE FUNCTION admin_set_email_verified(target_user_id UUID, verified BOOLEAN)
RETURNS void AS $$
DECLARE
  actor            UUID := auth.uid();
  current_confirmed TIMESTAMPTZ;
  previous_confirmed TIMESTAMPTZ;
  restore          TIMESTAMPTZ;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = actor AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT u.email_confirmed_at, p.email_verified_prev_confirmed_at
    INTO current_confirmed, previous_confirmed
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE u.id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  IF verified THEN
    -- Never clobber a real confirmation, and remember the pre-override value so
    -- revoking puts the user back exactly where they were.
    restore := current_confirmed;
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = target_user_id;
  ELSE
    -- Undo only what the override added.
    restore := previous_confirmed;
    UPDATE auth.users
    SET email_confirmed_at = previous_confirmed
    WHERE id = target_user_id;
  END IF;

  UPDATE public.profiles
  SET email_verified_override         = verified,
      email_verified_overridden_by    = CASE WHEN verified THEN actor ELSE NULL END,
      email_verified_overridden_at    = CASE WHEN verified THEN NOW() ELSE NULL END,
      email_verified_prev_confirmed_at = CASE WHEN verified THEN restore ELSE NULL END
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
    jsonb_build_object(
      'verified', verified,
      'source', 'admin',
      'auth_user_confirmed_at', CASE WHEN verified
        THEN COALESCE(current_confirmed, NOW())
        ELSE previous_confirmed
      END
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION admin_set_email_verified(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_email_verified(UUID, BOOLEAN) TO authenticated;

REVOKE UPDATE (email_verified_prev_confirmed_at) ON public.profiles FROM authenticated;
