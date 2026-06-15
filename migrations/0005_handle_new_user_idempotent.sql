-- Make private.handle_new_user() re-fire safe (design §13). Supabase can fire
-- on_auth_user_created more than once on identity-link edge cases; a plain INSERT
-- would surface as an opaque duplicate-key 500. ON CONFLICT (id) DO NOTHING makes
-- the re-fire a no-op while preserving the original profile. The app guarantees a
-- non-empty full_name (§3), so the COALESCE('') fallback never silently ships a
-- nameless profile. SECURITY DEFINER + empty search_path are kept verbatim.
--
-- Hand-authored: drizzle-kit can't express this SECURITY DEFINER function, and its
-- RLS-ordering pass is unreliable for trigger DDL (see project memory). CREATE OR
-- REPLACE keeps the existing on_auth_user_created trigger pointed here. This file is
-- ONLY the production function — no test-only helpers (the integration test replays
-- the insert inline instead).
CREATE OR REPLACE FUNCTION private.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, display_name)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
          NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
