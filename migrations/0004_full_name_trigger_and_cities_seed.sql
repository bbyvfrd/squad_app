-- Update the signup trigger to populate full_name (added NOT NULL in 0003), and
-- seed the cities lookup. CREATE OR REPLACE keeps the existing on_auth_user_created
-- trigger (migration 0001) pointing at this function.
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
          NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''));
  RETURN NEW;
END;
$$;
--> statement-breakpoint
-- Seed the cities (idempotent — safe to re-run). Azerbaijan-wide; expandable.
INSERT INTO public.cities (key, name, display_order) VALUES
  ('baku',        'Baku',        1),
  ('ganja',       'Ganja',       2),
  ('sumqayit',    'Sumqayit',    3),
  ('mingachevir', 'Mingachevir', 4),
  ('lankaran',    'Lankaran',    5),
  ('shaki',       'Shaki',       6),
  ('yevlakh',     'Yevlakh',     7),
  ('nakhchivan',  'Nakhchivan',  8),
  ('shirvan',     'Shirvan',     9),
  ('khirdalan',   'Khirdalan',   10)
ON CONFLICT (key) DO NOTHING;
