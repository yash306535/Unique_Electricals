-- =============================================================
-- Migration: expense labour count + transport name
-- Run once in the Supabase SQL Editor of your project.
-- =============================================================

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS labour_count  INTEGER;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS transport_name TEXT;

-- Material sub-type / variant (e.g. Cable -> HT, LT)
ALTER TABLE materials ADD COLUMN IF NOT EXISTS sub_type TEXT;

-- (material_issues already has a `date` column from full_setup.sql,
--  so the material-issue history / inventory out-history need no schema change.)
