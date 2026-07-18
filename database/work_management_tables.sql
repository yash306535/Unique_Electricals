-- Work Types Table
CREATE TABLE IF NOT EXISTS work_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents Required Table
CREATE TABLE IF NOT EXISTS work_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    work_type_id UUID REFERENCES work_types(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    is_required BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Work Process Steps Table
CREATE TABLE IF NOT EXISTS work_process_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    work_type_id UUID REFERENCES work_types(id) ON DELETE CASCADE,
    step_name VARCHAR(255) NOT NULL,
    step_description TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site Work Types (Link sites to work types)
CREATE TABLE IF NOT EXISTS site_work_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    work_type_id UUID REFERENCES work_types(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(site_id, work_type_id)
);

-- Site Documentation Tracking
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

-- File Desk Tracking
CREATE TABLE IF NOT EXISTS file_desk_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    work_type_id UUID REFERENCES work_types(id) ON DELETE CASCADE,
    current_desk VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, in_progress
    notes TEXT,
    assigned_to VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample work type for Meter Installation
INSERT INTO work_types (name, description) VALUES 
('Meter Installation', 'New electricity meter installation process')
ON CONFLICT DO NOTHING;

-- Get the work type ID for Meter Installation
DO $$
DECLARE
    meter_work_id UUID;
BEGIN
    SELECT id INTO meter_work_id FROM work_types WHERE name = 'Meter Installation' LIMIT 1;
    
    IF meter_work_id IS NOT NULL THEN
        -- Insert required documents for Meter Installation
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
        
        -- Insert process steps for Meter Installation
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
