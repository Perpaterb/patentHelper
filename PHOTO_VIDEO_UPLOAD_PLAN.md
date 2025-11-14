# Photo & Video Upload Implementation Plan

## Overview
This document outlines the complete implementation of photo/video upload functionality across the Parenting Helper app, with proper storage tracking for admin billing.

## Architecture Summary

### Existing Infrastructure (Already Built)
✅ **Local Storage Service** (`backend/services/storage/localStorageService.js`)
- Handles file uploads to local filesystem
- Organizes files by category (messages, calendar, finance, profiles)
- Generates unique file IDs and sanitized filenames
- Stores metadata in JSON files alongside uploads

✅ **File Upload Endpoints** (`backend/controllers/files.controller.js`)
- `POST /files/upload` - Single file upload
- `POST /files/upload-multiple` - Multiple file upload
- `GET /files/:fileId` - Download file
- `DELETE /files/:fileId` - Delete file

✅ **Storage Interface** (`backend/services/storage/storageInterface.js`)
- Abstract interface for storage providers
- Ready for S3 migration in Phase 6

✅ **Database Schema** (`database/schema.sql`)
- `storage_usage` table exists
- Tracks usage per user, per group, per media type

### What Needs to be Built

#### 1. Storage Tracking System
**Problem:** Current system doesn't properly track storage against admin quotas per group.

**Requirements:**
- Track all uploads against the ADMIN(S) of the group
- Multiple admins in a group share the storage quota
- Each admin gets 10GB base + $1/GB overage
- Storage breakdown: images, videos, documents, audit logs
- Real-time storage calculation

**Implementation:**
- Update `localStorageService._updateStorageUsage()` to:
  - Find all admins in the group
  - Update `storage_usage` table for EACH admin
  - Track media type (image/video/document/log)
  - Update `users.storage_used_bytes` for each admin
- Create audit log entry for each upload with admin list

#### 2. Database Schema Updates
**Add to Prisma Schema:**
```prisma
model StorageUsage {
  usageId           String   @id @default(uuid()) @map("usage_id") @db.Uuid
  userId            String   @map("user_id") @db.Uuid
  groupId           String   @map("group_id") @db.Uuid
  mediaType         String   @map("media_type") @db.VarChar(20) // 'image', 'video', 'document', 'log'
  fileCount         Int      @default(0) @map("file_count")
  totalBytes        BigInt   @default(0) @map("total_bytes")
  lastCalculatedAt  DateTime @default(now()) @map("last_calculated_at") @db.Timestamp(6)

  user              User     @relation(fields: [userId], references: [userId], onDelete: Cascade)
  group             Group    @relation(fields: [groupId], references: [groupId], onDelete: Cascade)

  @@unique([userId, groupId, mediaType])
  @@index([userId])
  @@index([groupId])
  @@map("storage_usage")
}

// Add to User model:
storageLimitGb    Int      @default(0) @map("storage_limit_gb")
storageUsedBytes  BigInt   @default(0) @map("storage_used_bytes")
```

#### 3. File Upload API Updates
**Current Issues:**
- No authentication (uses placeholder `userId`)
- No proper category validation for new features
- No admin tracking for storage

**Updates Needed:**
- Add `requireAuth` middleware
- Update category list: `['messages', 'calendar', 'finance', 'profiles', 'gift-registry', 'wiki', 'item-registry']`
- Add `getAllGroupAdmins()` helper function
- Update storage tracking to all admins
- Add audit log creation

#### 4. Mobile Photo/Video Picker
**Use Expo Image Picker:**
```javascript
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
```

**Features:**
- Photo from camera
- Photo from library
- Video from camera
- Video from library
- Document picker for PDFs, etc.
- Image compression before upload
- Video compression before upload
- Upload progress indicator
- File size limits (configurable per type)

**Create Shared Component:** `mobile-main/src/components/shared/MediaPicker.jsx`

#### 5. Integration Points

##### A. Messages
- Add media attachments to messages table
- Display images inline in message bubbles
- Video thumbnails with play button
- Tap to view full-screen
- Multiple attachments per message

**Database:** Already has `message_media` table

##### B. Gift Registry Items
- Add photo to gift item (single image)
- Update `gift_items.photo_url` to use uploaded file URL

