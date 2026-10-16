-- =====================================================================================================
-- Fitme: konta, profile i społeczność (baza Supabase / PostgreSQL 15+)
-- Jak użyć: Supabase -> SQL Editor -> New query -> wklej CAŁY plik -> Run.
-- Skrypt można uruchomić ponownie (np. po aktualizacji): tabele i dane zostają, funkcje i reguły się odświeżają.
--
-- Bezpieczeństwo: każda tabela ma Row Level Security. Przeglądarka dostaje tylko klucz "anon" (publiczny z założenia),
-- a o tym, kto co widzi i może zmienić, decydują reguły poniżej - nie kod aplikacji.
-- =====================================================================================================

create schema if not exists fitme_private;
grant usage on schema fitme_private to anon, authenticated;

-- ---------- tabele ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null default '',
  bio text not null default '',
  website text not null default '',
  avatar text,
  is_private boolean not null default false,
  comments text not null default 'all',
  confirmed boolean not null default false,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  fits_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_key unique (username),
  constraint profiles_username_check check (username ~ '^[a-z0-9][a-z0-9._]{1,22}[a-z0-9]$' and username !~ '[._]{2}'),
  constraint profiles_display_name_check check (char_length(display_name) <= 40),
  constraint profiles_bio_check check (char_length(bio) <= 160),
  constraint profiles_website_check check (website = '' or (website ~* '^https?://[^\s<>"]+$' and char_length(website) <= 100)),
  constraint profiles_avatar_check check (avatar is null or (avatar ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' and octet_length(avatar) <= 120000)),
  constraint profiles_comments_check check (comments in ('all', 'followers', 'none'))
);

create table if not exists public.user_settings (
  id uuid primary key references public.profiles(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  history_on boolean not null default true,
  default_visibility text not null default 'public',
  updated_at timestamptz not null default now(),
  constraint user_settings_prefs_check check (jsonb_typeof(prefs) = 'object' and octet_length(prefs::text) <= 8000),
  constraint user_settings_visibility_check check (default_visibility in ('public', 'followers', 'private'))
);

create table if not exists public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  doc text not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  constraint consents_doc_check check (doc in ('terms', 'privacy', 'age')),
  constraint consents_version_check check (char_length(version) <= 20),
  constraint consents_unique unique (user_id, doc, version)
);

create table if not exists public.fits (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid(),
  name text not null,
  description text not null default '',
  state jsonb not null,
  thumb text,
  tags text[] not null default '{}',
  visibility text not null default 'public',
  remix_of uuid,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fits_owner_fkey foreign key (owner) references public.profiles(id) on delete cascade,
  constraint fits_remix_of_fkey foreign key (remix_of) references public.fits(id) on delete set null,
  constraint fits_name_check check (char_length(btrim(name)) between 1 and 40),
  constraint fits_description_check check (char_length(description) <= 300),
  constraint fits_state_check check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 30000),
  constraint fits_thumb_check check (thumb is null or (thumb ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' and octet_length(thumb) <= 250000)),
  constraint fits_tags_check check (cardinality(tags) <= 12),
  constraint fits_visibility_check check (visibility in ('public', 'followers', 'private'))
);
create index if not exists fits_created_idx on public.fits (created_at desc);
create index if not exists fits_owner_idx on public.fits (owner, created_at desc);
create index if not exists fits_popular_idx on public.fits (likes_count desc, created_at desc);

create table if not exists public.likes (
  user_id uuid not null default auth.uid(),
  fit_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, fit_id),
  constraint likes_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint likes_fit_id_fkey foreign key (fit_id) references public.fits(id) on delete cascade
);
create index if not exists likes_fit_idx on public.likes (fit_id);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  fit_id uuid not null,
  user_id uuid not null default auth.uid(),
  body text not null,
  created_at timestamptz not null default now(),
  constraint comments_fit_id_fkey foreign key (fit_id) references public.fits(id) on delete cascade,
  constraint comments_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint comments_body_check check (char_length(btrim(body)) between 1 and 500)
);
create index if not exists comments_fit_idx on public.comments (fit_id, created_at);
create index if not exists comments_user_idx on public.comments (user_id, created_at desc);

