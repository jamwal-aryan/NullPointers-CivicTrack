# CivicTrack Database Setup

This document describes the database setup and models for the CivicTrack application.

## Prerequisites

- PostgreSQL 12+ with PostGIS extension
- Node.js 16+
- npm or yarn

## Database Configuration

1. Create a PostgreSQL database:
```sql
CREATE DATABASE civic_track;
```

2. Enable PostGIS extension:
```sql
\c civic_track
CREATE EXTENSION postgis;
```

3. Copy the environment file and configure database settings:
```bash
cp .env.example .env
```

Update the following variables in `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=civic_track
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

## Database Setup Commands

### Run Migrations
```bash
npm run db:migrate
```

### Seed Test Data
```bash
npm run db:seed
```

### Complete Setup (Migrate + Seed)
```bash
npm run db:setup
```

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `email` (String, Unique, Nullable for anonymous users)
- `password_hash` (String, Nullable for anonymous users)
- `is_verified` (Boolean, Default: false)
- `role` (Enum: 'citizen', 'authority', 'admin')
- `is_banned` (Boolean, Default: false)
- `last_active_at` (Date)
- `session_token` (String, for anonymous users)
- `created_at`, `updated_at` (Timestamps)

### Issues Table
- `id` (UUID, Primary Key)
- `title` (String, Required)
- `description` (Text, Required)
- `category` (Enum: 'roads', 'lighting', 'water', 'cleanliness', 'safety', 'obstructions')
- `status` (Enum: 'reported', 'in_progress', 'resolved')
- `location` (PostGIS Point, SRID 4326)
- `latitude`, `longitude` (Decimal, for easier access)
- `address` (String, Optional)
- `photos` (Array of Strings)
- `reporter_id` (UUID, Foreign Key to Users, Nullable)
- `is_anonymous` (Boolean)
- `is_hidden` (Boolean, for moderation)
- `flag_count` (Integer)
- `reporter_session` (String, for anonymous reporting)
- `created_at`, `updated_at` (Timestamps)

### Status History Table
- `id` (UUID, Primary Key)
- `issue_id` (UUID, Foreign Key to Issues)
- `previous_status` (Enum, Nullable for initial status)
- `new_status` (Enum, Required)
- `comment` (Text, Optional)
- `updated_by` (UUID, Foreign Key to Users)
- `updated_at` (Date)

### Flags Table
- `id` (UUID, Primary Key)
- `issue_id` (UUID, Foreign Key to Issues)
- `flagged_by` (UUID, Foreign Key to Users, Nullable)
- `flagger_session` (String, for anonymous flagging)
- `reason` (String, Required)
- `flag_type` (Enum: 'spam', 'inappropriate', 'irrelevant', 'duplicate', 'other')
- `reviewed_at` (Date, Nullable)
- `reviewed_by` (UUID, Foreign Key to Users, Nullable)
- `review_action` (Enum: 'approved', 'rejected', 'deleted', Nullable)
- `review_comment` (Text, Nullable)
- `created_at`, `updated_at` (Timestamps)

## Indexes

### Spatial Indexes
- `issues_location_gist` - GiST index on location column for efficient geospatial queries

### Regular Indexes
- Users: email, role, is_banned, session_token
- Issues: status, category, is_hidden, reporter_id, created_at, composite (status, category, is_hidden)
- Status History: issue_id, updated_by, updated_at, composite (issue_id, updated_at)
- Flags: issue_id, flagged_by, reviewed_at, reviewed_by, flag_type

### Unique Constraints
- Users: email (when not null)
- Flags: (issue_id, flagged_by), (issue_id, flagger_session) - prevents duplicate flags

## Geospatial Features

The application uses PostGIS for efficient geospatial operations:

1. **Location Storage**: Issues store location as PostGIS Point geometry with SRID 4326 (WGS84)
2. **Distance Calculations**: Uses ST_Distance for accurate distance calculations
3. **Radius Queries**: Uses ST_DWithin for finding issues within a specific radius
4. **Spatial Indexing**: GiST index on location column for fast spatial queries

### Geospatial Utility Functions

The `GeospatialUtils` class provides helper functions:
- `calculateDistance()` - Calculate distance between two points
- `isWithinRadius()` - Check if point is within radius
- `getWithinRadiusCondition()` - Generate Sequelize where condition for radius queries
- `validateCoordinates()` - Validate latitude/longitude values

## Test Data

The seed script creates test data including:
- Admin user: `admin@civictrack.com` / `password123`
- Authority user: `authority@city.gov` / `password123`
- Citizen users: `citizen1@example.com`, `citizen2@example.com` / `password123`
- Sample issues with various statuses and locations
- Status history entries showing issue progression
- Flag entries for moderation testing

## Testing

Run database tests:
```bash
npm test -- database.test.js
```

The tests verify:
- Model creation and validation
- Geospatial utility functions
- Model associations
- PostGIS functionality

## Performance Considerations

1. **Spatial Queries**: Use appropriate spatial indexes for location-based queries
2. **Connection Pooling**: Configured with max 10 connections
3. **Query Optimization**: Composite indexes for common query patterns
4. **Data Types**: Use appropriate data types (UUID for IDs, DECIMAL for coordinates)

## Security Features

1. **Input Validation**: Model-level validation for all fields
2. **Unique Constraints**: Prevent duplicate flags and ensure data integrity
3. **Cascade Deletes**: Proper cleanup of related records
4. **Anonymous Support**: Secure handling of anonymous users and sessions