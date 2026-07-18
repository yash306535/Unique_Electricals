-- Photos table for storing task and subtask photos
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

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_task_photos_task_id ON task_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_task_photos_site_id ON task_photos(site_id);
CREATE INDEX IF NOT EXISTS idx_subtask_photos_subtask_id ON subtask_photos(subtask_id);
CREATE INDEX IF NOT EXISTS idx_subtask_photos_task_id ON subtask_photos(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_subtask_photos_site_id ON subtask_photos(site_id);