create table if not exists public.follows (
  follower uuid not null default auth.uid(),
  followee uuid not null,
  status text not null default 'accepted',
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  constraint follows_follower_fkey foreign key (follower) references public.profiles(id) on delete cascade,
  constraint follows_followee_fkey foreign key (followee) references public.profiles(id) on delete cascade,
  constraint follows_self_check check (follower <> followee),
  constraint follows_status_check check (status in ('accepted', 'pending'))
);
create index if not exists follows_followee_idx on public.follows (followee, status);

create table if not exists public.blocks (
  blocker uuid not null default auth.uid(),
  blocked uuid not null,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  constraint blocks_blocker_fkey foreign key (blocker) references public.profiles(id) on delete cascade,
  constraint blocks_blocked_fkey foreign key (blocked) references public.profiles(id) on delete cascade,
  constraint blocks_self_check check (blocker <> blocked)
);
create index if not exists blocks_blocked_idx on public.blocks (blocked);

-- zgłoszenia treści (DSA art. 16): może je wysłać każdy, także osoba bez konta (wtedy z adresem e-mail)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid default auth.uid(),
  reporter_email text,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text not null default '',
  good_faith boolean not null default false,
  status text not null default 'open',
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint reports_reporter_fkey foreign key (reporter) references public.profiles(id) on delete set null,
  constraint reports_type_check check (target_type in ('fit', 'comment', 'profile')),
  constraint reports_reason_check check (reason in ('illegal', 'hate', 'harassment', 'nudity', 'violence', 'spam', 'ip', 'impersonation', 'minor', 'other')),
  constraint reports_details_check check (char_length(details) <= 1000),
  constraint reports_email_check check (reporter_email is null or (reporter_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(reporter_email) <= 120)),
  constraint reports_status_check check (status in ('open', 'resolved', 'rejected')),
  constraint reports_good_faith_check check (good_faith)
);
-- zgłoszenie zostaje po usunięciu konta zgłaszającego (reporter = null), dlatego „kto” sprawdza reguła insert, nie constraint
alter table public.reports drop constraint if exists reports_who_check;
create index if not exists reports_status_idx on public.reports (status, created_at);

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  actor uuid not null,
  kind text not null,
  fit_id uuid,
  comment_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint notifications_actor_fkey foreign key (actor) references public.profiles(id) on delete cascade,
  constraint notifications_fit_id_fkey foreign key (fit_id) references public.fits(id) on delete cascade,
  constraint notifications_comment_id_fkey foreign key (comment_id) references public.comments(id) on delete cascade,
  constraint notifications_kind_check check (kind in ('follow', 'follow_request', 'follow_accept', 'like', 'comment'))
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- historia oglądania (otwarte fity); ref = id fitu z bazy albo id przykładowej stylizacji
create table if not exists public.history (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  ref text not null,
  name text not null default '',
  seen_at timestamptz not null default now(),
  constraint history_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint history_ref_check check (char_length(ref) between 1 and 64),
  constraint history_name_check check (char_length(name) <= 40),
  constraint history_unique unique (user_id, ref)
);
create index if not exists history_user_idx on public.history (user_id, seen_at desc);

-- historia konta: założenie, logowania, zmiany e-maila, hasła, nazwy, prywatności, zgody
create table if not exists public.account_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  kind text not null,
  detail jsonb not null default '{}'::jsonb,
  at timestamptz not null default now(),
  constraint account_events_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade
);
create index if not exists account_events_user_idx on public.account_events (user_id, at desc);

-- ---------- funkcje pomocnicze (schemat niewystawiony przez API; zawsze względem zalogowanego) ----------
create or replace function fitme_private.blocked_with(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocks b
    where (b.blocker = auth.uid() and b.blocked = target) or (b.blocker = target and b.blocked = auth.uid()));
$$;

-- czy ta osoba zablokowała mnie (wtedy jej profil znika; ja widzę profile osób, które sam blokuję, żeby móc je odblokować)
create or replace function fitme_private.blocked_me(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocks b where b.blocker = target and b.blocked = auth.uid());
$$;

