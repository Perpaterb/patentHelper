# Security

Family Helper takes data security seriously. This document outlines the security measures in place to protect your family's information.

## Overview

Family Helper is designed for families, including co-parenting situations where data integrity and privacy are critical. We implement multiple layers of security to ensure your information remains private and protected.

---

## Authentication & Authorization

### Kinde OAuth 2.0 + PKCE

We use **Kinde** as our identity provider - a dedicated authentication platform trusted by thousands of applications.

- **No passwords stored** - We never store your password. Authentication is handled entirely by Kinde.
- **PKCE Flow** - Mobile apps use Proof Key for Code Exchange, preventing authorization code interception attacks.
- **Cryptographic Token Verification** - All tokens are verified using Kinde's public keys (JWKS), not a shared secret that could leak.

### Token Security

- **Short-lived access tokens** - Access tokens expire quickly, limiting exposure if compromised.
- **Automatic refresh** - Tokens refresh seamlessly without requiring re-login.
- **Secure storage** - Mobile apps store tokens in the device's secure enclave (iOS Keychain / Android Keystore).

### Edge Authentication (oauth2-proxy)

An additional security layer that validates tokens before requests reach the application:

- **Pre-validation** - Invalid tokens are rejected at the edge, before touching the API.
- **DDoS protection** - Malformed requests are blocked early.
- **Reduced attack surface** - The API only processes authenticated requests.

---

## Data Encryption

### Messages - End-to-End Encryption

All messages are encrypted using **AES-256-GCM**:

- **Encryption at rest** - Messages are encrypted before storage in the database.
- **Unique keys per message** - Each message has a unique initialization vector.
- **Tamper detection** - GCM mode detects any modification to encrypted data.

### Data in Transit

- **HTTPS everywhere** - All communication uses TLS 1.2+.
- **HSTS enabled** - Browsers are forced to use HTTPS.
- **Certificate validation** - SSL certificates from Let's Encrypt, auto-renewed.

### Database Security

- **Encrypted connections** - Database connections use SSL.
- **Parameterized queries** - All queries use parameters, preventing SQL injection.
- **No raw SQL** - We use Prisma ORM exclusively.

---

## Access Control

### Role-Based Permissions

Every group member has a role that controls what they can access:

| Role | Access Level |
|------|-------------|
| Admin | Full access - can manage group, subscriptions, export data |
| Parent | Standard access - messaging, calendar, finance |
| Adult | Similar to parent |
| Child | Limited access - no admin features, age-appropriate content |
| Caregiver | Care-related access only |
| Supervisor | Read-only access for oversight |

### Permission Checks

- **Every API endpoint** verifies the user has permission for the requested action.
- **Group membership** is validated on every request.
- **Audit logging** tracks all significant actions.

---

## Audit Logging

All important actions are logged for accountability:

- **Who** - User ID and email
- **What** - Action type (create, update, delete)
- **When** - Timestamp
- **Where** - Group context
- **Details** - Relevant metadata

Audit logs can be exported by group admins for legal or personal records.

---

## Data Protection

### Soft Deletes

Data is never permanently deleted immediately:

- **Deleted items are hidden** - Marked as deleted but retained.
- **Recovery possible** - Admins can restore accidentally deleted content.
- **Legal compliance** - Required for co-parenting documentation needs.

### Data Isolation

- **Group separation** - Data from different family groups is completely isolated.
- **User verification** - Every request verifies the user belongs to the group.
- **No cross-group access** - Impossible to access another family's data.

---

## Infrastructure Security

### Production Environment

| Component | Security Measure |
|-----------|-----------------|
| Server | AWS Lightsail with security groups |
| SSH | Non-standard port, key-based auth only |
| Database | AWS RDS with encryption at rest |
| Files | AWS S3 with private buckets |
| Secrets | Environment variables, never in code |

### Development Practices

- **No secrets in git** - All credentials in `.env` files (gitignored).
- **Dependency scanning** - Regular security audits of npm packages.
- **Code review** - All changes go through pull requests.

---

## Compliance & Best Practices

### Security Standards

- **OWASP Top 10** - We protect against common vulnerabilities:
  - SQL Injection - Prevented by parameterized queries
  - XSS - Input sanitization and output encoding
  - CSRF - Token-based request validation
  - Broken Authentication - Delegated to Kinde

### Privacy by Design

- **Minimal data collection** - We only collect what's necessary.
- **User control** - Users can export or delete their data.
- **Transparent practices** - Clear privacy policy.

---

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **Do not** disclose publicly until we've addressed it.
2. Email security concerns to the app administrator.
3. Provide details to help us reproduce and fix the issue.

We take all reports seriously and will respond promptly.

---

## Summary

Your family's data is protected by:

1. **Industry-standard authentication** (Kinde OAuth 2.0 + PKCE)
2. **Cryptographic token verification** (JWKS - no shared secrets)
3. **Edge security** (oauth2-proxy blocks invalid requests)
4. **Message encryption** (AES-256-GCM)
5. **Encrypted transit** (HTTPS/TLS everywhere)
6. **Role-based access control** (granular permissions)
7. **Complete audit trail** (all actions logged)
8. **Secure infrastructure** (AWS with encryption at rest)

We continuously review and improve our security practices to keep your family's information safe.
