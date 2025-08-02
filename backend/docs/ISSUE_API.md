# Issue Management API Documentation

This document describes the Issue Management API endpoints for the CivicTrack platform.

## Overview

The Issue Management API provides endpoints for creating, retrieving, and managing civic issues. All endpoints implement location-based access control to ensure users can only interact with issues within their neighborhood (3-5km radius).

## Authentication

- **Anonymous Access**: Supported for creating and viewing issues
- **Authenticated Access**: Required for status updates (authorities/admins only)
- **Location-Based Access**: All endpoints enforce geographic proximity rules

## Endpoints

### 1. Create Issue

**POST** `/api/issues`

Creates a new civic issue report.

#### Request Body
```json
{
  "title": "string (3-200 chars, required)",
  "description": "string (10-2000 chars, required)",
  "category": "roads|lighting|water|cleanliness|safety|obstructions (required)",
  "latitude": "number (-90 to 90, required)",
  "longitude": "number (-180 to 180, required)",
  "address": "string (max 500 chars, optional)",
  "photos": ["string array (max 3 URLs, optional)"],
  "isAnonymous": "boolean (optional, default: false)",
  "userLat": "number (optional, for distance validation)",
  "userLng": "number (optional, for distance validation)"
}
```

#### Response (201 Created)
```json
{
  "message": "Issue created successfully",
  "issue": {
    "id": "uuid",
    "title": "string",
    "description": "string",
    "category": "string",
    "status": "reported",
    "latitude": "number",
    "longitude": "number",
    "address": "string",
    "photos": ["string"],
    "is_anonymous": "boolean",
    "flag_count": 0,
    "created_at": "datetime",
    "updated_at": "datetime",
    "reporter": {
      "id": "uuid",
      "email": "string"
    }
  },
  "timestamp": "datetime"
}
```

#### Example
```bash
curl -X POST http://localhost:3001/api/issues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Broken Street Light",
    "description": "Street light has been out for several days, creating safety concerns",
    "category": "lighting",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "address": "123 Main Street, San Francisco, CA"
  }'
```

### 2. Get Issues

**GET** `/api/issues`

Retrieves issues with geospatial and category filtering.

#### Query Parameters
- `lat` (required): User latitude (-90 to 90)
- `lng` (required): User longitude (-180 to 180)
- `radius` (optional): Search radius in km (0.1-5, default: 3)
- `status` (optional): Filter by status (comma-separated: reported,in_progress,resolved)
- `category` (optional): Filter by category (comma-separated: roads,lighting,water,cleanliness,safety,obstructions)
- `limit` (optional): Maximum results (1-100, default: 50)
- `offset` (optional): Pagination offset (default: 0)

#### Response (200 OK)
```json
{
  "issues": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "category": "string",
      "status": "string",
      "latitude": "number",
      "longitude": "number",
      "address": "string",
      "photos": ["string"],
      "is_anonymous": "boolean",
      "flag_count": "number",
      "distance_km": "string",
      "distance_meters": "number",
      "created_at": "datetime",
      "updated_at": "datetime",
      "reporter": {
        "id": "uuid"
      }
    }
  ],
  "metadata": {
    "total": "number",
    "count": "number",
    "limit": "number",
    "offset": "number",
    "radius": "number",
    "userLocation": {
      "latitude": "number",
      "longitude": "number"
    },
    "filters": {
      "status": ["string"],
      "category": ["string"]
    }
  },
  "timestamp": "datetime"
}
```

#### Example
```bash
curl "http://localhost:3001/api/issues?lat=37.7749&lng=-122.4194&radius=3&status=reported&category=roads,lighting"
```

### 3. Get Issue by ID

**GET** `/api/issues/:id`

Retrieves detailed information about a specific issue.

#### Path Parameters
- `id` (required): Issue UUID

#### Query Parameters
- `userLat` (required): User latitude for access control
- `userLng` (required): User longitude for access control

#### Response (200 OK)
```json
{
  "issue": {
    "id": "uuid",
    "title": "string",
    "description": "string",
    "category": "string",
    "status": "string",
    "latitude": "number",
    "longitude": "number",
    "address": "string",
    "photos": ["string"],
    "is_anonymous": "boolean",
    "flag_count": "number",
    "created_at": "datetime",
    "updated_at": "datetime",
    "distance": {
      "km": "number",
      "meters": "number"
    },
    "reporter": {
      "id": "uuid",
      "email": "string"
    },
    "statusHistory": [
      {
        "id": "uuid",
        "previous_status": "string",
        "new_status": "string",
        "comment": "string",
        "updated_at": "datetime",
        "updated_by": {
          "id": "uuid",
          "email": "string",
          "role": "string"
        }
      }
    ]
  },
  "timestamp": "datetime"
}
```