create or replace function fitme_private.i_follow(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.follows f where f.follower = auth.uid() and f.followee = target and f.status = 'accepted');
$$;

-- czy zalogowany widzi treści (fity, listy obserwujących) danej osoby
create or replace function fitme_private.can_view_content(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select target = auth.uid() or (
    not fitme_private.blocked_with(target)
    and coalesce((select not p.is_private and p.confirmed from public.profiles p where p.id = target), false)
  ) or (
    not fitme_private.blocked_with(target) and fitme_private.i_follow(target)
  );
$$;

create or replace function fitme_private.can_view_fit(owner uuid, visibility text) returns boolean
language sql stable security definer set search_path = '' as $$
  select owner = auth.uid() or (
    visibility <> 'private'
    and not fitme_private.blocked_with(owner)
    and case when visibility = 'public' then fitme_private.can_view_content(owner) else fitme_private.i_follow(owner) end
  );
$$;

create or replace function fitme_private.can_comment(fid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.fits f join public.profiles p on p.id = f.owner
    where f.id = fid and fitme_private.can_view_fit(f.owner, f.visibility)
      and (f.owner = auth.uid() or p.comments = 'all' or (p.comments = 'followers' and fitme_private.i_follow(f.owner)))
  );
$$;

-- prosty limit nadużyć: najwyżej n wierszy w ciągu godziny od jednej osoby
create or replace function fitme_private.rate_limit(tbl text, n integer) returns void
language plpgsql security definer set search_path = '' as $$
declare c integer;
begin
  if auth.uid() is null then return; end if;
  execute format('select count(*) from public.%I where %I = $1 and %I > now() - interval ''1 hour''', tbl,
    case tbl when 'fits' then 'owner' when 'reports' then 'reporter' when 'follows' then 'follower' else 'user_id' end,
    case tbl when 'history' then 'seen_at' else 'created_at' end) into c using auth.uid();
  if c >= n then raise exception 'Za dużo działań w krótkim czasie. Spróbuj ponownie za jakiś czas.' using errcode = 'P0001', hint = 'rate_limit'; end if;
end $$;

create or replace function fitme_private.log_event(uid uuid, k text, d jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = uid) then return; end if;
  insert into public.account_events (user_id, kind, detail) values (uid, k, d);
  delete from public.account_events where user_id = uid and id not in
    (select id from public.account_events where user_id = uid order by at desc limit 200);
end $$;

-- ---------- nowe konto: profil, ustawienia i zgody z danych podanych przy rejestracji ----------
create or replace function fitme_private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); u text;
begin
  u := lower(coalesce(m->>'username', ''));
  if u = '' then u := 'user' || substr(replace(new.id::text, '-', ''), 1, 10); end if;
  if fitme_private.username_reserved(u) then raise exception 'username_reserved'; end if;
  insert into public.profiles (id, username, display_name, confirmed)
    values (new.id, u, left(coalesce(m->>'display_name', ''), 40), new.email_confirmed_at is not null);
  insert into public.user_settings (id) values (new.id);
  if m ? 'terms_version' then insert into public.consents (user_id, doc, version) values (new.id, 'terms', left(m->>'terms_version', 20)); end if;
  if m ? 'privacy_version' then insert into public.consents (user_id, doc, version) values (new.id, 'privacy', left(m->>'privacy_version', 20)); end if;
  if coalesce((m->>'age_confirmed')::boolean, false) then insert into public.consents (user_id, doc, version) values (new.id, 'age', '16+'); end if;
  perform fitme_private.log_event(new.id, 'created');
  return new;
end $$;

create or replace function fitme_private.handle_user_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles set confirmed = true where id = new.id;
  end if;
  if new.email is distinct from old.email and old.email is not null then perform fitme_private.log_event(new.id, 'email_changed'); end if;
  if new.encrypted_password is distinct from old.encrypted_password and old.encrypted_password is not null and old.encrypted_password <> '' then
    perform fitme_private.log_event(new.id, 'password_changed'); end if;
  if new.last_sign_in_at is distinct from old.last_sign_in_at and new.last_sign_in_at is not null then perform fitme_private.log_event(new.id, 'sign_in'); end if;
  return new;
