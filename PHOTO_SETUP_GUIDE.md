# Photo Upload - Setup & Troubleshooting Guide

## ✅ What's Been Fixed

### 1. Photo Upload (Direct - No Crop)
- Removed `allowsEditing: true` from image picker
- Photos now upload directly without crop interface
- Better error messages with debugging info
- Faster upload process

### 2. Environment Configuration
Updated `.env` with proper Cloudinary credentials:
```
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=dx2e7v6y7
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=construction-manager
EXPO_PUBLIC_CLOUDINARY_API_KEY=912116261595881
```

### 3. Error Handling
- Added detailed logging to Cloudinary upload
- Shows which cloud name and preset being used
- Logs Cloudinary response for debugging

---

## ⚠️ Current Errors & Solutions

### Error 1: "Could not find the table 'public.subtask_photos'"

**Cause**: Database tables not created in Supabase

**Solution**:
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** → **New Query**
4. Paste the SQL from `DATABASE_SETUP.md`
5. Click **Run**

**Verify**: In Table Editor, you should see:
- ✅ `task_photos` (with columns: id, task_id, photo_url, etc.)
- ✅ `subtask_photos` (with columns: id, subtask_id, photo_url, etc.)

---

### Error 2: "Error uploading to Cloudinary"

**Cause**: Usually one of:
1. Upload preset doesn't exist
2. Wrong cloud name
3. Network connectivity issue
4. Cloudinary account issue

**Solution - Method A (Check Upload Preset)**:
1. Go to: https://cloudinary.com/console
2. Navigate to: **Settings → Upload**
3. Find **Upload presets** section
4. Look for preset named: `construction-manager`
5. If not found:
   - Click **Add upload preset**
   - Name: `construction-manager`
   - Unsigned: Enable (allow unsigned uploads)
   - Click **Save**

**Solution - Method B (Verify Cloud Name)**:
1. In Cloudinary dashboard, click your profile (top right)
2. Check **Cloud name** matches: `dx2e7v6y7`
3. Update `.env` if different

**Solution - Method C (Test Upload)**:
1. Clear Expo cache: `npx expo start --clear`
2. Try uploading a photo
3. Check console logs for:
   - "Uploading to Cloudinary..."
   - "Cloud Name: dx2e7v6y7"
   - "Upload Preset: construction-manager"
   - API response details

---

## 🚀 Step-by-Step Setup

### Step 1: Database Tables
Run SQL from `DATABASE_SETUP.md` in Supabase SQL Editor

### Step 2: Cloudinary Preset
Create upload preset `construction-manager` in Cloudinary

### Step 3: Restart Development Server
```bash
npx expo start --clear
```

### Step 4: Test Photo Upload
1. Open app
2. Go to Site Tasks
3. Click "Add Photo" button on a task
4. Select photo from gallery
5. Should upload without crop interface
6. Photo should appear in gallery

---

## 📋 Files Modified

- ✅ `src/utils/photoUtils.ts` - Removed crop, improved error logging
- ✅ `src/components/PhotoPicker.tsx` - Better error messages
- ✅ `.env` - Correct Cloudinary credentials
- ✅ `DATABASE_SETUP.md` - Setup instructions (NEW)

---

## 🔍 Debug Checklist

Before uploading photos, verify:

- [ ] `.env` has correct `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=dx2e7v6y7`
- [ ] `.env` has correct `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=construction-manager`
- [ ] Database tables created (`task_photos` and `subtask_photos`)
- [ ] Cloudinary upload preset exists
- [ ] Internet connection is working
- [ ] Expo cache cleared: `npx expo start --clear`

---

## 💡 Upload Flow

```
User selects photo from gallery/camera
     ↓
PhotoPicker component opens modal
     ↓
User selects "Take Photo" or "Choose from Gallery"
     ↓
Image selected (NO CROP - direct selection)
     ↓
uploadToCloudinary() function called
     ↓
FormData created with image & metadata
     ↓
POST to: https://api.cloudinary.com/v1_1/dx2e7v6y7/image/upload
     ↓
Response received (url + public_id)
     ↓
handleAddPhoto() saves to Supabase task_photos table
     ↓
PhotoGallery displays thumbnail
```

---

## 📞 Need Help?

### Check Cloudinary Logs
1. Open Cloudinary dashboard
2. Go to **Media Library**
3. Should see uploaded images
4. If not, upload failed at Cloudinary

### Check Supabase Logs
1. Open Supabase dashboard
2. Go to **Logs**
3. Look for SQL errors on `task_photos` or `subtask_photos` tables

### Check App Logs
```bash
# Open Expo dev tools (press 'i' in terminal)
# Look for console.log output from photoUtils.ts
# Should show:
# - "Uploading to Cloudinary..."
# - "Upload successful: [URL]"
# - Or error details
```
