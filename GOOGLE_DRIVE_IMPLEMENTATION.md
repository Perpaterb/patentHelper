# Google Drive Integration - Detailed Implementation Guide

**Date**: 2025-11-04
**Status**: 🚨 PLANNING PHASE - NOT YET IMPLEMENTED
**Prerequisites**: Read `ARCHITECTURE_CHANGE.md` first for context

---

## 📋 Table of Contents

1. [Phase 1: Google Cloud Setup](#phase-1-google-cloud-setup)
2. [Phase 2: Database Schema Changes](#phase-2-database-schema-changes)
3. [Phase 3: Backend Implementation](#phase-3-backend-implementation)
4. [Phase 4: Mobile UI Implementation](#phase-4-mobile-ui-implementation)
5. [Phase 5: Testing & Deployment](#phase-5-testing--deployment)
6. [Troubleshooting](#troubleshooting)

---

## Phase 1: Google Cloud Setup

### Step 1.1: Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Click "Create Project"
3. Name: "Parenting Helper"
4. Organization: None (personal project)
5. Click "Create"

### Step 1.2: Enable Google Drive API

```bash
# Navigate to your project
# Then enable the Drive API:
```

1. Go to "APIs & Services" → "Library"
2. Search for "Google Drive API"
3. Click "Enable"

### Step 1.3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. User Type: **External** (unless you have Workspace)
3. Fill in details:
   ```
   App name: Parenting Helper
   User support email: your-email@example.com
   Developer contact email: your-email@example.com

   App domain:
   - Application home page: https://parentinghelperapp.com
   - Privacy policy: https://parentinghelperapp.com/privacy
   - Terms of service: https://parentinghelperapp.com/terms

   Authorized domains:
   - parentinghelperapp.com
   - localhost (for testing)
   ```

4. **Scopes**: Click "Add or Remove Scopes"
   - Search and add: `https://www.googleapis.com/auth/drive.file`
   - This scope:
     - ✅ Can see and manage files created by this app
     - ❌ CANNOT see user's personal files
     - ❌ CANNOT see other apps' files

5. **Test Users** (while in development):
   - Add your email addresses
   - Add test users' emails
   - Up to 100 test users allowed

6. **Verification** (later, before production):
   - Google will review your app
   - Required for >100 users
   - Takes 1-2 weeks

### Step 1.4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Web application**
4. Name: "Parenting Helper Web"
5. Authorized redirect URIs:
   ```
   http://localhost:3000/auth/google/callback
   https://api.parentinghelperapp.com/auth/google/callback
   ```
6. Click "Create"
7. **SAVE THESE**:
   ```
   Client ID: abc123.apps.googleusercontent.com
   Client Secret: xyz789secretkey
   ```

### Step 1.5: Create Mobile OAuth Credentials

1. Create another OAuth client
2. Application type: **iOS** (for mobile)
3. Name: "Parenting Helper iOS"
4. Bundle ID: `com.parentinghelper.app`

5. Create another OAuth client
6. Application type: **Android** (for mobile)
7. Name: "Parenting Helper Android"
8. Package name: `com.parentinghelper.app`
9. SHA-1 certificate fingerprint: (get from Expo)
   ```bash
   cd mobile-main
   expo credentials:manager
   ```

### Step 1.6: Store Credentials

**Backend `.env` file:**
```env
# Add these lines:
GOOGLE_OAUTH_CLIENT_ID=abc123.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=xyz789secretkey
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

**Mobile `.env` file:**
```env
# mobile-main/.env
GOOGLE_IOS_CLIENT_ID=abc123-ios.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=abc123-android.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_ID=abc123.apps.googleusercontent.com
```

---

## Phase 2: Database Schema Changes

### Step 2.1: Update Prisma Schema

**File: `backend/prisma/schema.prisma`**

Add these fields to the `User` model:

```prisma
model User {
  // ... existing fields ...

  // Google Drive Integration
  googleAccountEmail    String?   @db.VarChar(255)
  googleRefreshToken    String?   @db.Text  // Encrypted!
  googleTokenExpiry     DateTime?
  googleDriveConnected  Boolean   @default(false)
  googleDriveAppFolderId String?  @db.VarChar(255)
  googleDriveConnectedAt DateTime?
  googleDriveLastSyncAt  DateTime?

  // Remove subscription fields (or keep for migration)
  // isSubscribed          Boolean   @default(false)
  // subscriptionId        String?
  // subscriptionStartDate DateTime?
  // subscriptionEndDate   DateTime?
  // storageLimitGb        Int       @default(10)
}
```

Update `MessageMedia` model:

```prisma
model MessageMedia {
  mediaId           String   @id @default(uuid()) @map("media_id")
  messageId         String   @map("message_id")
  message           Message  @relation(fields: [messageId], references: [messageId], onDelete: Cascade)

  // Storage fields
  mediaType         String   @map("media_type") @db.VarChar(50)
  fileName          String   @map("file_name") @db.VarChar(255)
  fileSizeBytes     BigInt   @map("file_size_bytes")
  mimeType          String   @map("mime_type") @db.VarChar(100)

  // Google Drive (NEW)
  googleDriveFileId String?  @map("google_drive_file_id") @db.VarChar(255)
  uploadedByUserId  String?  @map("uploaded_by_user_id")
  uploader          User?    @relation(fields: [uploadedByUserId], references: [userId])

  // S3 (Legacy - keep during migration)
  s3Key             String?  @map("s3_key") @db.VarChar(255)
  s3Bucket          String?  @map("s3_bucket") @db.VarChar(255)

  thumbnailUrl      String?  @map("thumbnail_url") @db.Text
  isHidden          Boolean  @default(false) @map("is_hidden")
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamp(6)

  @@map("message_media")
}
```

Add optional `Donations` table:

```prisma
model Donation {
  donationId       String   @id @default(uuid()) @map("donation_id")
  userId           String   @map("user_id")
  user             User     @relation(fields: [userId], references: [userId])

  amount           Decimal  @db.Decimal(12, 2)
  currency         String   @db.VarChar(3)  // USD, EUR, etc.
  paymentMethod    String   @db.VarChar(50)  // stripe, paypal, etc.
  stripeSessionId  String?  @db.VarChar(255)

  donatedAt        DateTime @default(now()) @map("donated_at") @db.Timestamp(6)
  thankYouSent     Boolean  @default(false) @map("thank_you_sent")

  // Optional message from donor
  message          String?  @db.Text

  @@map("donations")
}
```

### Step 2.2: Create Migration

```bash
cd backend
npx prisma migrate dev --name add_google_drive_integration
```

This will:
1. Generate migration SQL
2. Apply to local database
3. Regenerate Prisma Client

### Step 2.3: Verify Migration

```bash
# Check tables were created:
docker exec -it parenthelper psql -U parenthelper -d parenthelper

# Inside psql:
\d users
# Should see new google_* columns

\d message_media
# Should see google_drive_file_id column

\d donations
# Should see donations table

\q
```

---

## Phase 3: Backend Implementation

### Step 3.1: Install Dependencies

```bash
cd backend
npm install googleapis@latest
npm install google-auth-library@latest
```

### Step 3.2: Create Google Drive Service

**File: `backend/services/googleDrive.service.js`**

```javascript
/**
 * Google Drive Service
 *
 * Handles all Google Drive API interactions:
 * - Upload files
 * - Download files
 * - Delete files
 * - Manage app folder
 * - Refresh access tokens
 */

const { google } = require('googleapis');
const crypto = require('crypto');

// Encryption for refresh tokens
const ENCRYPTION_KEY = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt Google refresh token before storing in database
 * @param {string} text - The refresh token
 * @returns {string} Encrypted token with IV prepended
 */
function encryptToken(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt Google refresh token from database
 * @param {string} text - Encrypted token with IV
 * @returns {string} Decrypted refresh token
 */
function decryptToken(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

/**
 * Create OAuth2 client
 * @returns {OAuth2Client}
 */
function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
}

/**
 * Get fresh access token using refresh token
 * @param {string} encryptedRefreshToken - Encrypted refresh token from database
 * @returns {Promise<string>} Fresh access token
 */
async function getAccessToken(encryptedRefreshToken) {
  try {
    const refreshToken = decryptToken(encryptedRefreshToken);
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials.access_token;
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    throw new Error('Failed to refresh Google Drive access token');
  }
}

/**
 * Create or get the app's hidden folder in user's Drive
 * @param {string} accessToken - User's access token
 * @returns {Promise<string>} Folder ID
 */
async function getOrCreateAppFolder(accessToken) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Search for existing folder
  const folderName = '.parentinghelper';
  const response = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (response.data.files.length > 0) {
    // Folder exists
    return response.data.files[0].id;
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Parenting Helper app data - Do not delete!',
    },
    fields: 'id',
  });

  return folder.data.id;
}

/**
 * Upload file to user's Google Drive
 * @param {Object} params
 * @param {string} params.encryptedRefreshToken - User's encrypted refresh token
 * @param {string} params.folderId - Google Drive folder ID
 * @param {string} params.fileName - Name for the file
 * @param {Buffer|Stream} params.fileData - File content
 * @param {string} params.mimeType - MIME type (image/jpeg, etc.)
 * @returns {Promise<Object>} { fileId, webViewLink }
 */
async function uploadFile({ encryptedRefreshToken, folderId, fileName, fileData, mimeType }) {
  try {
    const accessToken = await getAccessToken(encryptedRefreshToken);
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType,
        body: fileData,
      },
      fields: 'id, webViewLink, size',
    });

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink,
      size: response.data.size,
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw new Error('Failed to upload file to Google Drive');
  }
}

/**
 * Download file from user's Google Drive
 * @param {string} encryptedRefreshToken - User's encrypted refresh token
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<Buffer>} File content
 */
async function downloadFile(encryptedRefreshToken, fileId) {
  try {
    const accessToken = await getAccessToken(encryptedRefreshToken);
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.data) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error downloading from Google Drive:', error);
    throw new Error('Failed to download file from Google Drive');
  }
}

