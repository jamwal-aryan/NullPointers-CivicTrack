# Status Tracking System Documentation

## Overview

The Status Tracking System provides comprehensive logging and history management for issue status changes in the CivicTrack platform. It ensures that all status transitions are properly recorded, validated, and communicated to relevant stakeholders.

## Features

### 1. Status History Logging
- **Automatic Logging**: Every status change is automatically recorded in the `status_history` table
- **Complete Audit Trail**: Tracks previous status, new status, timestamp, and the user who made the change
- **Required Comments**: All status updates must include a comment explaining the change
- **Transaction Safety**: Uses database transactions to ensure data consistency

### 2. Status Validation
- **Role-based Access**: Only authorities and admins can update issue status
- **Valid Transitions**: Enforces logical status transitions (e.g., reported → in_progress → resolved)
- **Duplicate Prevention**: Prevents setting the same status twice
- **Location-based Access**: Users can only update issues within their geographic area

### 3. Notification System
- **Automatic Notifications**: Reporters are notified when their issue status changes
- **Multiple Channels**: Supports email, WebSocket, and push notifications (extensible)
- **Anonymous Handling**: Properly handles notifications for anonymous reports

## API Endpoints

### Get Issue Status History
```
GET /api/issues/:id/history
```

**Parameters:**
- `id` (path): Issue UUID
- `userLat` (query): User latitude for access control
- `userLng` (query): User longitude for access control

