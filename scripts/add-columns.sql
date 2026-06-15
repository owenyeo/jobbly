-- SQL commands to add notes and interview_date to job_applications table.
-- Copy and paste this script directly into your Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/cqdrfnosqkslqgrfnfca/sql/new)

ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS interview_date timestamp with time zone;
