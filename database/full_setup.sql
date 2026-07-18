-- =============================================================
-- ConstructionManager — FULL DATABASE SETUP
-- Run this ONCE in the Supabase SQL Editor of your NEW project.
-- (Supabase Dashboard -> SQL Editor -> New query -> paste -> Run)
--
-- Safe to re-run: everything uses IF NOT EXISTS / OR REPLACE.
-- Statements are ordered so foreign keys always resolve.
-- =============================================================

-- Shared trigger function to keep updated_at fresh -----------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- =============================================================
-- 1. USERS
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- 2. SITES
-- =============================================================
CREATE TABLE IF NOT EXISTS sites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255),
    location TEXT,
    start_date DATE,
    estimated_cost NUMERIC(14,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on-hold')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- 3. MATERIALS
-- =============================================================
CREATE TABLE IF NOT EXISTS materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    current_stock NUMERIC(14,3) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- 4. PURCHASES  (references materials)
-- =============================================================
CREATE TABLE IF NOT EXISTS purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    vendor_name VARCHAR(255),
    quantity NUMERIC(14,3) NOT NULL,
    rate NUMERIC(14,2) NOT NULL,
    total_amount NUMERIC(14,2) NOT NULL,
    gst_amount NUMERIC(14,2) DEFAULT 0,
    has_bill BOOLEAN DEFAULT false,
    bill_photo_url TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchases_material_id ON purchases(material_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date        ON purchases(date);

-- =============================================================
-- 5. MATERIAL ISSUES  (references sites + materials)
-- =============================================================
CREATE TABLE IF NOT EXISTS material_issues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    quantity NUMERIC(14,3) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_material_issues_site_id     ON material_issues(site_id);
CREATE INDEX IF NOT EXISTS idx_material_issues_material_id ON material_issues(material_id);

-- =============================================================
-- 6. EXPENSES  (references sites)
-- =============================================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    category VARCHAR(20) CHECK (category IN ('labour', 'transport', 'equipment', 'misc')),
    amount NUMERIC(14,2) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_site_id ON expenses(site_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date    ON expenses(date);

-- =============================================================
-- 7. SITE TASKS  (references sites + self)
-- =============================================================
CREATE TABLE IF NOT EXISTS site_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    task_type VARCHAR(20) CHECK (task_type IN ('approval', 'work', 'follow-up')),
    description TEXT,
    expected_date DATE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    completed_date DATE,
    assigned_to UUID,
    assigned_user_name VARCHAR(255),
    parent_task_id UUID REFERENCES site_tasks(id) ON DELETE CASCADE,
    created_by UUID,
    is_subtask BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_site_tasks_site_id        ON site_tasks(site_id);
CREATE INDEX IF NOT EXISTS idx_site_tasks_assigned_to    ON site_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_site_tasks_parent_task_id ON site_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_site_tasks_status         ON site_tasks(status);

DROP TRIGGER IF EXISTS update_site_tasks_updated_at_trigger ON site_tasks;
CREATE TRIGGER update_site_tasks_updated_at_trigger
    BEFORE UPDATE ON site_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- 8. SITE SUBTASKS  (references site_tasks + sites)
-- =============================================================
CREATE TABLE IF NOT EXISTS site_subtasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_task_id UUID NOT NULL REFERENCES site_tasks(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    subtask_name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    assigned_to UUID,
    assigned_user_name VARCHAR(255),
    expected_date DATE,
    completed_date DATE,
    order_index INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_site_subtasks_parent_task_id ON site_subtasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_site_subtasks_assigned_to    ON site_subtasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_site_subtasks_status         ON site_subtasks(status);

DROP TRIGGER IF EXISTS update_site_subtasks_updated_at_trigger ON site_subtasks;
CREATE TRIGGER update_site_subtasks_updated_at_trigger
    BEFORE UPDATE ON site_subtasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- 9. WORK TYPES + related
-- =============================================================
CREATE TABLE IF NOT EXISTS work_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    work_type_id UUID REFERENCES work_types(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    is_required BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_process_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    work_type_id UUID REFERENCES work_types(id) ON DELETE CASCADE,
    step_name VARCHAR(255) NOT NULL,
    step_description TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_work_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    work_type_id UUID REFERENCES work_types(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(site_id, work_type_id)
);

CREATE TABLE IF NOT EXISTS site_documentation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    work_type_id UUID REFERENCES work_types(id) ON DELETE CASCADE,
    document_id UUID REFERENCES work_documents(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(site_id, work_type_id, document_id)
);

CREATE TABLE IF NOT EXISTS file_desk_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    work_type_id UUID REFERENCES work_types(id) ON DELETE CASCADE,
    current_desk VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_progress')),
    notes TEXT,
    assigned_to VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- 10. PHOTOS  (references tasks/subtasks/sites/users)
-- =============================================================
CREATE TABLE IF NOT EXISTS task_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES site_tasks(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    cloudinary_id TEXT NOT NULL,
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_photos_task_id ON task_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_task_photos_site_id ON task_photos(site_id);

CREATE TABLE IF NOT EXISTS subtask_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subtask_id UUID NOT NULL REFERENCES site_subtasks(id) ON DELETE CASCADE,
    parent_task_id UUID NOT NULL REFERENCES site_tasks(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    cloudinary_id TEXT NOT NULL,
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subtask_photos_subtask_id ON subtask_photos(subtask_id);
CREATE INDEX IF NOT EXISTS idx_subtask_photos_task_id    ON subtask_photos(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_subtask_photos_site_id    ON subtask_photos(site_id);

-- =============================================================
-- 11. SEED DATA — "Meter Installation" work type (optional)
-- =============================================================
INSERT INTO work_types (name, description) VALUES
('Meter Installation', 'New electricity meter installation process')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    meter_work_id UUID;
BEGIN
    SELECT id INTO meter_work_id FROM work_types WHERE name = 'Meter Installation' LIMIT 1;
    IF meter_work_id IS NOT NULL THEN
        INSERT INTO work_documents (work_type_id, document_name, order_index) VALUES
        (meter_work_id, 'A1 Application', 1),
        (meter_work_id, 'All Attached Documents', 2),
        (meter_work_id, 'Survey Report with Wireman Sign', 3),
        (meter_work_id, 'Meter Deposit Charges Receipt', 4),
        (meter_work_id, 'Approved Application From Sub-Div', 5),
        (meter_work_id, 'Technical Feasibility from Section Office', 6),
        (meter_work_id, 'Quotation from Sub-Div', 7),
        (meter_work_id, 'Quotation Payment Receipt', 8),
        (meter_work_id, 'Infratag Removal from Sub-Div/Section Office', 9),
        (meter_work_id, 'Meter Installation Completion', 10)
        ON CONFLICT DO NOTHING;

        INSERT INTO work_process_steps (work_type_id, step_name, step_description, order_index) VALUES
        (meter_work_id, 'A1 Application', 'Submit A1 application form', 1),
        (meter_work_id, 'Attach All Documents', 'Attach all required documents', 2),
        (meter_work_id, 'Survey Report', 'Complete survey report with wireman signature', 3),
        (meter_work_id, 'Pay Meter Deposit', 'Pay meter deposit charges', 4),
        (meter_work_id, 'Sub-Div Approval', 'Get approval from Sub-Division office', 5),
        (meter_work_id, 'Technical Feasibility', 'Make technical feasibility from Section office', 6),
        (meter_work_id, 'Quotation', 'Get quotation from Sub-Div', 7),
        (meter_work_id, 'Payment', 'Make payment of quotation', 8),
        (meter_work_id, 'Remove Infratag', 'Remove infratag from Sub-Div/Section office', 9),
        (meter_work_id, 'Meter Installation', 'Take meter and install at site', 10)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- =============================================================
-- DONE. 16 tables created.
--
-- SECURITY NOTE: Row Level Security (RLS) is intentionally NOT
-- enabled, because the app talks to these tables directly with
-- the public/publishable key and no Supabase Auth. That means
-- anyone with the key can read/write all rows. This matches how
-- the app works today. If you later add Supabase Auth, enable
-- RLS and add policies before shipping.
-- =============================================================
