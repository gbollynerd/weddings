-- The app talks to Postgres from trusted server code and enforces role permissions in
-- src/lib/permissions.ts + the service layer. Enabling RLS with no public policies makes
-- sure Supabase's auto-generated REST API (anon key) cannot read or write these tables.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