end $$;

create or replace function fitme_private.username_reserved(u text) returns boolean
language sql immutable set search_path = '' as $$
  select u in ('admin', 'administrator', 'root', 'fitme', 'fit.me', 'support', 'pomoc', 'help', 'moderator', 'mod', 'staff', 'team',
               'system', 'official', 'oficjalne', 'null', 'undefined', 'me', 'settings', 'ustawienia', 'login', 'signup', 'konto', 'api');
$$;

drop trigger if exists fitme_on_auth_user_created on auth.users;
create trigger fitme_on_auth_user_created after insert on auth.users for each row execute function fitme_private.handle_new_user();
drop trigger if exists fitme_on_auth_user_updated on auth.users;
create trigger fitme_on_auth_user_updated after update on auth.users for each row execute function fitme_private.handle_user_update();

-- ---------- spójność i liczniki ----------
create or replace function fitme_private.touch() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

create or replace function fitme_private.profile_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  if new.username is distinct from old.username then
    new.username := lower(new.username);
    if fitme_private.username_reserved(new.username) then raise exception 'username_reserved' using errcode = 'P0001', hint = 'username_reserved'; end if;
    perform fitme_private.log_event(new.id, 'username_changed', jsonb_build_object('from', old.username, 'to', new.username));
  end if;
  if new.is_private is distinct from old.is_private then
    perform fitme_private.log_event(new.id, 'privacy_changed', jsonb_build_object('private', new.is_private));
  end if;
  return new;
end $$;

-- konto przestało być prywatne: oczekujące prośby o obserwowanie są akceptowane
create or replace function fitme_private.profile_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.is_private and not new.is_private then
    update public.follows set status = 'accepted' where followee = new.id and status = 'pending';
  end if;
  return null;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles for each row execute function fitme_private.profile_guard();
drop trigger if exists profiles_after on public.profiles;
create trigger profiles_after after update of is_private on public.profiles for each row execute function fitme_private.profile_after();
drop trigger if exists settings_touch on public.user_settings;
create trigger settings_touch before update on public.user_settings for each row execute function fitme_private.touch();

create or replace function fitme_private.fits_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform fitme_private.rate_limit('fits', 60);
    new.owner := auth.uid(); new.likes_count := 0; new.comments_count := 0; new.created_at := now();
  else
    new.id := old.id; new.owner := old.owner; new.created_at := old.created_at; new.remix_of := old.remix_of;
    if pg_trigger_depth() <= 1 then new.likes_count := old.likes_count; new.comments_count := old.comments_count; end if;
  end if;
  new.name := btrim(new.name);
  new.updated_at := now();
  return new;
end $$;

create or replace function fitme_private.fits_count() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o uuid := coalesce(new.owner, old.owner);
begin
  update public.profiles set fits_count = (select count(*) from public.fits where owner = o and visibility <> 'private') where id = o;
  return null;
end $$;

drop trigger if exists fits_before on public.fits;
create trigger fits_before before insert or update on public.fits for each row execute function fitme_private.fits_before();
drop trigger if exists fits_count on public.fits;
create trigger fits_count after insert or delete or update of visibility on public.fits for each row execute function fitme_private.fits_count();

create or replace function fitme_private.likes_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare f uuid := coalesce(new.fit_id, old.fit_id); o uuid;
begin
  update public.fits set likes_count = (select count(*) from public.likes where fit_id = f) where id = f returning owner into o;
  if tg_op = 'INSERT' then
    if o is not null and o <> new.user_id then
      delete from public.notifications where user_id = o and actor = new.user_id and kind = 'like' and fit_id = f;
      insert into public.notifications (user_id, actor, kind, fit_id) values (o, new.user_id, 'like', f);
    end if;
  else
    delete from public.notifications where actor = old.user_id and kind = 'like' and fit_id = f;
  end if;
  return null;
end $$;

create or replace function fitme_private.likes_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform fitme_private.rate_limit('likes', 300); new.user_id := auth.uid(); new.created_at := now(); return new; end $$;