##### C. User Profile Icons
- Upload profile photo in "My Account"
- Crop to square
- Generate thumbnail
- Update `users.member_icon` (currently stores initials, will store image URL)

##### D. Finance (Future)
- Receipt attachments
- Invoice attachments

##### E. Wiki (Future)
- Article images
- Document attachments

##### F. Item Registry (Future)
- Item photos
- Document attachments

#### 6. Storage Quota Enforcement
**Before Upload:**
1. Get all admins for the group
2. Check each admin's storage usage
3. If ANY admin exceeds quota, reject upload
4. Return error: "Storage limit exceeded for group admin(s). Please upgrade storage or delete files."

**After Upload:**
1. Update storage_usage for all admins
2. If any admin exceeds quota, send email notification
3. Email: "Your storage has been increased to XGB. You'll be charged $X USD on your next billing cycle"

#### 7. Audit Logging
**Every file upload creates audit log:**
```javascript
{
  action: 'upload_file',
  performedBy: groupMemberId,
  performedByName: displayName,
  performedByEmail: email,
  actionLocation: 'messages' | 'gift-registry' | 'profile' | etc.,
  messageContent: 'Uploaded [filename.jpg] (1.2MB) - Charged to admins: [Admin 1, Admin 2]',
  metadata: {
    fileId: uuid,
    fileName: 'original-name.jpg',
    fileSize: bytes,
    mimeType: 'image/jpeg',
    category: 'messages',
    groupId: uuid,
    chargedToAdmins: [userId1, userId2], // List of admin user IDs
  }
}
```

#### 8. Admin File Deletion (Web App Only - Future Implementation)

**CRITICAL REQUIREMENT**: Admins need the ability to delete files to free up storage quota.

**Business Rules**:
- **Web App Only**: File deletion ONLY available in web-admin app Storage Management page
- **Mobile Apps**: NO file deletion capability (prevents accidental deletions)
- **Approval Required**: Deleting files requires >50% admin approval
- **Permanent Deletion**: Once approved, file content is PERMANENTLY deleted (hard delete)
- **Audit Trail Preserved**: Audit logs and filename remain forever, but file content is gone
- **Multiple Warnings**: Show MULTIPLE warnings before initiating approval request

**Approval Workflow**:
1. Admin navigates to Storage Management page in web-admin app
2. Views list of all files in their groups (filterable by group, category, date, size)
3. Selects file(s) to delete
4. System shows warning modal:
   ```
   ⚠️ WARNING: Permanent File Deletion

   You are about to request deletion of:
   - filename.jpg (1.2MB) uploaded on 2025-01-15
   - video.mp4 (45.6MB) uploaded on 2025-01-20

   IMPORTANT:
   - This requires approval from >50% of group admins
   - Once approved, file content will be PERMANENTLY deleted
   - Only audit logs and filenames will remain
   - This action CANNOT be undone
   - Any messages/items referencing these files will show "File deleted"

   Storage to be freed: 46.8MB

   Continue with deletion request?
   [Cancel] [Request Approval]
   ```
5. If admin confirms, create approval record:
   ```javascript
   {
     action: 'delete_files',
     requestedBy: adminGroupMemberId,
     groupId: uuid,
     approvalType: 'majority', // >50%
     metadata: {
       fileIds: [uuid1, uuid2],
       fileNames: ['filename.jpg', 'video.mp4'],
       totalSize: 48988160, // bytes
       category: 'messages',
       storageToFree: '46.8MB'
     }
   }
   ```
6. Other admins receive notification: "Admin [Name] has requested to delete 2 files (46.8MB) from [Group Name]. Review and vote."
7. Once >50% approval threshold met:
   - Update file metadata to `isHidden: true` (soft delete first)
   - Create audit log: `action: 'delete_file_approved'`
   - Wait 24 hours (grace period for accidental approvals)
   - After 24 hours, HARD DELETE file from filesystem
   - Update storage_usage table for all admins (decrement totalBytes and fileCount)
   - Update users.storageUsedBytes for all admins
   - Send email to all admins: "Files deleted successfully. Storage freed: 46.8MB"
   - Create final audit log: `action: 'delete_file_completed'`

