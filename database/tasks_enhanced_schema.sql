-- Enhanced Tasks Schema with Subtasks and Assignment

-- First, alter the site_tasks table to add new columns if they don't exist
ALTER TABLE IF EXISTS site_tasks ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE IF EXISTS site_tasks ADD COLUMN IF NOT EXISTS assigned_user_name VARCHAR(255);
ALTER TABLE IF EXISTS site_tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES site_tasks(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS site_tasks ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE IF EXISTS site_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE IF EXISTS site_tasks ADD COLUMN IF NOT EXISTS is_subtask BOOLEAN DEFAULT false;

-- Create subtasks table for better organization
CREATE TABLE IF NOT EXISTS site_subtasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_task_id UUID NOT NULL REFERENCES site_tasks(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    subtask_name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed
    assigned_to UUID,
    assigned_user_name VARCHAR(255),
    expected_date DATE,
    completed_date DATE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_site_tasks_site_id ON site_tasks(site_id);
CREATE INDEX IF NOT EXISTS idx_site_tasks_assigned_to ON site_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_site_tasks_parent_task_id ON site_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_site_tasks_status ON site_tasks(status);
CREATE INDEX IF NOT EXISTS idx_site_subtasks_parent_task_id ON site_subtasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_site_subtasks_assigned_to ON site_subtasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_site_subtasks_status ON site_subtasks(status);

-- Create trigger to update updated_at for site_tasks
CREATE OR REPLACE FUNCTION update_site_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_site_tasks_updated_at_trigger ON site_tasks;
CREATE TRIGGER update_site_tasks_updated_at_trigger 
    BEFORE UPDATE ON site_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_site_tasks_updated_at();

-- Create trigger to update updated_at for site_subtasks
CREATE OR REPLACE FUNCTION update_site_subtasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_site_subtasks_updated_at_trigger ON site_subtasks;
CREATE TRIGGER update_site_subtasks_updated_at_trigger 
    BEFORE UPDATE ON site_subtasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_site_subtasks_updated_at();
