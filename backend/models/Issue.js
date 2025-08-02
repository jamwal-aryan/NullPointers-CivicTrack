const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Issue = sequelize.define('Issue', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 2000]
    }
  },
  category: {
    type: DataTypes.ENUM('roads', 'lighting', 'water', 'cleanliness', 'safety', 'obstructions'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('reported', 'in_progress', 'resolved'),
    defaultValue: 'reported',
    allowNull: false
  },
  // PostGIS geometry field for location
  location: {
    type: DataTypes.GEOMETRY('POINT', 4326), // WGS84 coordinate system
    allowNull: false
  },
  // Separate lat/lng fields for easier access
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    validate: {
      min: -90,
      max: 90
    }
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
    validate: {
      min: -180,
      max: 180
    }
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  photos: {
    type: DataTypes.JSONB,
    defaultValue: [],
    validate: {
      maxPhotos(value) {
        if (value && Array.isArray(value) && value.length > 3) {
          throw new Error('Maximum 3 photos allowed per issue');
        }
      }
    }
  },
  reporter_id: {
    type: DataTypes.UUID,
    allowNull: true, // null for anonymous reports
    references: {
      model: 'users',
      key: 'id'
    }
  },
  is_anonymous: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_hidden: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  flag_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  // For anonymous reporting session tracking
  reporter_session: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'issues',
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['category']
    },
    {
      fields: ['is_hidden']
    },
    {
      fields: ['reporter_id']
    },
    {
      fields: ['created_at']
    },
    // Spatial index for location-based queries
    {
      name: 'issues_location_gist',
      fields: ['location'],
      using: 'gist'
    },
    // Composite index for common queries
    {
      fields: ['status', 'category', 'is_hidden']
    }
  ],
  hooks: {
    beforeCreate: (issue) => {
      // Create PostGIS point from lat/lng
      issue.location = sequelize.fn('ST_SetSRID', 
        sequelize.fn('ST_MakePoint', issue.longitude, issue.latitude), 
        4326
      );
    },
    beforeUpdate: (issue) => {
      // Update PostGIS point if lat/lng changed
      if (issue.changed('latitude') || issue.changed('longitude')) {
        issue.location = sequelize.fn('ST_SetSRID', 
          sequelize.fn('ST_MakePoint', issue.longitude, issue.latitude), 
          4326
        );
      }
    }
  }
});

module.exports = Issue;