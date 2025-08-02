# Geolocation Services Documentation

## Overview

The CivicTrack geolocation services provide comprehensive location-based functionality for the civic issue reporting platform. The system enforces a 3-5km radius access control, ensuring users can only view and interact with issues within their neighborhood zone.

## Core Components

### 1. GeospatialUtils (`utils/geospatial.js`)

Utility class providing PostGIS-based geospatial operations.

#### Key Methods

- **`validateCoordinates(latitude, longitude)`**: Validates coordinate bounds (-90 to 90 for lat, -180 to 180 for lng)
- **`calculateDistance(lat1, lng1, lat2, lng2)`**: Calculates distance between two points using PostGIS
- **`isWithinRadius(centerLat, centerLng, pointLat, pointLng, radiusKm)`**: Checks if point is within radius
- **`normalizeCoordinates(latitude, longitude)`**: Normalizes coordinates to 8 decimal places
- **`getBoundingBox(centerLat, centerLng, radiusKm)`**: Calculates bounding box for radius
- **`calculateBearing(lat1, lng1, lat2, lng2)`**: Calculates bearing between two points

### 2. GeolocationService (`services/geolocationService.js`)

High-level service for proximity-based filtering and location access control.

#### Key Methods

- **`getIssuesWithinRadius(userLat, userLng, filters)`**: Get issues within user's radius with filtering
- **`checkIssueAccess(issueId, userLat, userLng, maxRadius)`**: Validate user access to specific issue
- **`getClosestIssues(userLat, userLng, count, filters)`**: Find closest issues to user location
- **`validateReportingLocation(latitude, longitude)`**: Validate location for issue reporting
- **`getLocationStatistics(userLat, userLng)`**: Get statistics by distance ranges

### 3. LocationMiddleware (`middleware/location.js`)

Express middleware for location validation and access control.

#### Middleware Functions

- **`validateCoordinates`**: Validates and normalizes coordinates from request
- **`enforceRadiusAccess(maxRadius)`**: Enforces radius-based access control
- **`validateRadius`**: Validates radius parameter (0.1km to 5km)
- **`validateIssueLocation`**: Validates issue location for reporting

## Usage Examples

### Basic Coordinate Validation

```javascript
const GeospatialUtils = require('./utils/geospatial');

// Validate coordinates
const isValid = GeospatialUtils.validateCoordinates(40.7128, -74.0060);
console.log(isValid); // true

// Normalize coordinates
const normalized = GeospatialUtils.normalizeCoordinates(40.712812345, -74.006012345);
console.log(normalized); // { latitude: 40.71281235, longitude: -74.00601235 }
```

### Distance Calculations

```javascript
// Calculate distance between two points (requires database connection)
const distance = await GeospatialUtils.calculateDistance(
  40.7128, -74.0060, // NYC
  42.3601, -71.0589  // Boston
);
console.log(`Distance: ${distance.toFixed(2)}km`);

// Check if point is within radius
const isWithin = await GeospatialUtils.isWithinRadius(
  40.7128, -74.0060, // Center
  40.7589, -73.9851, // Point to check
  5 // 5km radius
);
```

### Getting Issues Within Radius

```javascript
const GeolocationService = require('./services/geolocationService');

// Get issues within 3km radius with filters
const result = await GeolocationService.getIssuesWithinRadius(
  40.7128, -74.0060, // User location
  {
    radius: 3,
    category: ['roads', 'lighting'],
    status: ['reported', 'in_progress'],
    limit: 20,
    offset: 0
  }
);

console.log(`Found ${result.issues.length} issues`);
result.issues.forEach(issue => {
  console.log(`${issue.title} - ${issue.distance_km}km away`);
});
```

### Middleware Usage in Routes

```javascript
const { location } = require('./middleware');

// Validate coordinates and enforce radius access
app.get('/api/issues/:id', 
  location.enforceRadiusAccess(5), // 5km max radius
  async (req, res) => {
    // User location is available in req.userLocation
    // Issue access has been validated
    const issue = await Issue.findByPk(req.params.id);
    res.json(issue);
  }
);

// Validate issue creation location
app.post('/api/issues',
  location.validateIssueLocation,
  async (req, res) => {
    // Coordinates are normalized in req.body
    const issue = await Issue.create(req.body);
    res.json(issue);
  }
);
```

### Access Control Validation

```javascript
// Check if user can access a specific issue
const accessResult = await GeolocationService.checkIssueAccess(
  'issue-uuid',
  40.7128, -74.0060, // User location
  5 // Max radius
);

if (accessResult.hasAccess) {
  console.log('User can access issue');
  console.log(`Distance: ${accessResult.distance}km`);
} else {
  console.log(`Access denied: ${accessResult.error}`);
}
```

## Configuration

### Radius Limits

- **Minimum radius**: 0.1km
- **Maximum radius**: 5km
- **Default radius**: 3km

### Coordinate Precision

- Coordinates are normalized to 8 decimal places (~1.1mm precision)
- Uses WGS84 coordinate system (SRID 4326)

### Database Requirements

- PostgreSQL with PostGIS extension
- Spatial indexes on location columns
- Geography data type for accurate distance calculations

## Error Handling

### Common Error Codes

- **`INVALID_COORDINATES`**: Coordinates outside valid bounds
- **`INVALID_RADIUS`**: Radius outside 0.1-5km range
- **`LOCATION_ACCESS_DENIED`**: Issue outside user's radius
- **`USER_LOCATION_REQUIRED`**: Missing user location for access control
- **`ISSUE_TOO_FAR`**: Issue location too far from user (>10km for reporting)

### Error Response Format

```javascript
{
  error: {
    code: "LOCATION_ACCESS_DENIED",
    message: "Issue is outside your neighborhood zone (7.5km away, max 5km allowed)",
    timestamp: "2024-01-15T10:30:00.000Z"
  }
}
```

## Performance Considerations

### Spatial Indexes

Ensure spatial indexes are created on location columns:

```sql
CREATE INDEX issues_location_gist ON issues USING gist(location);
```

### Bounding Box Optimization

For large datasets, use bounding box queries before radius calculations:

```javascript
// Get bounding box condition (faster for initial filtering)
const bboxCondition = GeospatialUtils.getBoundingBoxCondition(lat, lng, radius);

// Then apply precise radius filtering
const radiusCondition = GeospatialUtils.getWithinRadiusCondition(lat, lng, radius);
```

### Caching

Consider caching frequently accessed location data:

- User location validation results
- Issue proximity calculations
- Bounding box calculations

## Testing

### Unit Tests

Run the geolocation unit tests:

```bash
npm test -- --testPathPattern=geolocation.test.js
```

### Demo Script

Run the demo script to see all functionality:

```bash
node scripts/demo-geolocation.js
```

### Integration Testing

For full integration testing with database:

1. Ensure PostgreSQL with PostGIS is running
2. Run database migrations
3. Execute integration tests with proper database connection

## Security Considerations

### Location Privacy

- User locations are not stored permanently
- Only used for access control and proximity calculations
- Anonymous reporting supported

### Access Control

- Strict radius enforcement prevents data leakage
- Users cannot access issues outside their neighborhood
- Location validation prevents invalid coordinate injection

### Input Validation

- All coordinates validated and normalized
- Radius parameters bounded to prevent abuse
- SQL injection prevention through parameterized queries

## Future Enhancements

### Planned Features

- City boundary validation
- Restricted area checks (water bodies, private property)
- Dynamic radius based on population density
- Location-based notifications
- Geofencing for special zones

### Performance Optimizations

- Spatial clustering for dense areas
- Location-based caching strategies
- Optimized query patterns for large datasets
- Background location validation