**Audit Logs for File Deletion**:
```javascript
// Request created
{
  action: 'delete_files_requested',
  performedBy: adminGroupMemberId,
  metadata: {
    fileIds: [uuid1, uuid2],
    fileNames: ['filename.jpg', 'video.mp4'],
    totalSize: 48988160,
    approvalId: uuid
  }
}

// Approval votes
{
  action: 'delete_files_vote',
  performedBy: adminGroupMemberId,
  metadata: {
    approvalId: uuid,
    vote: 'approve' | 'reject',
    fileCount: 2
  }
}

// Approval threshold met (soft delete)
{
  action: 'delete_files_approved',
  performedBy: 'system',
  metadata: {
    fileIds: [uuid1, uuid2],
    fileNames: ['filename.jpg', 'video.mp4'],
    approvedBy: [admin1, admin2, admin3],
    gracePeriodEnds: '2025-01-16T12:00:00Z'
  }
}

// Hard delete completed
{
  action: 'delete_files_completed',
  performedBy: 'system',
  metadata: {
    fileIds: [uuid1, uuid2],
    fileNames: ['filename.jpg', 'video.mp4'], // Names preserved forever
    totalSize: 48988160,
    storageFreed: '46.8MB',
    chargedToAdmins: [userId1, userId2] // Admins whose storage was decremented
  }
}
```

**UI/UX Considerations**:
- Storage Management page shows storage breakdown by group and category
- Files shown with: filename, size, category, upload date, uploaded by
- Search/filter by: group, category, date range, file type, uploader
- Batch selection for multiple file deletion
- Show preview of file before deletion request (if image/video)
- "Storage Impact" calculator: shows how much storage will be freed
- After deletion, items referencing deleted files show: "🗑️ File deleted (filename.jpg)"

**Database Schema Updates** (Future):
```sql
-- Track hard deletes separately from soft deletes
ALTER TABLE file_metadata ADD COLUMN hard_deleted_at TIMESTAMP;
ALTER TABLE file_metadata ADD COLUMN deletion_approval_id UUID REFERENCES approvals(approval_id);
```

**Implementation Notes**:
- This feature is NOT part of initial mobile app implementation
- Web-admin app only (subscriptions and storage management happen on web)
- Requires approval system to be fully implemented first
- 24-hour grace period prevents immediate irreversible deletion
- Audit logs ensure complete paper trail for compliance

## Implementation Order

### Phase 1: Database & Storage Service (Week 1)
1. ✅ Add StorageUsage model to Prisma schema
2. ✅ Create migration for storage_usage table
3. ✅ Update localStorageService with admin tracking
4. ✅ Add getAllGroupAdmins() helper
5. ✅ Update storage quota checking logic

### Phase 2: Backend API (Week 1-2)
1. ✅ Update files.controller.js with authentication
2. ✅ Add proper category validation
3. ✅ Implement admin storage tracking
4. ✅ Add audit logging for uploads
5. ✅ Create storage quota enforcement
6. ✅ Add file size limits
7. ✅ Test with Postman/Thunder Client

### Phase 3: Mobile Components (Week 2)
1. ✅ Create MediaPicker component
2. ✅ Add image compression
3. ✅ Add upload progress
4. ✅ Create ImageViewer component (full-screen)
5. ✅ Create VideoPlayer component

### Phase 4: Integration - User Profile (Week 2)
1. ✅ Add photo upload to My Account screen
2. ✅ Image cropping for profile icons
3. ✅ Update user.memberIcon with image URL
4. ✅ Display profile images in all screens

### Phase 5: Integration - Messages (Week 3)
1. ✅ Add media picker to message compose
2. ✅ Save media URLs to message_media table
3. ✅ Display inline images in message bubbles
4. ✅ Video thumbnails with play button
5. ✅ Full-screen viewer for images/videos

### Phase 6: Integration - Gift Registry (Week 3)
1. ✅ Add photo upload to Add/Edit Item screen
2. ✅ Display images in item cards
3. ✅ Full-screen image viewer