/**
 * Delete file from user's Google Drive
 * @param {string} encryptedRefreshToken - User's encrypted refresh token
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<void>}
 */
async function deleteFile(encryptedRefreshToken, fileId) {
  try {
    const accessToken = await getAccessToken(encryptedRefreshToken);
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    await drive.files.delete({ fileId: fileId });
  } catch (error) {
    console.error('Error deleting from Google Drive:', error);
    throw new Error('Failed to delete file from Google Drive');
  }
}

/**
 * Check if user's Google Drive connection is still valid
 * @param {string} encryptedRefreshToken - User's encrypted refresh token
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
async function checkConnection(encryptedRefreshToken) {
  try {
    const accessToken = await getAccessToken(encryptedRefreshToken);
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Simple API call to verify connection
    await drive.about.get({ fields: 'user' });
    return true;
  } catch (error) {
    console.error('Google Drive connection check failed:', error);
    return false;
  }
}

module.exports = {
  encryptToken,
  decryptToken,
  getOAuth2Client,
  getAccessToken,
  getOrCreateAppFolder,
  uploadFile,
  downloadFile,
  deleteFile,
  checkConnection,
};
```

### Step 3.3: Update Auth Controller

**File: `backend/controllers/auth.controller.js`**

Add new functions for Google OAuth:

```javascript
const { getOAuth2Client, encryptToken, getOrCreateAppFolder } = require('../services/googleDrive.service');

/**
 * Step 1: Generate Google OAuth URL
 * Frontend opens this URL in browser
 *
 * GET /auth/google/url
 */
