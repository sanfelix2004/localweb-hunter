-- LocalWeb Hunter — Schema PostgreSQL per Supabase
-- Equivalente a prisma/schema.prisma (per deploy in produzione).
-- Esegui nel SQL Editor di Supabase, poi in prisma/schema.prisma
-- imposta provider = "postgresql" e lancia `npx prisma db pull`.

create table if not exists "Scan" (
  id            text primary key default gen_random_uuid()::text,
  query         text not null,
  category      text not null,
  lat           double precision not null,
  lon           double precision not null,
  radius        integer not null,
  "resultCount" integer not null default 0,
  "createdAt"   timestamptz not null default now()
);

create table if not exists "Lead" (
  id             text primary key default gen_random_uuid()::text,
  "osmId"        text unique,
  name           text not null,
  category       text not null,
  address        text,
  phone          text,
  email          text,
  website        text,
  "socialLinks"  jsonb,
  lat            double precision,
  lon            double precision,
  "hasWebsite"   boolean not null default false,
  "healthScore"  integer check ("healthScore" between 0 and 100),
  "healthFlags"  jsonb,
  "healthDetail" jsonb,
  status         text not null default 'NEW'
                 check (status in ('NEW','ANALYZED','CONTACTED','WON','DISCARDED')),
  "pitchEmail"   text,
  "pitchWhatsapp" text,
  "analyzedAt"   timestamptz,
  "contactedAt"  timestamptz,
  "createdAt"    timestamptz not null default now(),
  "updatedAt"    timestamptz not null default now(),
  "scanId"       text references "Scan"(id) on delete set null
);

create index if not exists lead_health_score_idx on "Lead" ("healthScore");
create index if not exists lead_category_idx     on "Lead" (category);
create index if not exists lead_status_idx       on "Lead" (status);

-- updatedAt automatico
create or replace function set_updated_at() returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists lead_updated_at on "Lead";
create trigger lead_updated_at
  before update on "Lead"
  for each row execute function set_updated_at();