drop trigger if exists likes_before on public.likes;
create trigger likes_before before insert on public.likes for each row execute function fitme_private.likes_before();
drop trigger if exists likes_after on public.likes;
create trigger likes_after after insert or delete on public.likes for each row execute function fitme_private.likes_after();

create or replace function fitme_private.comments_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform fitme_private.rate_limit('comments', 40); new.user_id := auth.uid(); new.body := btrim(new.body); new.created_at := now(); return new; end $$;

create or replace function fitme_private.comments_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare f uuid := coalesce(new.fit_id, old.fit_id); o uuid;
begin
  update public.fits set comments_count = (select count(*) from public.comments where fit_id = f) where id = f returning owner into o;
  if tg_op = 'INSERT' and o is not null and o <> new.user_id then
    insert into public.notifications (user_id, actor, kind, fit_id, comment_id) values (o, new.user_id, 'comment', f, new.id);
  end if;
  return null;
end $$;

drop trigger if exists comments_before on public.comments;
create trigger comments_before before insert on public.comments for each row execute function fitme_private.comments_before();
drop trigger if exists comments_after on public.comments;
create trigger comments_after after insert or delete on public.comments for each row execute function fitme_private.comments_after();

-- obserwowanie: konto prywatne dostaje prośbę, publiczne od razu nowego obserwującego
create or replace function fitme_private.follows_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform fitme_private.rate_limit('follows', 200);
    new.follower := auth.uid(); new.created_at := now();
    if fitme_private.blocked_with(new.followee) then raise exception 'blocked' using errcode = 'P0001', hint = 'blocked'; end if;
    new.status := case when coalesce((select is_private from public.profiles where id = new.followee), false) then 'pending' else 'accepted' end;
  else
    if pg_trigger_depth() <= 1 and (new.follower <> old.follower or new.followee <> old.followee or new.status <> 'accepted') then
      raise exception 'only_accept' using errcode = 'P0001'; end if;
  end if;
  return new;
end $$;

create or replace function fitme_private.follows_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a uuid := coalesce(new.follower, old.follower); b uuid := coalesce(new.followee, old.followee);
begin
  update public.profiles set followers_count = (select count(*) from public.follows where followee = b and status = 'accepted') where id = b;
  update public.profiles set following_count = (select count(*) from public.follows where follower = a and status = 'accepted') where id = a;
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, actor, kind) values (b, a, case when new.status = 'pending' then 'follow_request' else 'follow' end);
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    delete from public.notifications where user_id = b and actor = a and kind = 'follow_request';
    insert into public.notifications (user_id, actor, kind) values (b, a, 'follow');
    insert into public.notifications (user_id, actor, kind) values (a, b, 'follow_accept');
  elsif tg_op = 'DELETE' then
    delete from public.notifications where ((user_id = b and actor = a and kind in ('follow', 'follow_request'))
      or (user_id = a and actor = b and kind = 'follow_accept'));
  end if;
  return null;
end $$;

drop trigger if exists follows_before on public.follows;
create trigger follows_before before insert or update on public.follows for each row execute function fitme_private.follows_before();
drop trigger if exists follows_after on public.follows;
create trigger follows_after after insert or update or delete on public.follows for each row execute function fitme_private.follows_after();

-- zablokowanie zrywa obserwowanie w obie strony
create or replace function fitme_private.blocks_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.follows where (follower = new.blocker and followee = new.blocked) or (follower = new.blocked and followee = new.blocker);
  delete from public.notifications where (user_id = new.blocker and actor = new.blocked) or (user_id = new.blocked and actor = new.blocker);
  return null;
end $$;
create or replace function fitme_private.blocks_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin new.blocker := auth.uid(); new.created_at := now(); return new; end $$;

drop trigger if exists blocks_before on public.blocks;
create trigger blocks_before before insert on public.blocks for each row execute function fitme_private.blocks_before();
drop trigger if exists blocks_after on public.blocks;
create trigger blocks_after after insert on public.blocks for each row execute function fitme_private.blocks_after();

create or replace function fitme_private.reports_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform fitme_private.rate_limit('reports', 20);
  new.reporter := auth.uid(); new.status := 'open'; new.resolution := null; new.resolved_at := null; new.created_at := now();
  if new.reporter is not null then new.reporter_email := null; end if;
  return new;