async function getGoogleAuthUrl(req, res) {
  try {
    const oauth2Client = getOAuth2Client();

    const scopes = [
      'https://www.googleapis.com/auth/drive.file',  // Access app-created files
      'https://www.googleapis.com/auth/userinfo.email',  // Get user's email
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',  // Request refresh token
      scope: scopes,
      prompt: 'consent',  // Force consent screen (to get refresh token)
    });

    return res.status(200).json({
      success: true,
      authUrl: url,
    });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate Google auth URL',
    });
  }
}

/**
 * Step 2: Handle Google OAuth callback
 * User redirected here after authorizing
 *
 * GET /auth/google/callback?code=...
 */
async function handleGoogleCallback(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing authorization code',
      });
    }

    const oauth2Client = getOAuth2Client();

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // tokens.refresh_token - Store this!
    // tokens.access_token - Use immediately, then discard

    if (!tokens.refresh_token) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No refresh token received. User may have already authorized.',
      });
    }

    // Get user's email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Create/get app folder in user's Drive
    const folderId = await getOrCreateAppFolder(tokens.access_token);

    // Encrypt refresh token before storing
    const encryptedRefreshToken = encryptToken(tokens.refresh_token);

    // Get authenticated user from JWT (Kinde)
    const kindeUserId = req.user.userId;  // From auth middleware

    // Update user record
    await prisma.user.update({
      where: { userId: kindeUserId },
      data: {
        googleAccountEmail: userInfo.data.email,
        googleRefreshToken: encryptedRefreshToken,
        googleTokenExpiry: new Date(tokens.expiry_date),
        googleDriveConnected: true,
        googleDriveAppFolderId: folderId,
        googleDriveConnectedAt: new Date(),
      },
    });

    // Return success
    return res.status(200).json({
      success: true,
      message: 'Google Drive connected successfully',
      googleEmail: userInfo.data.email,
    });
  } catch (error) {
    console.error('Error handling Google callback:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to connect Google Drive',
    });
  }
}

