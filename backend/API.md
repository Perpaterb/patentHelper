# Parenting Helper API Documentation

**Version**: 1.0.0
**Last Updated**: 2025-10-21
**Environment**: Local Development
**Base URL**: `http://localhost:3000`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Authentication](#authentication-endpoints)
   - [Files](#files-endpoints)
5. [Testing](#testing)
6. [Rate Limiting](#rate-limiting)

---

## Overview

The Parenting Helper API provides backend services for three products:
1. **Admin Web App** (web-admin/) - Subscriptions, payments, log exports
2. **Parenting Helper Mobile App** (mobile-main/) - Messaging, calendar, finance
3. **PH Messenger Mobile App** (mobile-messenger/) - Messaging only

**Technology Stack**:
- Express.js (local development)
- PostgreSQL (via Prisma ORM)
- Kinde OAuth for authentication
- JWT tokens (Access + Refresh)
- MailHog for local email testing

**Architecture**:
- Currently: Express.js server running locally
- Phase 6: Will migrate to AWS Lambda functions (same business logic)

---

## Authentication

The API uses **Kinde OAuth 2.0** with JWT tokens for authentication.

### Token Types

1. **Access Token** (JWT)
   - Expiration: 15 minutes
   - Storage: Client-side (localStorage or memory)
   - Usage: `Authorization: Bearer <access_token>` header

2. **Refresh Token** (JWT)
   - Expiration: 7 days
   - Storage: HTTP-only cookie (automatic)
   - Usage: Automatically sent with requests, used to get new access token

### Authentication Flow

```
1. User clicks "Login" → GET /auth/login
2. Redirected to Kinde login page
3. User logs in with Kinde
4. Kinde redirects to /auth/callback
5. Server creates/updates user in database
6. Server returns access token + sets refresh token cookie
7. Client stores access token
8. Client uses access token for protected endpoints
9. When access token expires → POST /auth/refresh (automatic)
```

### Protected Endpoints

Protected endpoints require the `Authorization` header:

```http
Authorization: Bearer <access_token>
```

**Response if missing or invalid**:
```json
{
  "error": "Unauthorized",
  "message": "No authentication token provided",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

### Subscription-Required Endpoints

Some endpoints require an active subscription (admin role). Response if subscription is missing:

```json
{
  "error": "Subscription Required",
  "message": "This action requires an active subscription",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

### Common HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Validation error, missing required fields |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Unexpected server error |

---

## Endpoints

### Health Check

#### `GET /health`

Basic health check to verify server is running.

**Authentication**: None
**Subscription Required**: No

**Response**: `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2025-10-21T12:00:00.000Z",
  "uptime": 12345.67,
  "service": "parenting-helper-api",
  "version": "1.0.0",
  "environment": "development"
}
```

---

#### `GET /health/ready`

Readiness check - verifies database connectivity and critical services.

**Authentication**: None
**Subscription Required**: No

**Response**: `200 OK` (if ready)
```json
{
  "status": "ready",
  "timestamp": "2025-10-21T12:00:00.000Z",
  "checks": {
    "database": "connected",
    "email": "connected"
  }
}
```

**Response**: `503 Service Unavailable` (if not ready)
```json
{
  "status": "not ready",
  "timestamp": "2025-10-21T12:00:00.000Z",
  "checks": {
    "database": "disconnected",
    "email": "connected"
  }
}
```

---

### Authentication Endpoints

#### `GET /auth/login`

Initiate login with Kinde OAuth. Redirects to Kinde login page.

**Authentication**: None
**Subscription Required**: No

**Response**: `302 Redirect` to Kinde login page

**Error Response**: `500 Internal Server Error`
```json
{
  "error": "Authentication error",
  "message": "Failed to initiate login",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

---

#### `GET /auth/register`

Initiate registration with Kinde OAuth. Redirects to Kinde registration page.

**Authentication**: None
**Subscription Required**: No

**Response**: `302 Redirect` to Kinde registration page

**Error Response**: `500 Internal Server Error`
```json
{
  "error": "Authentication error",
  "message": "Failed to initiate registration",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

---

#### `GET /auth/callback`

OAuth callback endpoint. Kinde redirects here after successful login/registration.

**Authentication**: None (Kinde provides auth code)
**Subscription Required**: No

**Query Parameters**:
- `code` (string, required): OAuth authorization code from Kinde
- `state` (string, optional): CSRF protection token

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "isSubscribed": false
  }
}
```

**Side Effects**:
- Creates new user in database if doesn't exist
- Updates user email if changed in Kinde
- Sets `refreshToken` HTTP-only cookie (7 day expiration)

**Error Responses**:

`401 Unauthorized` - Authentication failed
```json
{
  "error": "Authentication failed",
  "message": "Could not authenticate with Kinde",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

`500 Internal Server Error` - Server error
```json
{
  "error": "Authentication callback failed",
  "message": "Error message details",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

---

#### `POST /auth/refresh`

Refresh access token using refresh token from cookie.

**Authentication**: None (uses refresh token from cookie)
**Subscription Required**: No

**Request Headers**:
- `Cookie: refreshToken=<refresh_token>` (automatic)

**Response**: `200 OK`
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "isSubscribed": false
  }
}
```

**Side Effects**:
- Sets new `refreshToken` HTTP-only cookie (7 day expiration)

**Error Responses**:

`401 Unauthorized` - No refresh token provided
```json
{
  "error": "Unauthorized",
  "message": "No refresh token provided",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

`401 Unauthorized` - Invalid or expired refresh token
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired refresh token",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

---

#### `GET /auth/verify`

Verify access token validity (useful for testing).

**Authentication**: Required (Bearer token)
**Subscription Required**: No

**Request Headers**:
```
Authorization: Bearer <access_token>
```

**Response**: `200 OK`
```json
{
  "valid": true,
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "isSubscribed": false
  },
  "expiresAt": "2025-10-21T12:15:00.000Z"
}
```

**Error Response**: `401 Unauthorized` (if token invalid/expired)

---

#### `GET /auth/me`

Get current authenticated user's profile.

**Authentication**: Required (Bearer token)
**Subscription Required**: No

**Request Headers**:
```
Authorization: Bearer <access_token>
```

**Response**: `200 OK`
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "kindeId": "kp_abc123...",
  "isSubscribed": false,
  "createdAt": "2025-10-21T10:00:00.000Z",
  "updatedAt": "2025-10-21T12:00:00.000Z"
}
```

**Error Response**: `401 Unauthorized` (if not authenticated)

---

#### `POST /auth/logout`

Logout user (clears refresh token cookie).

**Authentication**: None
**Subscription Required**: No

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Side Effects**:
- Clears `refreshToken` HTTP-only cookie
- Client should also delete access token from storage

---

### Files Endpoints

#### `POST /files/upload`

Upload a single file to local storage.

**Authentication**: None (TODO: Will require auth in future)
**Subscription Required**: No
**Content-Type**: `multipart/form-data`

**Request Body** (form-data):
- `file` (file, required): The file to upload
- `category` (string, optional): File category - `messages`, `calendar`, `finance`, `profiles` (default: `messages`)
- `groupId` (UUID, optional): Group ID if file is associated with a group
- `userId` (UUID, required): User ID (TODO: will come from auth session)

**Example Request** (using curl):
```bash
curl -X POST http://localhost:3000/files/upload \
  -F "file=@photo.jpg" \
  -F "category=messages" \
  -F "groupId=550e8400-e29b-41d4-a716-446655440000" \
  -F "userId=660e8400-e29b-41d4-a716-446655440001"
```

**Response**: `201 Created`
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "fileId": "770e8400-e29b-41d4-a716-446655440002",
    "fileName": "photo.jpg",
    "originalName": "photo.jpg",
    "mimeType": "image/jpeg",
    "size": 2048576,
    "url": "/files/770e8400-e29b-41d4-a716-446655440002",
    "category": "messages",
    "uploadedBy": "660e8400-e29b-41d4-a716-446655440001",
    "groupId": "550e8400-e29b-41d4-a716-446655440000",
    "uploadedAt": "2025-10-21T12:00:00.000Z"
  }
}
```

**Side Effects**:
- Saves file to `uploads/` directory
- Creates record in `files` table (database)

**Error Responses**:

`400 Bad Request` - No file provided
```json
{
  "error": "Bad Request",
  "message": "No file uploaded",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

`400 Bad Request` - Invalid category
```json
{
  "error": "Bad Request",
  "message": "Invalid category. Must be one of: messages, calendar, finance, profiles",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

`400 Bad Request` - Missing userId
```json
{
  "error": "Bad Request",
  "message": "userId is required",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

---

#### `POST /files/upload-multiple`

Upload multiple files at once (up to 10 files).

**Authentication**: None (TODO: Will require auth in future)
**Subscription Required**: No
**Content-Type**: `multipart/form-data`

**Request Body** (form-data):
- `files` (files, required): Array of files to upload (max 10)
- `category` (string, optional): File category (applies to all files)
- `groupId` (UUID, optional): Group ID (applies to all files)
- `userId` (UUID, required): User ID

**Example Request** (using curl):
```bash
curl -X POST http://localhost:3000/files/upload-multiple \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg" \
  -F "files=@video.mp4" \
  -F "category=messages" \
  -F "groupId=550e8400-e29b-41d4-a716-446655440000" \
  -F "userId=660e8400-e29b-41d4-a716-446655440001"
```

**Response**: `201 Created`
```json
{
  "success": true,
  "message": "3 files uploaded successfully",
  "files": [
    {
      "fileId": "770e8400-e29b-41d4-a716-446655440002",
      "fileName": "photo1.jpg",
      "originalName": "photo1.jpg",
      "mimeType": "image/jpeg",
      "size": 2048576,
      "url": "/files/770e8400-e29b-41d4-a716-446655440002",
      "category": "messages",
      "uploadedBy": "660e8400-e29b-41d4-a716-446655440001",
      "groupId": "550e8400-e29b-41d4-a716-446655440000",
      "uploadedAt": "2025-10-21T12:00:00.000Z"
    },
    // ... more files
  ]
}
```

**Error Responses**:

`400 Bad Request` - No files provided
```json
{
  "error": "Bad Request",
  "message": "No files uploaded",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

`400 Bad Request` - Too many files
```json
{
  "error": "Bad Request",
  "message": "Too many files. Maximum 10 files allowed",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

---

#### `GET /files/:fileId`

Download a file by ID.

**Authentication**: None (TODO: Will require auth + permission check in future)
**Subscription Required**: No

**URL Parameters**:
- `fileId` (UUID, required): The file ID

**Example Request**:
```bash
curl http://localhost:3000/files/770e8400-e29b-41d4-a716-446655440002 \
  --output downloaded-file.jpg
```

**Response**: `200 OK`
- Content-Type: Original file MIME type
- Content-Disposition: `attachment; filename="original-filename.jpg"`
- Body: File binary data

**Error Responses**:

`404 Not Found` - File doesn't exist
```json
{
  "error": "Not Found",
  "message": "File not found",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

`500 Internal Server Error` - File exists in database but missing from storage
```json
{
  "error": "Internal Server Error",
  "message": "File not found in storage",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

---

#### `GET /files/:fileId/metadata`

Get file metadata without downloading the file.

**Authentication**: None (TODO: Will require auth in future)
**Subscription Required**: No

**URL Parameters**:
- `fileId` (UUID, required): The file ID

**Example Request**:
```bash
curl http://localhost:3000/files/770e8400-e29b-41d4-a716-446655440002/metadata
```

**Response**: `200 OK`
```json
{
  "fileId": "770e8400-e29b-41d4-a716-446655440002",
  "fileName": "photo.jpg",
  "originalName": "photo.jpg",
  "mimeType": "image/jpeg",
  "size": 2048576,
  "url": "/files/770e8400-e29b-41d4-a716-446655440002",
  "category": "messages",
  "uploadedBy": "660e8400-e29b-41d4-a716-446655440001",
  "groupId": "550e8400-e29b-41d4-a716-446655440000",
  "uploadedAt": "2025-10-21T12:00:00.000Z"
}
```

**Error Response**: `404 Not Found` (if file doesn't exist)

---

#### `GET /files/storage-usage/:userId`

Get storage usage for a specific user.

**Authentication**: None (TODO: Will require auth in future)
**Subscription Required**: No

**URL Parameters**:
- `userId` (UUID, required): The user ID

**Example Request**:
```bash
curl http://localhost:3000/files/storage-usage/660e8400-e29b-41d4-a716-446655440001
```

**Response**: `200 OK`
```json
{
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "totalBytes": 524288000,
  "totalMB": 500,
  "totalGB": 0.49,
  "fileCount": 42,
  "breakdown": {
    "messages": { "bytes": 314572800, "mb": 300, "count": 25 },
    "calendar": { "bytes": 104857600, "mb": 100, "count": 10 },
    "finance": { "bytes": 52428800, "mb": 50, "count": 5 },
    "profiles": { "bytes": 52428800, "mb": 50, "count": 2 }
  }
}
```

**Note**: This endpoint currently calculates storage from file records in the database. In production, it will check against the `storage_usage` table which tracks storage per admin per group.

**Error Response**: `500 Internal Server Error` (if query fails)

---

## Testing

### Local Testing

All endpoints can be tested locally at `http://localhost:3000`.

**Prerequisites**:
1. Start PostgreSQL + MailHog: `docker-compose up -d`
2. Start backend server: `cd backend && npm run dev`

### Test Utilities

#### Email Testing Utility

Test email sending with all templates:

```bash
# Test all email templates
node backend/utils/sendTestEmail.js

# Test specific template
node backend/utils/sendTestEmail.js welcome
node backend/utils/sendTestEmail.js trial_reminder
node backend/utils/sendTestEmail.js log_export
node backend/utils/sendTestEmail.js basic

# View emails in MailHog
open http://localhost:8025
```

#### JWT Token Generator

Generate test JWT tokens without OAuth flow:

```bash
node backend/utils/generateTestToken.js
```

This will output an access token you can use for testing protected endpoints.

### Manual Testing with curl

#### Health Check
```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/ready
```

#### File Upload
```bash
# Single file
curl -X POST http://localhost:3000/files/upload \
  -F "file=@test.jpg" \
  -F "category=messages" \
  -F "userId=00000000-0000-0000-0000-000000000001"

# Multiple files
curl -X POST http://localhost:3000/files/upload-multiple \
  -F "files=@test1.jpg" \
  -F "files=@test2.jpg" \
  -F "category=messages" \
  -F "userId=00000000-0000-0000-0000-000000000001"
```

#### File Download
```bash
curl http://localhost:3000/files/<FILE_ID> --output downloaded.jpg
```

#### Storage Usage
```bash
curl http://localhost:3000/files/storage-usage/00000000-0000-0000-0000-000000000001
```

#### Authentication (with test token)
```bash
# Generate token
ACCESS_TOKEN=$(node backend/utils/generateTestToken.js | grep "Access Token:" | cut -d' ' -f3)

# Test protected endpoint
curl http://localhost:3000/auth/verify \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Get user profile
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Postman/Thunder Client Collection

See the accompanying `API.postman_collection.json` for a complete collection of API requests ready to import into Postman or Thunder Client.

---

## Rate Limiting

**Current Status**: Not implemented (local development only)

**Phase 6 (Production)**: Will implement rate limiting on all public endpoints:
- Authentication endpoints: 5 requests per minute per IP
- File upload endpoints: 10 requests per minute per user
- Other endpoints: 60 requests per minute per user

---

## Future Endpoints (Phase 2+)

The following endpoints will be added in future phases:

### Phase 2: Groups & Members
- `POST /groups` - Create group
- `GET /groups/:groupId` - Get group details
- `PUT /groups/:groupId` - Update group
- `POST /groups/:groupId/members` - Add member
- `DELETE /groups/:groupId/members/:memberId` - Remove member
- `GET /groups/:groupId/audit-logs` - Get audit logs

### Phase 3: Messaging
- `POST /messages` - Send message
- `GET /messages/:messageGroupId` - Get messages
- `PUT /messages/:messageId` - Edit message
- `DELETE /messages/:messageId` - Hide message (soft delete)
- `POST /messages/:messageId/reactions` - Add reaction

### Phase 4: Calendar
- `POST /calendar/events` - Create event
- `GET /calendar/events` - Get events
- `PUT /calendar/events/:eventId` - Update event
- `DELETE /calendar/events/:eventId` - Delete event
- `POST /calendar/events/:eventId/responses` - Respond to event

### Phase 5: Finance
- `POST /finance/expenses` - Log expense
- `GET /finance/expenses` - Get expenses
- `PUT /finance/expenses/:expenseId` - Update expense
- `POST /finance/expenses/:expenseId/split` - Split expense

---

**Questions or issues?** Contact: support@parentinghelperapp.com
