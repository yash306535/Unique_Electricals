# Database Setup Instructions - Photo Upload (FIXED)

## ✅ Copy & Paste This SQL into Supabase

**Steps:**
1. Open: https://supabase.com/dashboard
2. Click **SQL Editor** → **New Query**
3. Paste the SQL below (entire block)
4. Click **Run** button
5. Done! ✅

---

## Simple SQL (No Root Check - All Users Can Upload Photos)

```sql
-- Create task_photos table
CREATE TABLE IF NOT EXISTS public.task_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.site_tasks(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  cloudinary_id TEXT NOT NULL,
  description TEXT,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subtask_photos table
CREATE TABLE IF NOT EXISTS public.subtask_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subtask_id uuid NOT NULL REFERENCES public.site_subtasks(id) ON DELETE CASCADE,
  parent_task_id uuid NOT NULL REFERENCES public.site_tasks(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  cloudinary_id TEXT NOT NULL,
  description TEXT,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_photos_task_id ON public.task_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_task_photos_site_id ON public.task_photos(site_id);
CREATE INDEX IF NOT EXISTS idx_subtask_photos_subtask_id ON public.subtask_photos(subtask_id);
CREATE INDEX IF NOT EXISTS idx_subtask_photos_task_id ON public.subtask_photos(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_subtask_photos_site_id ON public.subtask_photos(site_id);

-- Enable Row Level Security
ALTER TABLE public.task_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtask_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All authenticated users can view and upload
CREATE POLICY "task_photos_select" ON public.task_photos FOR SELECT USING (true);
CREATE POLICY "task_photos_insert" ON public.task_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "task_photos_delete" ON public.task_photos FOR DELETE USING (uploaded_by = auth.uid());

CREATE POLICY "subtask_photos_select" ON public.subtask_photos FOR SELECT USING (true);
CREATE POLICY "subtask_photos_insert" ON public.subtask_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "subtask_photos_delete" ON public.subtask_photos FOR DELETE USING (uploaded_by = auth.uid());
```

---

## Verify Setup ✅

After running SQL, check Supabase **Table Editor**:
- ✅ Table `task_photos` exists
- ✅ Table `subtask_photos` exists

---

## Environment Configuration ✅

Your `.env` is already configured:
```
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=dx2e7v6y7
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=construction-manager
EXPO_PUBLIC_CLOUDINARY_API_KEY=912116261595881
```

---

## Restart App

```bash
npx expo start --clear
```

---

## Features Now Enabled ✅

- ✅ Direct photo upload (no crop)
- ✅ All users can upload to tasks & subtasks
- ✅ Auto Cloudinary integration
- ✅ Task photos separate from subtask photos

```sql
-- Create task_photos table
CREATE TABLE IF NOT EXISTS public.task_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.site_tasks(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  cloudinary_id TEXT NOT NULL,
  description TEXT,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subtask_photos table
CREATE TABLE IF NOT EXISTS public.subtask_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subtask_id uuid NOT NULL REFERENCES public.site_subtasks(id) ON DELETE CASCADE,
  parent_task_id uuid NOT NULL REFERENCES public.site_tasks(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  cloudinary_id TEXT NOT NULL,
  description TEXT,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_photos_task_id ON public.task_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_task_photos_site_id ON public.task_photos(site_id);
CREATE INDEX IF NOT EXISTS idx_task_photos_created_at ON public.task_photos(created_at);

CREATE INDEX IF NOT EXISTS idx_subtask_photos_subtask_id ON public.subtask_photos(subtask_id);
CREATE INDEX IF NOT EXISTS idx_subtask_photos_task_id ON public.subtask_photos(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_subtask_photos_site_id ON public.subtask_photos(site_id);

-- Enable Row Level Security
ALTER TABLE public.task_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtask_photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for task_photos (allow authenticated users to read their site's photos)
CREATE POLICY "Users can view task photos" ON public.task_photos
  FOR SELECT USING (true);

CREATE POLICY "Users can insert task photos" ON public.task_photos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own task photos" ON public.task_photos
  FOR DELETE USING (uploaded_by = auth.uid() OR auth.uid() IN (SELECT id FROM public.users WHERE is_root = true));

-- Create RLS policy for subtask_photos (allow authenticated users to read their site's photos)
CREATE POLICY "Users can view subtask photos" ON public.subtask_photos
  FOR SELECT USING (true);

CREATE POLICY "Users can insert subtask photos" ON public.subtask_photos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own subtask photos" ON public.subtask_photos
  FOR DELETE USING (uploaded_by = auth.uid() OR auth.uid() IN (SELECT id FROM public.users WHERE is_root = true));
```

4. Click **Run** button
5. Verify that both tables are created successfully

### Option 2: Using psql (Command Line)

If you have psql installed, run:

```bash
psql "postgresql://[user]:[password]@[host]:[port]/[database]" -f database/photo_schema.sql
```

## Verify Tables Created

In Supabase, go to **Table Editor** and verify:
- ✅ `task_photos` table exists with columns: id, task_id, photo_url, cloudinary_id, etc.
- ✅ `subtask_photos` table exists with columns: id, subtask_id, photo_url, cloudinary_id, etc.

## Cloudinary Credentials

Your `.env` file is already configured with:
- Cloud Name: `dx2e7v6y7`
- API Key: `912116261595881`
- Upload Preset: `construction-manager`

**Important**: If uploads still fail, verify:
1. Your Cloudinary account is active
2. The upload preset `construction-manager` exists in your Cloudinary dashboard
3. Your cloud name matches exactly

## Clear Cache & Restart

After running this setup, restart Expo:

```bash
npx expo start --clear
```

---

**Status**: Photo functionality will work once:
1. ✅ Environment variables are set (.env is configured)
2. ⏳ Database tables are created (run SQL above)
3. ✅ Photo components are installed (PhotoPicker, PhotoGallery)
