export interface Site {
  id: string;
  name: string;
  client_name?: string;
  location?: string;
  start_date?: string;
  estimated_cost?: number;  // Add this line
  status: 'active' | 'completed' | 'on-hold';
  created_at?: string;
}

export interface Expense {
  id: string;
  site_id: string;
  category: 'labour' | 'transport' | 'equipment' | 'misc';
  amount: number;
  description?: string;
  date: string;
  created_at?: string;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  created_at?: string;
}

export interface Purchase {
  id: string;
  material_id: string;
  vendor_name?: string;
  quantity: number;
  rate: number;
  total_amount: number;
  gst_amount?: number;
  has_bill: boolean;
  bill_photo_url?: string;
  date: string;
  created_at?: string;
  material?: Material;
}

export interface MaterialIssue {
  id: string;
  site_id: string;
  material_id: string;
  quantity: number;
  date: string;
  created_at?: string;
  material?: Material;
  site?: Site;
}

export interface SiteTask {
  id: string;
  site_id: string;
  task_name: string;
  task_type?: 'approval' | 'work' | 'follow-up';
  description?: string;
  expected_date?: string;
  status: 'pending' | 'completed';
  completed_date?: string;
  created_at?: string;
}

export interface GSTSummary {
  month: string;
  total_gst: number;
  purchase_count: number;
}

export interface ITRSummary {
  total_income: number;
  total_expense: number;
  profit_loss: number;
  year: string;
}

// Work Management Types
export interface WorkType {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkDocument {
  id: string;
  work_type_id: string;
  document_name: string;
  is_required: boolean;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkProcessStep {
  id: string;
  work_type_id: string;
  step_name: string;
  step_description?: string;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface SiteWorkType {
  id: string;
  site_id: string;
  work_type_id: string;
  created_at?: string;
  work_type?: WorkType;
}

export interface SiteDocumentation {
  id: string;
  site_id: string;
  work_type_id: string;
  document_id: string;
  is_completed: boolean;
  completed_at?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  document?: WorkDocument;
  work_documents?: WorkDocument;
}

export interface FileDeskTracking {
  id: string;
  site_id: string;
  work_type_id: string;
  current_desk: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress';
  notes?: string;
  assigned_to?: string;
  created_at?: string;
  updated_at?: string;
}