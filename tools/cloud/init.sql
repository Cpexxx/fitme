-- Role i schematy jak w projekcie Supabase (tylko do lokalnych testów; w Supabase to wszystko już istnieje).
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login password 'dev' noinherit;
grant anon, authenticated, service_role to authenticator;
create role supabase_auth_admin login password 'dev' createrole noinherit;
create schema auth authorization supabase_auth_admin;
grant usage on schema auth to anon, authenticated, service_role, postgres;
alter role supabase_auth_admin set search_path = auth;
grant usage on schema public to anon, authenticated, service_role;
grant create on schema public to supabase_auth_admin;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
