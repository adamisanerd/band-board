-- Band Board schema.
-- Every band-owned table carries band_id so row-level security (RLS) can check membership,
-- and so realtime subscriptions can filter to one band.

-- ---------- tables ----------

create table public.bands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  -- Shared in invite links. 12 hex chars from a v4 UUID.
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_at  timestamptz not null default now()
);

create table public.members (
  id         uuid primary key default gen_random_uuid(),
  band_id    uuid not null references public.bands on delete cascade,
  -- Null until a person signs in and claims this spot on the lineup.
  user_id    uuid references auth.users on delete set null,
  name       text not null check (char_length(name) between 1 and 60),
  role       text not null default '' check (char_length(role) <= 60),
  venmo      text not null default '' check (char_length(venmo) <= 30),
  cashtag    text not null default '' check (char_length(cashtag) <= 20),
  phone      text not null default '' check (char_length(phone) <= 24),
  pref_pay   text not null default '' check (pref_pay in ('', 'venmo', 'cashapp', 'applecash')),
  created_at timestamptz not null default now(),
  unique (band_id, user_id)
);

create table public.dates (
  id         uuid primary key default gen_random_uuid(),
  band_id    uuid not null references public.bands on delete cascade,
  day        date not null,
  start_time time,
  kind       text not null default 'Rehearsal' check (kind in ('Rehearsal', 'Gig', 'Either')),
  note       text not null default '' check (char_length(note) <= 200),
  booked     boolean not null default false,
  created_by uuid references public.members on delete set null,
  created_at timestamptz not null default now()
);

create table public.votes (
  date_id   uuid not null references public.dates on delete cascade,
  member_id uuid not null references public.members on delete cascade,
  band_id   uuid not null references public.bands on delete cascade,
  vote      text not null check (vote in ('yes', 'maybe', 'no')),
  primary key (date_id, member_id)
);

create table public.venues (
  id           uuid primary key default gen_random_uuid(),
  band_id      uuid not null references public.bands on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  address      text not null default '',
  contact_name text not null default '',
  phone        text not null default '',
  email        text not null default '',
  notes        text not null default '',
  created_at   timestamptz not null default now()
);

create table public.gigs (
  id           uuid primary key default gen_random_uuid(),
  band_id      uuid not null references public.bands on delete cascade,
  venue_id     uuid references public.venues on delete set null,
  venue_name   text not null check (char_length(venue_name) between 1 and 120),
  day          date not null,
  load_in      time,
  set_time     time,
  address      text not null default '',
  contact_name text not null default '',
  phone        text not null default '',
  email        text not null default '',
  pay          numeric(10, 2) not null default 0 check (pay >= 0),
  expenses     numeric(10, 2) not null default 0 check (expenses >= 0),
  collector_id uuid references public.members on delete set null,
  notes        text not null default '',
  from_date_id uuid references public.dates on delete set null,
  created_at   timestamptz not null default now()
);

create table public.gear_items (
  id        uuid primary key default gen_random_uuid(),
  band_id   uuid not null references public.bands on delete cascade,
  gig_id    uuid not null references public.gigs on delete cascade,
  item      text not null check (char_length(item) between 1 and 80),
  member_id uuid references public.members on delete set null,
  position  int not null default 0
);

-- One row per member who has been paid their share of a gig.
create table public.gig_payments (
  gig_id    uuid not null references public.gigs on delete cascade,
  member_id uuid not null references public.members on delete cascade,
  band_id   uuid not null references public.bands on delete cascade,
  paid_at   timestamptz not null default now(),
  primary key (gig_id, member_id)
);

