# CivicTrack Authentication System

## Overview

The CivicTrack authentication system provides comprehensive user management with JWT-based authentication, role-based access control, and support for both registered and anonymous users.

## Features

### Core Authentication
- **JWT-based authentication** with configurable expiration
- **Password hashing** using bcrypt with salt rounds
- **Anonymous user sessions** for unregistered users
- **Email verification** support (framework ready)
- **Secure logout** with client-side token removal

### User Management
- **User registration** with email and password
- **User login** with credential validation
- **Profile management** (view/update)
- **Password change** with current password verification
- **Account banning/unbanning** (admin only)

### Role-Based Access Control
- **Three user roles**: `citizen`, `authority`, `admin`
- **Role-based middleware** for route protection
- **Multi-role support** for flexible permissions
- **Admin-only operations** for user management

### Security Features
- **Password strength validation** (8+ chars, mixed case, numbers, special chars)
- **Email format validation**
- **Input sanitization** and validation
- **Rate limiting** support
- **Secure error handling** without information leakage

## API Endpoints

### Public Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPass123!",
  "role": "citizen"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "citizen",
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPass123!"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "citizen",
    "isVerified": false,
    "lastActiveAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

#### Create Anonymous Session
```http
POST /api/auth/anonymous
```

**Response:**
```json
{
  "message": "Anonymous session created",
  "user": {
    "id": "uuid",
    "email": null,
    "role": "citizen",
    "isVerified": false,
    "isAnonymous": true
  },
  "sessionToken": "anonymous_jwt_token_here"
}
```

### Protected Endpoints

#### Get User Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

#### Update User Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newemail@example.com"
}
```

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

#### Verify Token
```http
GET /api/auth/verify
Authorization: Bearer <token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### Admin Endpoints

#### Get All Users
```http
GET /api/auth/users
Authorization: Bearer <admin_token>
```

#### Ban/Unban User
```http
POST /api/auth/users/:id/ban
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "banned": true,
  "reason": "Violation of terms"
}
```

#### Update User Role
```http
POST /api/auth/users/:id/role
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role": "authority"
}
```

## Middleware Usage

### Authentication Middleware

#### Required Authentication
```javascript
const { authenticateToken } = require('../middleware/auth');

router.get('/protected-route', authenticateToken, (req, res) => {
  // req.user contains authenticated user info
  res.json({ user: req.user });
});
```

#### Optional Authentication
```javascript
const { optionalAuth } = require('../middleware/auth');

router.get('/public-route', optionalAuth, (req, res) => {
  // req.user contains user info if authenticated, or anonymous user info
  res.json({ user: req.user });
});
```

#### Role-Based Access
```javascript
const { authenticateToken, requireRole } = require('../middleware/auth');

// Single role
router.post('/admin-only', authenticateToken, requireRole('admin'), handler);

// Multiple roles
router.post('/staff-only', authenticateToken, requireRole(['admin', 'authority']), handler);
```

#### Verified Users Only
```javascript
const { authenticateToken, requireVerified } = require('../middleware/auth');

router.post('/verified-only', authenticateToken, requireVerified, handler);
```

## User Object Structure

### Authenticated User
```javascript
req.user = {
  id: "uuid",
  email: "user@example.com",
  role: "citizen|authority|admin",
  isVerified: true|false,
  isAnonymous: false
}
```

### Anonymous User
```javascript
req.user = {
  id: null,
  email: null,
  role: "citizen",
  isVerified: false,
  isAnonymous: true,
  sessionToken: "jwt_token" // if provided
}
```

## Error Handling

All authentication errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": [], // Optional validation details
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Common Error Codes

- `MISSING_TOKEN` - No authorization token provided
- `INVALID_TOKEN` - Token is malformed or invalid
- `TOKEN_EXPIRED` - Token has expired
- `USER_NOT_FOUND` - User account not found
- `USER_BANNED` - User account is banned
- `VALIDATION_ERROR` - Input validation failed
- `REGISTRATION_FAILED` - User registration failed
- `LOGIN_FAILED` - Login attempt failed
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `VERIFICATION_REQUIRED` - Email verification required
- `ACCOUNT_NOT_VERIFIED` - Account email not verified

## Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=civic_track
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

### Password Requirements

- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character (@$!%*?&)

## Testing

The authentication system includes comprehensive tests:

```bash
# Run all authentication tests
npm test -- --testPathPattern=auth

# Run service-level tests
npm test -- --testPathPattern=authService

# Run route-level tests
npm test -- --testPathPattern=authRoutes
```

## Security Considerations

1. **JWT Secret**: Use a strong, unique JWT secret in production
2. **Password Hashing**: Uses bcrypt with 12 salt rounds
3. **Rate Limiting**: Implement rate limiting on authentication endpoints
4. **HTTPS**: Always use HTTPS in production
5. **Token Storage**: Store tokens securely on the client side
6. **Token Expiration**: Configure appropriate token expiration times
7. **Input Validation**: All inputs are validated and sanitized

## Integration with Requirements

This authentication system fulfills the following requirements:

- **Requirement 1.3**: Anonymous and verified reporting support
- **Requirement 6.1**: Admin access to flagged reports
- **Requirement 7.4**: Admin user management capabilities
- **Requirement 7.5**: User banning functionality
- **Requirement 8.1**: Authority role for status updates

## Next Steps

1. **Email Verification**: Implement email verification for new accounts
2. **Password Reset**: Add password reset functionality
3. **Two-Factor Authentication**: Consider 2FA for admin accounts
4. **Session Management**: Implement session invalidation
5. **Audit Logging**: Add authentication event logging