/**
 * Disconnect Google Drive
 *
 * POST /auth/google/disconnect
 */
async function disconnectGoogleDrive(req, res) {
  try {
    const { userId } = req.user;

    // Update user record
    await prisma.user.update({
      where: { userId },
      data: {
        googleAccountEmail: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        googleDriveConnected: false,
        googleDriveAppFolderId: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Google Drive disconnected',
    });
  } catch (error) {
    console.error('Error disconnecting Google Drive:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to disconnect Google Drive',
    });
  }
}

module.exports = {
  // ... existing exports
  getGoogleAuthUrl,
  handleGoogleCallback,
  disconnectGoogleDrive,
};
```

### Step 3.4: Update Files Controller

**File: `backend/controllers/files.controller.js`**

Replace S3 upload/download with Google Drive:

```javascript
const { uploadFile, downloadFile, deleteFile } = require('../services/googleDrive.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Upload message media (photo/video)
 *
 * POST /groups/:groupId/message-groups/:messageGroupId/messages/:messageId/media
 */
async function uploadMessageMedia(req, res) {
  try {
    const { groupId, messageGroupId, messageId } = req.params;
    const { userId } = req.user;

    // Get user's Google Drive credentials
    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        googleRefreshToken: true,
        googleDriveAppFolderId: true,
        googleDriveConnected: true,
      },
    });

    if (!user.googleDriveConnected) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Google Drive not connected. Please connect in Settings.',
      });
    }

    // Get uploaded file from multipart form
    const file = req.file;  // Assuming multer middleware

    if (!file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No file uploaded',
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `message-${messageId}-${timestamp}.${file.originalname.split('.').pop()}`;

    // Upload to user's Google Drive
    const driveFile = await uploadFile({
      encryptedRefreshToken: user.googleRefreshToken,
      folderId: user.googleDriveAppFolderId,
      fileName: fileName,
      fileData: file.buffer,
      mimeType: file.mimetype,
    });

    // Save to database
    const media = await prisma.messageMedia.create({
      data: {
        messageId: messageId,
        mediaType: file.mimetype.startsWith('image/') ? 'image' : 'video',
        fileName: file.originalname,
        fileSizeBytes: parseInt(driveFile.size),
        mimeType: file.mimetype,
        googleDriveFileId: driveFile.fileId,
        uploadedByUserId: userId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'upload_media',
        performedBy: userId,
        performedByName: req.user.displayName,
        performedByEmail: req.user.email,
        actionLocation: 'messages',
        messageContent: `Uploaded ${file.originalname} (${file.size} bytes)`,
      },
    });

    return res.status(201).json({
      success: true,
      media: {
        mediaId: media.mediaId,
        fileName: media.fileName,
        mediaType: media.mediaType,
        fileSizeBytes: media.fileSizeBytes,
      },
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upload media',
    });
  }
}

/**
 * Download/view message media
 *
 * GET /groups/:groupId/message-groups/:messageGroupId/messages/:messageId/media/:mediaId
 */
async function getMessageMedia(req, res) {
  try {
    const { mediaId } = req.params;

    // Get media record
    const media = await prisma.messageMedia.findUnique({
      where: { mediaId },
      include: {
        uploader: {
          select: {
            googleRefreshToken: true,
          },
        },
      },
    });

    if (!media) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Media not found',
      });
    }

    if (!media.googleDriveFileId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'File not available (uploader disconnected Google Drive)',
      });
    }

    // Download from UPLOADER's Google Drive
    const fileBuffer = await downloadFile(
      media.uploader.googleRefreshToken,
      media.googleDriveFileId
    );

    // Set headers
    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${media.fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);

    // Send file
    return res.send(fileBuffer);
  } catch (error) {
    console.error('Error downloading media:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to download media',
    });
  }
}

module.exports = {
  uploadMessageMedia,
  getMessageMedia,
  // ... other exports
};
```

### Step 3.5: Add Routes

**File: `backend/routes/auth.routes.js`**

```javascript
const authController = require('../controllers/auth.controller');