create table public.setlists (
  id         uuid primary key default gen_random_uuid(),
  band_id    uuid not null references public.bands on delete cascade,
  gig_id     uuid unique references public.gigs on delete set null,
  name       text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.setlist_songs (
  id         uuid primary key default gen_random_uuid(),
  band_id    uuid not null references public.bands on delete cascade,
  setlist_id uuid not null references public.setlists on delete cascade,
  position   int not null default 0,
  title      text not null check (char_length(title) between 1 and 120),
  song_key   text not null default '' check (char_length(song_key) <= 12),
  bpm        int check (bpm between 1 and 300),
  notes      text not null default '' check (char_length(notes) <= 200)
);

create index on public.members (user_id);
create index on public.dates (band_id, day);
create index on public.votes (band_id);
create index on public.gigs (band_id, day);
create index on public.venues (band_id);
create index on public.gear_items (gig_id);
create index on public.gig_payments (band_id);
create index on public.setlists (band_id);
create index on public.setlist_songs (setlist_id, position);

-- ---------- membership helpers ----------

-- True when the signed-in user is on band b's lineup. SECURITY DEFINER so policies on
-- members can call it without recursing into members' own policies.
create function public.is_member(b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.band_id = b and m.user_id = auth.uid());
$$;

-- The signed-in user's member id in band b, or null.
create function public.my_member_id(b uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id from public.members m where m.band_id = b and m.user_id = auth.uid();
$$;

-- ---------- row-level security ----------

alter table public.bands         enable row level security;
alter table public.members       enable row level security;
alter table public.dates         enable row level security;
alter table public.votes         enable row level security;
alter table public.venues        enable row level security;
alter table public.gigs          enable row level security;
alter table public.gear_items    enable row level security;
alter table public.gig_payments  enable row level security;
alter table public.setlists      enable row level security;
alter table public.setlist_songs enable row level security;

-- Bands are created through create_band() so the creator is added in the same step.
create policy "members read their band" on public.bands for select to authenticated using (public.is_member(id));
create policy "members rename their band" on public.bands for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

-- Any bandmate can manage the lineup, as in the original board.
create policy "bandmates manage lineup" on public.members for all to authenticated
  using (public.is_member(band_id)) with check (public.is_member(band_id));

-- You can only cast or change your own vote.
create policy "bandmates read votes" on public.votes for select to authenticated using (public.is_member(band_id));
create policy "vote as yourself" on public.votes for insert to authenticated
  with check (public.is_member(band_id) and member_id = public.my_member_id(band_id));
create policy "change your vote" on public.votes for update to authenticated
  using (member_id = public.my_member_id(band_id)) with check (member_id = public.my_member_id(band_id));
create policy "take back your vote" on public.votes for delete to authenticated
  using (member_id = public.my_member_id(band_id));

-- Everything else: any bandmate can read and change it.
do $$
declare t text;
begin
  foreach t in array array['dates', 'venues', 'gigs', 'gear_items', 'gig_payments', 'setlists', 'setlist_songs'] loop
    execute format(
      'create policy "bandmates manage %1$s" on public.%1$I for all to authenticated using (public.is_member(band_id)) with check (public.is_member(band_id))', t);
  end loop;
end $$;

-- ---------- functions the app calls ----------

-- Creates a band and its lineup, and puts the caller on it as lineup[me].
-- lineup is a JSON array of {"name": "...", "role": "..."}.
create function public.create_band(band_name text, lineup jsonb, me int) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  new_band uuid;
  i int := 0;
  person jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if jsonb_typeof(lineup) <> 'array' or jsonb_array_length(lineup) = 0 then raise exception 'Add at least one person'; end if;
  if me < 0 or me >= jsonb_array_length(lineup) then raise exception 'Pick which one is you'; end if;

  insert into public.bands (name) values (trim(band_name)) returning id into new_band;
  for person in select * from jsonb_array_elements(lineup) loop
    insert into public.members (band_id, name, role, user_id)
    values (new_band, trim(person->>'name'), coalesce(trim(person->>'role'), ''), case when i = me then auth.uid() end);
    i := i + 1;
  end loop;
  return new_band;
end $$;

-- What someone opening an invite link sees before joining: the band name and who's
-- on the lineup, so they can pick themselves.
create function public.band_preview(code text)
returns table (band_id uuid, band_name text, member_id uuid, member_name text, member_role text, claimed boolean)
language sql stable security definer set search_path = '' as $$
  select b.id, b.name, m.id, m.name, m.role, m.user_id is not null
  from public.bands b left join public.members m on m.band_id = b.id
  where b.invite_code = code
  order by m.created_at;
$$;

-- Joins the band behind an invite code, either by claiming an unclaimed lineup spot
-- (member) or by adding a new person (new_name). Returns the band id.
create function public.join_band(code text, member uuid default null, new_name text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  b uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select id into b from public.bands where invite_code = code;
  if b is null then raise exception 'That invite link is not valid'; end if;
  if exists (select 1 from public.members where band_id = b and user_id = auth.uid()) then return b; end if;

  if member is not null then
    update public.members set user_id = auth.uid() where id = member and band_id = b and user_id is null;
    if not found then raise exception 'Someone already signed in as that person'; end if;
  elsif coalesce(trim(new_name), '') <> '' then
    insert into public.members (band_id, name, user_id) values (b, trim(new_name), auth.uid());
  else
    raise exception 'Pick your name or add yourself';
  end if;
  return b;
end $$;

-- Only signed-in users can call these (functions are executable by everyone by default).
revoke execute on function public.create_band, public.band_preview, public.join_band,
  public.is_member, public.my_member_id from public, anon;
grant execute on function public.create_band, public.band_preview, public.join_band,
  public.is_member, public.my_member_id to authenticated;

-- ---------- realtime ----------

-- Stream changes to signed-in clients (RLS still decides which rows each person receives).
alter publication supabase_realtime add table
  public.bands, public.members, public.dates, public.votes, public.venues, public.gigs,
  public.gear_items, public.gig_payments, public.setlists, public.setlist_songs;
