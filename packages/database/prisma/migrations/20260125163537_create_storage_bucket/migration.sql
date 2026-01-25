-- 1. Create the 'files' bucket (Private)
insert into storage.buckets (id, name, public)
values ('files', 'files', false) -- 'false' means NO public access allowed
on conflict (id) do nothing;

-- Security Hardening: Enable RLS on all tables
-- This effectively blocks all public access via the Supabase API
-- while allowing Prisma (superuser) to continue working.

alter table "user" enable row level security;
alter table "session" enable row level security;
alter table "account" enable row level security;
alter table "verification" enable row level security;
alter table "notebook" enable row level security;
alter table "message" enable row level security;

-- The 'file' table (mapped from Source model)
alter table "file" enable row level security;

-- Even the migration table should be locked (good practice)
alter table "_prisma_migrations" enable row level security;