# Content Flagging System

The CivicTrack content flagging system allows users to report inappropriate content and provides administrators with tools to moderate the platform effectively.

## Overview

The flagging system implements a community-driven moderation approach where:
- Users can flag issues they consider inappropriate
- Issues are automatically hidden when they receive multiple flags
- Administrators can review flagged content and make moderation decisions
- Repeat offenders can be banned from the platform

## Features

### User Flagging
- **Authenticated Flagging**: Verified users can flag content
- **Anonymous Flagging**: Anonymous users can flag using session tracking
- **Duplicate Prevention**: Users cannot flag the same issue multiple times
- **Self-Flag Prevention**: Users cannot flag their own content
- **Location-Based Access**: Users can only flag issues within their radius

### Automatic Moderation
- **Flag Threshold**: Issues are auto-hidden after 3 flags
- **Immediate Effect**: Hidden issues are removed from public view
- **Reversible**: Admin review can restore hidden content

### Admin Moderation
- **Review Interface**: Admins can review all flagged content
- **Multiple Actions**: Approve, reject, or delete flagged issues
- **Audit Trail**: All moderation actions are logged
- **Bulk Operations**: Handle multiple flags efficiently

### User Management
- **Ban System**: Ban users for policy violations
- **Automatic Hiding**: Banned users' content is hidden
- **Statistics Tracking**: Monitor user flagging behavior
- **Ban Recommendations**: System suggests users for potential bans

## API Endpoints

### Flag an Issue
```http
POST /api/issues/:id/flag
Authorization: Bearer <token> (optional for anonymous)
Content-Type: application/json

{
  "reason": "This content is spam",
  "flag_type": "spam"
}
```

**Query Parameters:**
- `userLat`: User latitude for location verification
- `userLng`: User longitude for location verification

**Flag Types:**
- `spam`: Unwanted promotional content
- `inappropriate`: Offensive or inappropriate content
- `irrelevant`: Content not related to civic issues
- `duplicate`: Duplicate of existing issue
- `other`: Other reasons

### Get Flagged Issues (Admin)
```http
GET /api/admin/flagged-issues
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `status`: `pending`, `reviewed`, or `all` (default: `pending`)
- `limit`: Number of results (1-100, default: 50)
- `offset`: Pagination offset (default: 0)
- `flagType`: Filter by flag type
- `sortBy`: Sort field (`flag_count`, `created_at`, `updated_at`)
- `sortOrder`: Sort direction (`ASC` or `DESC`)

### Review Flagged Issue (Admin)
```http
POST /api/admin/issues/:id/review
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "action": "approve",
  "reason": "Content is appropriate"
}
```

**Actions:**
- `approve`: Restore issue visibility
- `reject`: Keep issue hidden
- `delete`: Mark issue as deleted

### Ban User (Admin)
```http
POST /api/admin/users/:id/ban
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reason": "Repeated policy violations"
}
```

### Get Analytics (Admin)
```http
GET /api/admin/analytics
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `startDate`: Filter start date (ISO 8601)
- `endDate`: Filter end date (ISO 8601)
- `category`: Filter by issue category
- `status`: Filter by issue status

## Database Schema

### Flag Model
```sql
CREATE TABLE flags (
  id UUID PRIMARY KEY,
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  flagged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  flagger_session VARCHAR(255), -- For anonymous flagging
  reason VARCHAR(500) NOT NULL,
  flag_type ENUM('spam', 'inappropriate', 'irrelevant', 'duplicate', 'other'),
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  review_action ENUM('approved', 'rejected', 'deleted'),
  review_comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes
- `flags_issue_id_idx`: Fast lookup by issue
- `flags_flagged_by_idx`: Fast lookup by flagger
- `flags_reviewed_at_idx`: Filter reviewed/pending flags
- `unique_user_flag_per_issue`: Prevent duplicate user flags
- `unique_session_flag_per_issue`: Prevent duplicate session flags

## Business Logic

### Flag Threshold
- **Threshold**: 3 flags trigger auto-hide
- **Immediate Effect**: Issue becomes invisible to users
- **Admin Notification**: Flagged issues appear in admin queue
- **Reversible**: Admin approval restores visibility

### Ban Criteria
Users may be recommended for banning if:
- More than 10 flags submitted in 7 days
- More than 80% of their flags are rejected by admins
- Pattern of abusive flagging behavior

### Location Enforcement
- Users can only flag issues within 5km radius
- Same location validation as issue viewing
- Prevents spam flagging from distant users

## Security Considerations

### Input Validation
- Flag reasons: 3-500 characters
- XSS prevention through input sanitization
- SQL injection prevention through parameterized queries

### Rate Limiting
- Standard API rate limits apply
- Additional protection against flag spam
- Session-based tracking for anonymous users

### Access Control
- Location-based access enforcement
- Role-based admin permissions
- Audit logging for all admin actions

## Error Handling

### Common Error Codes
- `VALIDATION_ERROR`: Invalid input data
- `ACCESS_DENIED`: Location or permission restrictions
- `FLAG_ERROR`: Flagging operation failed
- `ALREADY_FLAGGED`: Duplicate flag attempt
- `ISSUE_NOT_FOUND`: Issue doesn't exist or is hidden

### Error Response Format
```json
{
  "error": {
    "code": "FLAG_ERROR",
    "message": "You have already flagged this issue",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## Usage Examples

### Flag an Issue (Authenticated User)
```javascript
const response = await fetch('/api/issues/123/flag?userLat=40.7128&userLng=-74.0060', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reason: 'This appears to be spam content',
    flag_type: 'spam'
  })
});
```

### Flag an Issue (Anonymous User)
```javascript
const response = await fetch('/api/issues/123/flag?userLat=40.7128&userLng=-74.0060', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reason: 'Inappropriate content',
    flag_type: 'inappropriate'
  })
});
```

### Admin Review
```javascript
const response = await fetch('/api/admin/issues/123/review', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + adminToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'approve',
    reason: 'Content is appropriate after review'
  })
});
```

## Testing

### Unit Tests
- `flaggingService.test.js`: Service layer tests
- `flagging.test.js`: API endpoint tests

### Demo Script
- `scripts/demo-flagging.js`: Interactive demonstration

### Test Coverage
- Flag creation and validation
- Auto-hiding logic
- Admin review workflow
- User banning functionality
- Anonymous flagging
- Duplicate prevention

## Monitoring and Analytics

### Key Metrics
- Total flags submitted
- Auto-hidden issues count
- Admin review response time
- Flag accuracy rate (approved vs rejected)
- User ban rate

### Admin Dashboard
- Pending flags queue
- Flagging trends by category
- User flagging statistics
- Moderation activity logs

## Future Enhancements

### Planned Features
- Machine learning flag classification
- Community voting on flags
- Automated spam detection
- Flag appeal process
- Temporary suspensions

### Performance Optimizations
- Flag aggregation caching
- Batch processing for reviews
- Automated flag resolution
- Real-time notifications