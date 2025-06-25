# Supabase Storage Setup for Avatar Uploads

To enable avatar uploads in the ProfileScreen, you need to set up a storage bucket in your Supabase project.

## Steps:

1. **Go to your Supabase Dashboard**
   - Navigate to your project at https://supabase.com/dashboard

2. **Create Storage Bucket**
   - Go to "Storage" in the left sidebar
   - Click "Create a new bucket"
   - Name: `avatars`
   - Make it public (check "Public bucket")
   - Click "Create bucket"

3. **Set Storage Policies**
   - Click on the `avatars` bucket
   - Go to "Policies" tab
   - Add the following policies:

### Policy 1: Allow authenticated users to upload avatars
```sql
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 2: Allow public read access to avatars
```sql
CREATE POLICY "Public read access to avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');
```

### Policy 3: Allow users to update their own avatars
```sql
CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 4: Allow users to delete their own avatars
```sql
CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### **IMPORTANT: Alternative Policy (if above doesn't work)**
If you're still getting RLS errors, try this simpler policy that allows all authenticated users to upload:

```sql
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);
```

4. **Test the Setup**
   - Run your app
   - Go to Profile screen
   - Try uploading an avatar
   - The image should upload successfully and display in the header

## Notes:
- The avatar files are stored with the pattern: `avatars/{user_id}-{timestamp}.{extension}`
- Users can only upload/update/delete their own avatars
- Avatar URLs are publicly accessible for display
- The app will fallback to the guest icon if no avatar is set

## Troubleshooting:
- If you get "Unauthorized" errors, make sure the bucket is public
- If you get RLS policy errors, try the alternative policy above
- Make sure you're logged in when testing avatar uploads 