// Google OAuth routes
router.get('/google/url', requireAuth, authController.getGoogleAuthUrl);
router.get('/google/callback', requireAuth, authController.handleGoogleCallback);
router.post('/google/disconnect', requireAuth, authController.disconnectGoogleDrive);
```

### Step 3.6: Add Encryption Key to Environment

Generate a random 32-byte key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to `.env`:

```env
GOOGLE_TOKEN_ENCRYPTION_KEY=your-64-character-hex-key-here
```

---

## Phase 4: Mobile UI Implementation

### Step 4.1: Install Dependencies

```bash
cd mobile-main
npm install @react-native-google-signin/google-signin
npm install expo-web-browser
npm install expo-auth-session
```

### Step 4.2: Create Google Drive Connect Screen

**File: `mobile-main/src/screens/auth/GoogleDriveConnectScreen.jsx`**

```javascript
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import API from '../../services/api';

WebBrowser.maybeCompleteAuthSession();

/**
 * GoogleDriveConnectScreen
 *
 * Prompts user to connect their Google Drive account for storage.
 * Displayed after Kinde login if Google Drive not connected.
 */
export default function GoogleDriveConnectScreen({ navigation }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);

      // Get OAuth URL from backend
      const response = await API.get('/auth/google/url');
      const { authUrl } = response.data;

      // Open Google consent screen
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        'parentinghelper://auth/google/callback'
      );

      if (result.type === 'success') {
        // Extract code from URL
        const url = new URL(result.url);
        const code = url.searchParams.get('code');

        if (code) {
          // Send code to backend
          await API.get(`/auth/google/callback?code=${code}`);

          // Success! Navigate to home
          navigation.replace('Groups');
        } else {
          setError('Authorization failed. Please try again.');
        }
      } else {
        setError('Authorization cancelled.');
      }
    } catch (err) {
      console.error('Error connecting Google Drive:', err);
      setError('Failed to connect Google Drive. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleSkip = () => {
    // For now, don't allow skipping
    // In production, might want "Remind me later" option
    setError('Google Drive is required to use this app.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>☁️</Text>
        <Text style={styles.title}>Connect Google Drive</Text>
        <Text style={styles.description}>
          Parenting Helper stores your photos and files in your Google Drive account.
        </Text>

        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitItem}>✅ You own your data</Text>
          <Text style={styles.benefitItem}>✅ Your files, your Google account</Text>
          <Text style={styles.benefitItem}>✅ We can't see your personal files</Text>
          <Text style={styles.benefitItem}>✅ Keeps the app 100% FREE!</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.connectButton, connecting && styles.connectButtonDisabled]}
          onPress={handleConnect}
          disabled={connecting}
        >
          {connecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.connectButtonText}>Connect Google Drive</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.privacyNote}>
          We only access files created by Parenting Helper.{'\n'}
          Your personal files remain private.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  benefitItem: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    paddingLeft: 8,
  },
  connectButton: {
    backgroundColor: '#4285F4',  // Google blue
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
    minWidth: 250,
    alignItems: 'center',
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  privacyNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
});
```

### Step 4.3: Update Login Flow

**File: `mobile-main/src/screens/auth/LoginScreen.jsx`**

After successful Kinde login, check if Google Drive is connected:

```javascript
// After Kinde login success:
async function handleKindeLoginSuccess(kindeUser) {
  try {
    // Get user profile from backend
    const response = await API.get('/users/me');
    const user = response.data.user;

    if (!user.googleDriveConnected) {
      // Navigate to Google Drive connect screen
      navigation.navigate('GoogleDriveConnect');
    } else {
      // Navigate to home
      navigation.replace('Groups');
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
  }
}
```

### Step 4.4: Update My Account Screen

**File: `mobile-main/src/screens/account/MyAccountScreen.jsx`**

Replace subscription UI with:
- Google Drive connection status
- Storage usage (from user's Drive)
- Donate button

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import API from '../../services/api';

export default function MyAccountScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await API.get('/users/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectDrive = () => {
    Alert.alert(
      'Disconnect Google Drive?',
      'Your uploaded files will become unavailable until you reconnect.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.post('/auth/google/disconnect');
              Alert.alert('Success', 'Google Drive disconnected');
              fetchUserProfile();
            } catch (error) {
              Alert.alert('Error', 'Failed to disconnect Google Drive');
            }
          },
        },
      ]
    );
  };

  const handleDonate = () => {
    // Open donation page in browser
    Linking.openURL('https://parentinghelperapp.com/donate');
  };

  if (loading) {
    return <ActivityIndicator />;
  }

  return (
    <View style={styles.container}>
      {/* Display Name */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Text style={styles.label}>Display Name</Text>
        <Text style={styles.value}>{user.displayName}</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user.email}</Text>
      </View>

      {/* Google Drive Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage</Text>
        {user.googleDriveConnected ? (
          <>
            <View style={styles.statusConnected}>
              <Text style={styles.statusIcon}>✓</Text>
              <Text style={styles.statusText}>Google Drive Connected</Text>
            </View>
            <Text style={styles.label}>Google Account</Text>
            <Text style={styles.value}>{user.googleAccountEmail}</Text>
            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={handleDisconnectDrive}
            >
              <Text style={styles.disconnectButtonText}>Disconnect</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.statusDisconnected}>
              <Text style={styles.statusIcon}>⚠️</Text>
              <Text style={styles.statusText}>Google Drive Not Connected</Text>
            </View>
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => navigation.navigate('GoogleDriveConnect')}
            >
              <Text style={styles.connectButtonText}>Connect Now</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Donate Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support This App</Text>
        <Text style={styles.donateDescription}>
          Parenting Helper is 100% FREE with no ads.{'\n'}
          Donations help keep the servers running!
        </Text>
        <TouchableOpacity style={styles.donateButton} onPress={handleDonate}>
          <Text style={styles.donateButtonText}>❤️ Donate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... styles omitted for brevity
});
```

---

## Phase 5: Testing & Deployment

### Step 5.1: Local Testing

**Backend:**
```bash
cd backend
npm run dev
```

**Mobile:**
```bash
cd mobile-main
npm start
```

**Test Flow:**
1. Login with Kinde
2. See "Connect Google Drive" screen
3. Click "Connect"
4. Google consent screen appears
5. Authorize app
6. Redirected back to app
7. Google Drive connected ✅
8. Upload a photo in message
9. Photo uploads to YOUR Google Drive
10. Other users can view the photo

### Step 5.2: Check Google Drive

1. Go to https://drive.google.com
2. Look for `.parentinghelper/` folder
3. Inside: `media/message-{id}.jpg`
4. Verify file exists

### Step 5.3: Production Deployment

**Before deploying:**
- [ ] Update OAuth redirect URIs in Google Cloud Console
- [ ] Submit app for Google verification (if >100 users)
- [ ] Test with multiple users
- [ ] Monitor API usage in Google Cloud Console
- [ ] Set up error alerts (Sentry, Datadog, etc.)

---

## Troubleshooting

### Issue: "No refresh token received"

**Cause**: User has already authorized the app before.

**Solution**:
1. Go to https://myaccount.google.com/permissions
2. Remove "Parenting Helper" app
3. Try again
4. OR: Use `prompt: 'consent'` in OAuth URL (forces consent screen)

### Issue: "Invalid grant" error when refreshing token

**Cause**: Refresh token expired or revoked.

**Solution**:
1. Mark user's `googleDriveConnected = false`
2. Prompt them to reconnect
3. Refresh tokens can expire if:
   - 6 months of inactivity
   - User revoked access
   - Password changed

### Issue: "Insufficient permissions" error

**Cause**: App doesn't have correct scopes.

**Solution**:
1. Check OAuth scopes include `drive.file`
2. User must re-authorize if scopes change
3. Revoke old token, request new one

### Issue: Files not appearing in user's Drive

**Cause**: Files are in app-created folders (hidden by default).

**Solution**:
1. This is expected behavior with `drive.file` scope
2. Files only visible to the app
3. User can see them by searching Drive for "Parenting Helper"

### Issue: "Rate limit exceeded"

**Cause**: Too many API requests.

**Solution**:
1. Implement request caching
2. Batch requests where possible
3. Upgrade to paid Google Cloud tier
4. Cost: $0.012 per 1,000 requests over free tier

---

## Summary

This implementation guide provides:
1. **Google Cloud setup** (OAuth, Drive API)
2. **Database schema changes** (Prisma migration)
3. **Backend code** (googleDrive.service.js, controllers)
4. **Mobile UI** (GoogleDriveConnectScreen, MyAccountScreen)
5. **Testing procedures**
6. **Troubleshooting tips**

**Next Steps:**
1. Review this guide with the user
2. Decide: Proceed with implementation OR stick with subscriptions
3. If proceeding: Start with Phase 1 (Google Cloud setup)

**Estimated Implementation Time:** 4-6 weeks full-time

**Point of No Return:** After Phase 3 (backend deployed to production), very hard to revert.

---

**Last Updated**: 2025-11-04
**Status**: 🚨 AWAITING USER DECISION