end $$;
drop trigger if exists reports_before on public.reports;
create trigger reports_before before insert on public.reports for each row execute function fitme_private.reports_before();

create or replace function fitme_private.notifications_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if pg_trigger_depth() <= 1 then
    new.id := old.id; new.user_id := old.user_id; new.actor := old.actor; new.kind := old.kind; new.fit_id := old.fit_id;
    new.comment_id := old.comment_id; new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists notifications_guard on public.notifications;
create trigger notifications_guard before update on public.notifications for each row execute function fitme_private.notifications_guard();

-- historia: tylko gdy włączona w ustawieniach, najwyżej 200 pozycji
create or replace function fitme_private.history_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.user_id := auth.uid(); new.seen_at := now();
  if not coalesce((select history_on from public.user_settings where id = auth.uid()), true) then return null; end if;
  return new;
end $$;
create or replace function fitme_private.history_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.history where user_id = new.user_id and id not in
    (select id from public.history where user_id = new.user_id order by seen_at desc limit 200);
  return null;
end $$;
drop trigger if exists history_before on public.history;
create trigger history_before before insert or update on public.history for each row execute function fitme_private.history_before();
drop trigger if exists history_after on public.history;
create trigger history_after after insert on public.history for each row execute function fitme_private.history_after();

create or replace function fitme_private.consents_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform fitme_private.log_event(new.user_id, 'consent', jsonb_build_object('doc', new.doc, 'version', new.version)); return null; end $$;
drop trigger if exists consents_after on public.consents;
create trigger consents_after after insert on public.consents for each row execute function fitme_private.consents_after();

