# Security Documentation - Three-Sided Flashcard Application

## Table of Contents
1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Security](#data-security)
4. [Input Validation & Sanitization](#input-validation--sanitization)
5. [Rate Limiting](#rate-limiting)
6. [Network Security](#network-security)
7. [Firebase Security Rules](#firebase-security-rules)
8. [Content Security](#content-security)
9. [Session Management](#session-management)
10. [API Security](#api-security)
11. [Error Handling](#error-handling)
12. [Admin Security](#admin-security)
13. [Security Monitoring](#security-monitoring)
14. [Vulnerability Management](#vulnerability-management)
15. [Deployment Security](#deployment-security)
16. [Data Privacy & GDPR](#data-privacy--gdpr)

## Overview

The Three-Sided flashcard application implements a comprehensive security framework designed to protect user data, prevent unauthorized access, and maintain system integrity. This document outlines all security measures implemented across the application stack.

**Security Architecture:**
- **Authentication**: Firebase Authentication with Google OAuth
- **Authorization**: Role-based access control with Firestore Security Rules
- **Data Validation**: Comprehensive input sanitization and validation
- **Rate Limiting**: Multi-layer rate limiting for API endpoints
- **Content Security**: XSS prevention and malicious content detection
- **Session Security**: Inactivity timeout and secure session management

## Authentication & Authorization

### Firebase Authentication
```javascript
// Authentication Provider: Google OAuth 2.0
const provider = new GoogleAuthProvider();
provider.addScope('profile');
provider.addScope('email');
```

**Implemented Features:**
- ✅ Google OAuth 2.0 integration
- ✅ JWT token validation
- ✅ Automatic token refresh
- ✅ Secure logout with token invalidation
- ✅ Session persistence across browser tabs

### Authorization Levels

#### 1. Guest Users
- **Permissions**: Read-only access to public flashcards
- **Limitations**: No creation, limited AI usage (rate-limited)
- **Security**: IP-based rate limiting

#### 2. Authenticated Users
- **Permissions**: Full CRUD on own content, public content interaction
- **Security**: User ID validation, owner-only access patterns
- **Features**: Profile creation, private flashcards, study analytics

#### 3. Premium Users
- **Additional Features**: Enhanced AI usage quotas
- **Security**: Subscription validation, usage tracking

#### 4. Admin Users
- **Email Whitelist**: `three.dash.sided@gmail.com`
- **Permissions**: Full system access, user management, analytics
- **Security**: Multi-layer verification, audit logging

```javascript
// Admin verification example
const ADMIN_EMAILS = ['three.dash.sided@gmail.com'];
const isAdmin = ADMIN_EMAILS.includes(user.email);
```

## Data Security

### Data Classification

#### Public Data
- Public flashcards and profiles
- Community statistics
- Leaderboard data

#### Private Data
- User's private flashcards
- Study analytics and progress
- Personal profile information

#### Sensitive Data
- Authentication tokens
- Admin operations logs
- User email addresses

### Data Protection Measures

1. **Encryption in Transit**
   - All data transmitted over HTTPS/TLS 1.3
   - Firebase SDK enforces secure connections
   - API endpoints require encrypted connections

2. **Encryption at Rest**
   - Firebase Firestore provides automatic encryption
   - Cloud Functions environment variables encrypted
   - Secrets managed through Google Secret Manager

3. **Data Minimization**
   - Only required data is collected and stored
   - Automatic cleanup of temporary data
   - User can delete their data anytime

## Input Validation & Sanitization

### SecurityService Implementation

The application implements comprehensive input validation through the `SecurityService` class:

```javascript
// Example: Flashcard validation
static validateFlashcardInput(data) {
  const errors = [];
  const sanitizedData = {};
  
  // Statement validation (3-5000 characters)
  if (!data.statement || data.statement.length < 3) {
    errors.push('Statement is required and must be at least 3 characters');
  }
  
  // Sanitization with XSS prevention
  sanitizedData.statement = this.sanitizeInput(data.statement, {
    maxLength: 5000,
    allowLatex: true,
    allowHtml: false
  });
}
```

### Validation Rules

#### Flashcard Content
- **Statement**: 3-5,000 characters, LaTeX allowed, HTML stripped
- **Hints**: 0-5,000 characters, LaTeX allowed, HTML stripped  
- **Proof**: 0-10,000 characters, LaTeX allowed, HTML stripped
- **Tags**: Maximum 20 tags, 50 chars each, alphanumeric only
- **Subject**: 0-100 characters, alphanumeric only

#### Profile Data
- **Display Name**: 2-50 characters, alphanumeric + basic punctuation
- **Bio**: 0-500 characters, HTML stripped
- **Subject**: 0-100 characters, alphanumeric only

### XSS Prevention

1. **Input Sanitization**
   ```javascript
   // Remove dangerous HTML/JavaScript
   sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
   sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
   sanitized = sanitized.replace(/javascript:/gi, '');
   ```

2. **Content Security Policy**
   - Script sources restricted to trusted domains
   - Inline scripts blocked
   - Object and embed sources restricted

3. **Output Encoding**
   - All user content HTML-escaped before rendering
   - LaTeX content processed through safe MathJax renderer

## Rate Limiting

### Multi-Layer Rate Limiting

#### 1. Client-Side Rate Limiting
```javascript
// SecurityService rate limiter
static checkRateLimit(key, limit = 10, windowMs = 60000) {
  // Returns: { allowed: boolean, retryAfter: number }
}
```

#### 2. Guest User Limits
- **AI Requests**: 5 requests per 30 days per IP
- **Public Card Access**: Unlimited read, no write
- **Search Queries**: 100 per hour per IP

#### 3. Authenticated User Limits
- **Flashcard Creation**: 100 per hour per user
- **AI Requests**: 50 per day per user (free), 500 per day (premium)
- **Profile Updates**: 10 per hour per user

#### 4. Function-Level Limits
```javascript
// Cloud Functions rate limiting
const guestIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
if (recentRequests.length >= GUEST_LIMIT) {
  return res.status(429).json({ error: "Rate limit exceeded" });
}
```

## Network Security

### CORS Configuration
```javascript
const allowedOrigins = [
  "https://three-sided.com",
  "https://three-sided-flashcard-app.web.app"
];
```

### HTTPS Enforcement
- All production traffic requires HTTPS
- HTTP requests automatically redirected to HTTPS
- HSTS headers implemented

### API Security
- **Authentication**: Bearer token validation
- **Origin Validation**: Strict CORS policy
- **Request Size Limits**: Prevent DoS attacks
- **Timeout Protection**: Request timeout limits

## Firebase Security Rules

### Firestore Security Rules

The application implements comprehensive Firestore security rules:

#### Private Collections
```javascript
// Private flashcards - owner only access
match /cards/{docId} {
  allow create: if request.auth != null && 
                   request.resource.data.userId == request.auth.uid;
  allow read, update, delete: if request.auth != null && 
                                 request.auth.uid == resource.data.userId;
}
```

#### Public Collections
```javascript
// Public flashcards - read for all, create for authenticated
match /publicCards/{cardId} {
  allow read: if true;
  allow create: if request.auth != null;
  allow update: if request.auth != null && 
                   request.auth.uid == resource.data.userId;
}
```

#### Friend System
```javascript
// Friend requests - only involved parties can access
match /friendRequests/{requestId} {
  allow read: if request.auth != null && (
    request.auth.uid == resource.data.from || 
    request.auth.uid == resource.data.to
  );
}
```

#### Admin Collections
- Admin email verification required
- Additional server-side validation
- Audit logging for all admin operations

## Content Security

### Malicious Content Detection

```javascript
// SecurityService suspicious content detection
static detectSuspiciousContent(content) {
  const suspiciousPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,  // Script tags
    /javascript:/gi,                          // JavaScript URLs
    /data:text\/html/gi,                     // Data URLs
    // ... additional patterns
  ];
}
```

### LaTeX Security
- LaTeX content allowed for mathematical notation
- MathJax renderer configured with safe settings
- No execution of arbitrary code through LaTeX

### User-Generated Content
1. **Validation**: All content validated before storage
2. **Sanitization**: HTML stripped, dangerous patterns removed  
3. **Moderation**: Admin tools for content review
4. **Reporting**: User reporting system for inappropriate content

## Session Management

### Inactivity Timeout
```javascript
// 2-hour inactivity timeout
static INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 120 minutes

// Activity tracking
const events = ['mousedown', 'mousemove', 'keypress', 'scroll'];
events.forEach(event => {
  document.addEventListener(event, updateActivity, { passive: true });
});
```

### Session Security Features
- ✅ Automatic logout after 2 hours of inactivity
- ✅ Warning shown at 100 minutes (83% of timeout)
- ✅ Activity tracking across user interactions
- ✅ Secure token refresh
- ✅ Cross-tab session synchronization

## API Security

### Cloud Functions Security

#### Authentication Validation
```javascript
// ID Token verification
const idToken = authHeader.startsWith("Bearer ") 
  ? authHeader.split("Bearer ")[1] 
  : null;

if (idToken) {
  const decoded = await admin.auth().verifyIdToken(idToken);
  uid = decoded.uid;
}
```

#### Request Validation
- **Content-Type**: Enforced application/json
- **Request Size**: Limited to prevent DoS
- **Parameter Validation**: All inputs validated
- **Origin Validation**: CORS strictly enforced

#### AI Service Security
- **API Key Protection**: Stored in Google Secret Manager
- **Usage Quotas**: Per-user and per-IP limits
- **Input Sanitization**: All prompts sanitized before AI processing
- **Output Validation**: AI responses validated before return

## Error Handling

### Production Error Messages
```javascript
// SecurityService error handling
static getPublicErrorMessage(error, isProduction = true) {
  // Maps internal errors to safe public messages
  // Prevents information disclosure
}
```

### Error Categories
1. **Authentication Errors**: Generic messages prevent user enumeration
2. **Authorization Errors**: Clear permission denial without system details
3. **Validation Errors**: Specific feedback for user input
4. **System Errors**: Generic messages logged internally

### Logging Strategy
- **Client Errors**: Minimal logging, no sensitive data
- **Server Errors**: Comprehensive logging with request context
- **Security Events**: Separate security audit log
- **PII Protection**: All logs scrubbed of personal information

## Admin Security

### Admin Authentication
1. **Email Whitelist**: Hardcoded admin email addresses
2. **Multi-Layer Verification**: Client and server-side checks
3. **Session Validation**: Admin privileges validated per request
4. **Audit Logging**: All admin actions logged

### Admin Features Security
```javascript
// Admin verification in functions
const isAdmin = decoded.email === "three.dash.sided@gmail.com";
if (!isAdmin) {
  return res.status(403).json({ error: "Admin access required" });
}
```

### Admin Panel Security
- **Direct URL Access**: Protected admin routes
- **CSRF Protection**: Token-based request validation
- **Action Confirmation**: Critical actions require confirmation
- **Time-based Access**: Admin sessions expire faster

## Security Monitoring

### Automated Monitoring
1. **Failed Authentication Attempts**: Rate limiting after failures
2. **Unusual Access Patterns**: IP-based monitoring
3. **Content Violations**: Automated flagging system
4. **API Abuse**: Rate limit violation tracking

### Manual Review
- **User Reports**: Content moderation queue
- **Admin Alerts**: Security event notifications
- **Usage Analytics**: Anomaly detection
- **Regular Audits**: Periodic security reviews

### Security Metrics
- Authentication failure rates
- Rate limit violations
- Suspicious content detections
- Admin action frequency

## Vulnerability Management

### Dependency Security
```bash
# Regular security audits
npm audit
npm audit fix

# Automated dependency updates
# GitHub Dependabot enabled for security updates
```

### Security Testing
1. **Input Validation Testing**: Automated fuzzing
2. **XSS Testing**: Manual and automated testing
3. **Authentication Testing**: Token validation tests
4. **Authorization Testing**: Permission boundary tests

### Update Process
1. **Security Patches**: Immediate deployment for critical issues
2. **Dependency Updates**: Weekly review and updates
3. **Framework Updates**: Quarterly major version reviews
4. **Security Rules**: Monthly review and updates

## Deployment Security

### Firebase Hosting Security
- **HTTPS Enforced**: All traffic encrypted
- **CDN Protection**: DDoS mitigation
- **Asset Integrity**: Subresource integrity checks
- **Security Headers**: CSP, HSTS, X-Frame-Options

### Cloud Functions Security
- **IAM Roles**: Principle of least privilege
- **VPC Configuration**: Network isolation where applicable
- **Environment Variables**: Secure configuration management
- **Secret Management**: Google Secret Manager integration

### CI/CD Security
```yaml
# Security in deployment pipeline
- Security scanning in CI/CD
- Automated vulnerability checks
- Secure artifact management
- Environment isolation
```

## Data Privacy & GDPR

### User Rights
1. **Data Access**: Users can view all their data
2. **Data Portability**: Export functionality available
3. **Data Deletion**: Complete account deletion
4. **Data Correction**: Profile editing capabilities

### Data Retention
- **User Data**: Retained until account deletion
- **Analytics Data**: Anonymized after 2 years
- **Logs**: Security logs retained for 1 year
- **Backup Data**: Encrypted, automatically purged

### Privacy Controls
```javascript
// Privacy settings
const privacySettings = {
  profileVisibility: 'public' | 'private',
  analyticsOptOut: boolean,
  emailNotifications: boolean
};
```

### Compliance Features
- ✅ GDPR Article 7: Clear consent mechanisms
- ✅ GDPR Article 17: Right to erasure (delete account)
- ✅ GDPR Article 20: Data portability (export)
- ✅ GDPR Article 25: Privacy by design

## Security Contact

For security issues or concerns:
- **Email**: three.dash.sided@gmail.com
- **Report Type**: Include "SECURITY" in subject line
- **Response Time**: 24-48 hours for security issues

## Security Checklist

### Pre-Deployment Security Checklist
- [ ] Input validation implemented for all user inputs
- [ ] XSS prevention measures in place
- [ ] Authentication properly configured
- [ ] Authorization rules tested
- [ ] Rate limiting configured
- [ ] Error handling doesn't leak information
- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] Dependencies updated and audited
- [ ] Security rules tested

### Post-Deployment Security Checklist
- [ ] Monitor authentication failures
- [ ] Review rate limit violations
- [ ] Check for suspicious content
- [ ] Verify admin access logs
- [ ] Monitor API usage patterns
- [ ] Review user reports
- [ ] Update security documentation
- [ ] Schedule next security review

---

**Last Updated**: December 2024  
**Next Review**: Quarterly security reviews scheduled  
**Version**: 1.0  

This security documentation is maintained by the Three-Sided development team and should be reviewed and updated with any security-related changes to the application.