#### Example
```bash
curl "http://localhost:3001/api/issues/123e4567-e89b-12d3-a456-426614174000?userLat=37.7749&userLng=-122.4194"
```

### 4. Update Issue Status

**PATCH** `/api/issues/:id/status`

Updates the status of an issue (authorities and admins only).

#### Path Parameters
- `id` (required): Issue UUID

#### Query Parameters
- `userLat` (required): User latitude for access control
- `userLng` (required): User longitude for access control

#### Request Body
```json
{
  "status": "reported|in_progress|resolved (required)",
  "comment": "string (5-1000 chars, required)"
}
```

#### Response (200 OK)
```json
{
  "message": "Issue status updated successfully",
  "issue": {
    "id": "uuid",
    "title": "string",
    "description": "string",
    "category": "string",
    "status": "string",
    "latitude": "number",
    "longitude": "number",
    "address": "string",
    "photos": ["string"],
    "is_anonymous": "boolean",
    "flag_count": "number",
    "created_at": "datetime",
    "updated_at": "datetime",
    "statusHistory": [
      {
        "id": "uuid",
        "previous_status": "string",
        "new_status": "string",
        "comment": "string",
        "updated_at": "datetime",
        "updated_by": {
          "id": "uuid",
          "email": "string",
          "role": "string"
        }
      }
    ]
  },
  "timestamp": "datetime"
}
```

#### Example
```bash
curl -X PATCH "http://localhost:3001/api/issues/123e4567-e89b-12d3-a456-426614174000/status?userLat=37.7749&userLng=-122.4194" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer AUTHORITY_TOKEN" \
  -d '{
    "status": "in_progress",
    "comment": "Work has begun on this issue and we expect completion within 2 weeks"
  }'
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details (optional)",
    "timestamp": "datetime"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Invalid input data
- `MISSING_TOKEN` (401): Authentication required
- `TOKEN_EXPIRED` (401): Access token has expired
- `INSUFFICIENT_PERMISSIONS` (403): User lacks required permissions
- `LOCATION_ACCESS_DENIED` (403): Issue outside user's neighborhood zone
- `ISSUE_NOT_FOUND` (404): Issue not found or is hidden
- `STATUS_UNCHANGED` (400): Attempting to set same status
- `INVALID_STATUS_TRANSITION` (400): Invalid status change
- `INTERNAL_SERVER_ERROR` (500): Server error

## Location-Based Access Control

All endpoints enforce a 3-5km radius access control:

1. **Issue Creation**: Users can report issues within 10km of their location
2. **Issue Viewing**: Users can only see issues within 5km of their location
3. **Issue Details**: Users can only access details for issues within 5km
4. **Status Updates**: Authorities can only update issues within 5km

## Rate Limiting

- **Global Rate Limit**: 100 requests per 15 minutes per IP
- **Issue Creation**: Additional rate limiting may apply for anonymous users

## Data Validation

### Categories
- `roads`: Road damage, potholes, traffic issues
- `lighting`: Street lights, public lighting issues
- `water`: Water leaks, drainage problems
- `cleanliness`: Litter, waste management issues
- `safety`: Public safety concerns
- `obstructions`: Blocked paths, fallen trees

### Status Values
- `reported`: Initial status when issue is created
- `in_progress`: Work has begun on the issue
- `resolved`: Issue has been fixed

### Photo Requirements
- Maximum 3 photos per issue
- URLs must be valid strings
- File upload endpoints will be implemented in future tasks

## Security Considerations

1. **Input Sanitization**: All text inputs are sanitized to prevent XSS
2. **SQL Injection Prevention**: Parameterized queries used throughout
3. **Location Validation**: Coordinates are validated and normalized
4. **Role-Based Access**: Status updates restricted to authorities/admins
5. **Anonymous Reporting**: Supported while maintaining data integrity

## Testing

Run the validation tests:
```bash
npm test -- issueValidation.test.js
```

For integration testing with database:
```bash
npm test -- issueRoutes.test.js
```

## Dependencies

- `express-validator`: Input validation
- `sequelize`: Database ORM with PostGIS support
- `jsonwebtoken`: Authentication
- Location middleware and geospatial utilities