-- ---------- funkcje dostępne z aplikacji (RPC) ----------
create or replace function public.username_available(name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select lower(name) ~ '^[a-z0-9][a-z0-9._]{1,22}[a-z0-9]$' and lower(name) !~ '[._]{2}'
    and not fitme_private.username_reserved(lower(name))
    and not exists (select 1 from public.profiles where username = lower(name));
$$;

-- fity osób, które obserwuję (strona „Obserwowani”)
create or replace function public.feed_following(lim integer default 24, before timestamptz default null) returns setof public.fits
language sql stable set search_path = '' as $$
  select f.* from public.fits f
  join public.follows w on w.followee = f.owner and w.follower = auth.uid() and w.status = 'accepted'
  where (before is null or f.created_at < before)
  order by f.created_at desc limit least(greatest(lim, 1), 60);
$$;

-- usunięcie konta (RODO art. 17): kasuje użytkownika, a kaskadowo profil, fity, polubienia, komentarze, historię i zgody
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.consents enable row level security;
alter table public.fits enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.history enable row level security;
alter table public.account_events enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (id = auth.uid() or (confirmed and not fitme_private.blocked_me(id)));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists settings_own on public.user_settings;
create policy settings_own on public.user_settings for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists consents_read on public.consents;
create policy consents_read on public.consents for select using (user_id = auth.uid());
drop policy if exists consents_insert on public.consents;
create policy consents_insert on public.consents for insert with check (user_id = auth.uid());

drop policy if exists fits_read on public.fits;
create policy fits_read on public.fits for select using (fitme_private.can_view_fit(owner, visibility));
drop policy if exists fits_insert on public.fits;
create policy fits_insert on public.fits for insert with check (auth.uid() is not null and owner = auth.uid());
drop policy if exists fits_update on public.fits;
create policy fits_update on public.fits for update using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists fits_delete on public.fits;
create policy fits_delete on public.fits for delete using (owner = auth.uid());

drop policy if exists likes_read on public.likes;
create policy likes_read on public.likes for select using (
  exists (select 1 from public.fits f where f.id = fit_id) and (user_id = auth.uid() or not fitme_private.blocked_with(user_id)));
drop policy if exists likes_insert on public.likes;
create policy likes_insert on public.likes for insert with check (user_id = auth.uid() and exists (select 1 from public.fits f where f.id = fit_id));
drop policy if exists likes_delete on public.likes;
create policy likes_delete on public.likes for delete using (user_id = auth.uid());

drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select using (
  exists (select 1 from public.fits f where f.id = fit_id) and (user_id = auth.uid() or not fitme_private.blocked_with(user_id)));
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert with check (user_id = auth.uid() and fitme_private.can_comment(fit_id));
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete using (
  user_id = auth.uid() or exists (select 1 from public.fits f where f.id = fit_id and f.owner = auth.uid()));

drop policy if exists follows_read on public.follows;
create policy follows_read on public.follows for select using (
  follower = auth.uid() or followee = auth.uid()
  or (status = 'accepted' and fitme_private.can_view_content(follower) and fitme_private.can_view_content(followee)));
drop policy if exists follows_insert on public.follows;
create policy follows_insert on public.follows for insert with check (follower = auth.uid());
drop policy if exists follows_update on public.follows;
create policy follows_update on public.follows for update using (followee = auth.uid()) with check (followee = auth.uid());
drop policy if exists follows_delete on public.follows;
create policy follows_delete on public.follows for delete using (follower = auth.uid() or followee = auth.uid());

drop policy if exists blocks_own on public.blocks;
create policy blocks_own on public.blocks for select using (blocker = auth.uid());
drop policy if exists blocks_insert on public.blocks;
create policy blocks_insert on public.blocks for insert with check (blocker = auth.uid());
drop policy if exists blocks_delete on public.blocks;
create policy blocks_delete on public.blocks for delete using (blocker = auth.uid());

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert with check (
  (auth.uid() is not null and reporter = auth.uid()) or (auth.uid() is null and reporter is null and reporter_email is not null));
drop policy if exists reports_read on public.reports;
create policy reports_read on public.reports for select using (reporter = auth.uid());

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for select using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete using (user_id = auth.uid());

drop policy if exists history_own on public.history;
create policy history_own on public.history for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists account_events_read on public.account_events;
create policy account_events_read on public.account_events for select using (user_id = auth.uid());

-- ---------- uprawnienia: tylko to, czego aplikacja potrzebuje (kolumny liczników i właściciela są poza zasięgiem klienta) ----------
revoke all on public.profiles, public.user_settings, public.consents, public.fits, public.likes, public.comments, public.follows,
  public.blocks, public.reports, public.notifications, public.history, public.account_events from anon, authenticated;

grant select on public.profiles, public.fits, public.likes, public.comments, public.follows to anon, authenticated;
grant update (username, display_name, bio, website, avatar, is_private, comments) on public.profiles to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select on public.consents to authenticated;
grant insert (doc, version) on public.consents to authenticated;
grant insert (name, description, state, thumb, tags, visibility, remix_of) on public.fits to authenticated;
grant update (name, description, state, thumb, tags, visibility) on public.fits to authenticated;
grant delete on public.fits to authenticated;
grant insert (fit_id) on public.likes to authenticated;
grant delete on public.likes to authenticated;
grant insert (fit_id, body) on public.comments to authenticated;
grant delete on public.comments to authenticated;
grant insert (followee) on public.follows to authenticated;
grant update (status) on public.follows to authenticated;
grant delete on public.follows to authenticated;
grant select, delete on public.blocks to authenticated;
grant insert (blocked) on public.blocks to authenticated;
grant insert (target_type, target_id, reason, details, good_faith, reporter_email) on public.reports to anon, authenticated;
grant select on public.reports to authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select, delete on public.history to authenticated;
grant insert (ref, name) on public.history to authenticated;
grant update (ref, name) on public.history to authenticated;
grant select on public.account_events to authenticated;

revoke all on all functions in schema fitme_private from public;
grant execute on function fitme_private.blocked_with(uuid), fitme_private.blocked_me(uuid), fitme_private.i_follow(uuid), fitme_private.can_view_content(uuid),
  fitme_private.can_view_fit(uuid, text), fitme_private.can_comment(uuid) to anon, authenticated;
revoke all on function public.username_available(text), public.feed_following(integer, timestamptz), public.delete_my_account() from public, anon, authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.feed_following(integer, timestamptz) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- PostgREST: odśwież opis schematu
notify pgrst, 'reload schema';
