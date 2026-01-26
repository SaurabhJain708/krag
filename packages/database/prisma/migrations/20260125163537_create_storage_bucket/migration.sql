-- 1. Create the 'files' bucket (Private)
-- Only create if storage schema exists (Supabase-specific, not in shadow DB)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schema_name = 'storage'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('files', 'files', false) -- 'false' means NO public access allowed
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

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