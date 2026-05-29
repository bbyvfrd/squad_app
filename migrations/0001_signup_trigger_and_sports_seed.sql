-- Objects Drizzle Kit can't express. Table DDL + RLS policies live in the
-- generated schema migration (0000); this adds a SECURITY DEFINER trigger in a
-- private (non-API-exposed) schema, plus reference seed data.

-- 1. private schema — a SECURITY DEFINER function must NOT live in an API-exposed schema.
CREATE SCHEMA IF NOT EXISTS private;

-- 2. handle_new_user: create a public.profiles row whenever an auth user is created.
--    Keeps profile creation off the client, so profiles needs no INSERT policy.
CREATE OR REPLACE FUNCTION private.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- 3. Seed the 8 fixed sports (idempotent — safe to re-run).
INSERT INTO public.sports (key, name, display_order) VALUES
  ('football',   'Football',      1),
  ('basketball', 'Basketball',    2),
  ('tennis',     'Tennis',        3),
  ('volleyball', 'Volleyball',    4),
  ('padel',      'Padel',         5),
  ('running',    'Running',       6),
  ('gym',        'Gym & Fitness', 7),
  ('swimming',   'Swimming',      8)
ON CONFLICT (key) DO NOTHING;