### Phase 7: Testing (Week 4)
1. ✅ Test uploads in iOS simulator (may have limitations)
2. ✅ Test uploads on real device
3. ✅ Test storage tracking across multiple admins
4. ✅ Test quota enforcement
5. ✅ Test file deletion and storage recalculation
6. ✅ Test audit logs

### Phase 8: Storage Management (Web App - Future)
**NOTE:** This phase is for web-admin app ONLY, NOT mobile apps.

1. ⏳ Create Storage Management page in web-admin
   - Show storage breakdown by group and category
   - Display all files with metadata (name, size, date, uploader)
   - Search/filter by group, category, date range, file type, uploader
   - Show storage usage vs. quota for each group

2. ⏳ Implement file deletion with approval workflow
   - Batch file selection UI
   - Warning modal with multiple confirmations
   - Create approval request (>50% admin approval required)
   - Notification system for other admins to vote
   - 24-hour grace period after approval before hard delete

3. ⏳ Implement hard delete process
   - Soft delete first (isHidden = true)
   - Wait 24 hours (grace period)
   - Hard delete file from filesystem
   - Update storage_usage table for all admins (decrement)
   - Update users.storageUsedBytes for all admins
   - Send confirmation email to all admins

4. ⏳ Add database schema updates
   - Add hard_deleted_at timestamp to file metadata
   - Add deletion_approval_id foreign key

5. ⏳ Create comprehensive audit logging
   - Log deletion request
   - Log all approval votes
   - Log approval threshold met
   - Log hard delete completion
   - Preserve filename in audit logs forever

6. ⏳ Update UI to handle deleted files
   - Messages with deleted files show: "🗑️ File deleted (filename.jpg)"
   - Gift registry items with deleted photos show placeholder
   - Audit logs always show filename even after deletion

## File Size Limits
- **Images:** 10MB max (compressed before upload)
- **Videos:** 100MB max (compressed before upload)
- **Documents:** 25MB max
- **Profile Icons:** 5MB max

## Supported Formats
- **Images:** JPEG, PNG, GIF, WebP
- **Videos:** MP4, MOV, AVI
- **Documents:** PDF, DOC, DOCX, XLS, XLSX

## API Endpoints

### File Upload
```
POST /files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- file: <binary>
- category: 'messages' | 'gift-registry' | 'profile' | etc.
- groupId: <uuid> (required for group-related uploads)

Response:
{
  success: true,
  file: {
    fileId: uuid,
    url: '/files/:fileId',
    fileName: 'sanitized-name.jpg',
    size: bytes,
    mimeType: 'image/jpeg'
  }
}
```

### Get Storage Usage
```
GET /storage/usage
Authorization: Bearer <token>

Response:
{
  success: true,
  totalUsedBytes: 1234567890,
  totalLimitBytes: 10737418240, // 10GB
  percentUsed: 11.5,
  byGroup: [
    {
      groupId: uuid,
      groupName: 'Family Group',
      usedBytes: 500000000,
      byType: {
        images: 300000000,
        videos: 150000000,
        documents: 50000000
      }
    }
  ]
}
```

## Mobile Components API

### MediaPicker Component
```javascript
import MediaPicker from '@/components/shared/MediaPicker';

<MediaPicker
  onSelect={(file) => {
    // file: { uri, type, name, size }
    uploadFile(file);
  }}
  mediaType="photo" | "video" | "all"
  maxSize={10 * 1024 * 1024} // 10MB
  allowMultiple={false}
/>
```

### ImageViewer Component
```javascript
import ImageViewer from '@/components/shared/ImageViewer';

<ImageViewer
  visible={showViewer}
  imageUrl={selectedImage}
  onClose={() => setShowViewer(false)}
/>
```

## Security Considerations
1. ✅ All uploads require authentication
2. ✅ Validate file types (MIME type checking)
3. ✅ Validate file sizes before upload
4. ✅ Sanitize file names
5. ✅ Store files outside web root
6. ✅ Generate unique file IDs (UUID)
7. ✅ Check user permissions for group uploads
8. ✅ Audit log all uploads with admin tracking

## Notes
- iOS simulator may not support camera access (use photo library instead)
- Real device testing required for camera functionality
- Compression reduces upload time and storage costs
- Admin storage tracking is critical for billing accuracy
- All admins in a group see the same storage quota usage