**Response:**
```json
{
  "issue": {
    "id": "uuid",
    "title": "Issue title",
    "current_status": "in_progress",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "history": [
    {
      "id": "uuid",
      "previous_status": "reported",
      "new_status": "in_progress",
      "comment": "Started working on this issue",
      "updated_at": "2024-01-01T12:00:00.000Z",
      "updated_by": {
        "id": "uuid",
        "email": "authority@example.com",
        "role": "authority"
      }
    }
  ],
  "metadata": {
    "total_changes": 1,
    "first_change": "2024-01-01T12:00:00.000Z",
    "last_change": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Update Issue Status
```
PATCH /api/issues/:id/status
```

**Parameters:**
- `id` (path): Issue UUID
- `userLat` (query): User latitude for access control
- `userLng` (query): User longitude for access control

**Request Body:**
```json
{
  "status": "in_progress",
  "comment": "Started working on this issue"
}
```

**Response:**
```json
{
  "message": "Issue status updated successfully",
  "issue": {
    "id": "uuid",
    "title": "Issue title",
    "status": "in_progress",
    "statusHistory": [
      {
        "id": "uuid",
        "previous_status": "reported",
        "new_status": "in_progress",
        "comment": "Started working on this issue",
        "updated_at": "2024-01-01T12:00:00.000Z",
        "updated_by": {
          "id": "uuid",
          "email": "authority@example.com",
          "role": "authority"
        }
      }
    ]
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Database Schema

### StatusHistory Table
```sql
CREATE TABLE status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  previous_status VARCHAR(20), -- NULL for initial status
  new_status VARCHAR(20) NOT NULL,
  comment TEXT,
  updated_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `issue_id` - For efficient history queries
- `updated_by` - For user activity tracking
- `updated_at` - For chronological ordering
- `(issue_id, updated_at)` - Composite index for issue history queries

## Status Transitions

### Valid Status Values
- `reported` - Initial status when issue is created
- `in_progress` - Issue is being worked on by authorities
- `resolved` - Issue has been fixed/addressed

### Allowed Transitions
```
reported → in_progress
reported → resolved
in_progress → resolved
in_progress → reported (if work needs to be restarted)
resolved → in_progress (if issue resurfaces)
resolved → reported (if resolution was incorrect)
```

## Validation Rules

### Status Update Validation
1. **Authentication Required**: User must be authenticated
2. **Role Authorization**: Only `authority` and `admin` roles can update status
3. **Location Access**: User must be within 5km of the issue location
4. **Comment Required**: All status updates must include a comment (5-1000 characters)
5. **Valid Status**: New status must be one of the allowed values
6. **Valid Transition**: Status change must follow allowed transition rules
7. **No Duplicates**: Cannot set the same status twice

### History Access Validation
1. **Issue Exists**: Issue must exist and not be hidden
2. **Location Access**: User must be within 5km of the issue location
3. **Public Access**: Any authenticated or anonymous user can view history

## Notification System

### Notification Triggers
- Status changes from any status to any other status
- Automatic notification to the original reporter (if not anonymous)
- Admin notifications for flagged content (future implementation)

### Notification Channels
1. **Email Notifications**: Immediate email to reporter with status update details
2. **WebSocket Notifications**: Real-time notifications for active users (future)
3. **Push Notifications**: PWA push notifications for mobile users (future)

### Notification Data
```javascript
{
  issueId: "uuid",
  issueTitle: "Issue title",
  previousStatus: "reported",
  newStatus: "in_progress",
  comment: "Started working on this issue",
  updatedBy: {
    id: "uuid",
    email: "authority@example.com",
    role: "authority"
  },
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

## Error Handling

### Common Error Codes
- `ISSUE_NOT_FOUND` - Issue doesn't exist or is hidden
- `ACCESS_DENIED` - User is outside the allowed geographic area
- `INSUFFICIENT_PERMISSIONS` - User doesn't have authority to update status
- `VALIDATION_ERROR` - Invalid input data (status, comment, etc.)
- `STATUS_UNCHANGED` - Attempting to set the same status
- `INVALID_STATUS_TRANSITION` - Invalid status change
- `COMMENT_REQUIRED` - Missing required comment
- `HISTORY_FETCH_ERROR` - Error retrieving status history
- `STATUS_UPDATE_ERROR` - Error updating issue status

## Security Considerations

### Access Control
- Geographic restrictions prevent unauthorized access to distant issues
- Role-based permissions ensure only authorities can update status
- Input sanitization prevents XSS and injection attacks
- Transaction safety ensures data consistency

### Data Privacy
- Anonymous reporters are not exposed in history records
- Email addresses are only shown to authorized users
- Sensitive user data is filtered from public responses

## Performance Considerations

### Database Optimization
- Indexes on frequently queried columns
- Efficient geospatial queries using PostGIS
- Transaction batching for atomic operations
- Connection pooling for concurrent requests

### Caching Strategy
- Redis caching for frequently accessed issue data
- Notification queuing for high-volume updates
- Optimized query patterns for history retrieval

## Testing

### Unit Tests
- Status validation logic
- Notification service functionality
- Database model relationships
- Input sanitization and validation

### Integration Tests
- Complete API endpoint workflows
- Database transaction handling
- Authentication and authorization
- Geolocation access control

### End-to-End Tests
- Full status update workflow
- Notification delivery
- Error handling scenarios
- Performance under load

## Future Enhancements

### Planned Features
1. **Real-time Notifications**: WebSocket implementation for instant updates
2. **Push Notifications**: PWA push notifications for mobile users
3. **Email Templates**: Rich HTML email templates with branding
4. **Bulk Operations**: Batch status updates for multiple issues
5. **Advanced Analytics**: Status change patterns and performance metrics
6. **Workflow Automation**: Automatic status transitions based on conditions

### Extensibility
- Plugin architecture for custom notification channels
- Configurable status workflows per issue category
- Custom validation rules for different user roles
- Integration with external ticketing systems

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure PostgreSQL is running and accessible
2. **Missing Indexes**: Run migrations to create required database indexes
3. **Permission Errors**: Verify user roles and geographic access
4. **Notification Failures**: Check email service configuration and logs
5. **Transaction Deadlocks**: Monitor concurrent status updates

### Debugging
- Enable detailed logging for status update operations
- Monitor database query performance
- Track notification delivery success rates
- Analyze error patterns and frequency

## Configuration

### Environment Variables
```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/civictrack
POSTGRES_DB=civictrack
POSTGRES_USER=civictrack_user
POSTGRES_PASSWORD=secure_password

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Notification Configuration
EMAIL_SERVICE_API_KEY=your-email-service-key
NOTIFICATION_FROM_EMAIL=noreply@civictrack.com

# Geographic Configuration
MAX_ACCESS_RADIUS_KM=5
DEFAULT_SEARCH_RADIUS_KM=3
```

### Feature Flags
```javascript
const config = {
  notifications: {
    email: true,
    websocket: false, // Future implementation
    push: false       // Future implementation
  },
  validation: {
    requireComments: true,
    enforceTransitions: true,
    geographicRestrictions: true
  }
};
```