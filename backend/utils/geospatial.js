const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

/**
 * Geospatial utility functions for PostGIS operations
 */
class GeospatialUtils {
  
  /**
   * Calculate distance between two points in kilometers
   * @param {number} lat1 - Latitude of first point
   * @param {number} lng1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lng2 - Longitude of second point
   * @returns {Promise<number>} Distance in kilometers
   */
  static async calculateDistance(lat1, lng1, lat2, lng2) {
    const query = `
      SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
      ) / 1000 as distance_km
    `;
    
    const result = await sequelize.query(query, {
      bind: [lng1, lat1, lng2, lat2],
      type: sequelize.QueryTypes.SELECT
    });
    
    return parseFloat(result[0].distance_km);
  }
  
  /**
   * Check if a point is within a certain radius of another point
   * @param {number} centerLat - Center point latitude
   * @param {number} centerLng - Center point longitude
   * @param {number} pointLat - Point to check latitude
   * @param {number} pointLng - Point to check longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Promise<boolean>} True if point is within radius
   */
  static async isWithinRadius(centerLat, centerLng, pointLat, pointLng, radiusKm) {
    const distance = await this.calculateDistance(centerLat, centerLng, pointLat, pointLng);
    return distance <= radiusKm;
  }
  
  /**
   * Get SQL condition for finding points within radius
   * @param {number} centerLat - Center point latitude
   * @param {number} centerLng - Center point longitude
   * @param {number} radiusKm - Radius in kilometers
   * @param {string} locationColumn - Name of the geometry column (default: 'location')
   * @returns {object} Sequelize where condition
   */
  static getWithinRadiusCondition(centerLat, centerLng, radiusKm, locationColumn = 'location') {
    return sequelize.where(
      sequelize.fn(
        'ST_DWithin',
        sequelize.col(locationColumn),
        sequelize.fn('ST_SetSRID', 
          sequelize.fn('ST_MakePoint', centerLng, centerLat), 
          4326
        ),
        radiusKm * 1000 // Convert km to meters
      ),
      true
    );
  }
  
  /**
   * Validate coordinates
   * @param {number} latitude - Latitude to validate
   * @param {number} longitude - Longitude to validate
   * @returns {boolean} True if coordinates are valid
   */
  static validateCoordinates(latitude, longitude) {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    );
  }
  
  /**
   * Create a PostGIS point from latitude and longitude
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {object} Sequelize function for creating PostGIS point
   */
  static createPoint(latitude, longitude) {
    return sequelize.fn('ST_SetSRID', 
      sequelize.fn('ST_MakePoint', longitude, latitude), 
      4326
    );
  }
  
  /**
   * Extract latitude and longitude from PostGIS point
   * @param {string} locationColumn - Name of the geometry column
   * @returns {object} Object with lat and lng attributes for SELECT
   */
  static extractCoordinates(locationColumn = 'location') {
    return {
      latitude: sequelize.fn('ST_Y', sequelize.col(locationColumn)),
      longitude: sequelize.fn('ST_X', sequelize.col(locationColumn))
    };
  }
  
  /**
   * Get issues within radius with distance calculation
   * @param {number} centerLat - Center point latitude
   * @param {number} centerLng - Center point longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {object} Sequelize query options
   */
  static getIssuesWithinRadiusQuery(centerLat, centerLng, radiusKm) {
    return {
      attributes: {
        include: [
          [
            sequelize.fn(
              'ST_Distance',
              sequelize.col('location'),
              sequelize.fn('ST_SetSRID', 
                sequelize.fn('ST_MakePoint', centerLng, centerLat), 
                4326
              )
            ),
            'distance_meters'
          ],
          [
            sequelize.literal(`
              ST_Distance(
                location::geography,
                ST_SetSRID(ST_MakePoint(${centerLng}, ${centerLat}), 4326)::geography
              ) / 1000
            `),
            'distance_km'
          ]
        ]
      },
      where: this.getWithinRadiusCondition(centerLat, centerLng, radiusKm),
      order: [
        [sequelize.literal('distance_meters'), 'ASC']
      ]
    };
  }
  
  /**
   * Normalize coordinates to standard precision
   * @param {number} latitude - Latitude to normalize
   * @param {number} longitude - Longitude to normalize
   * @returns {object} Normalized coordinates
   */
  static normalizeCoordinates(latitude, longitude) {
    if (!this.validateCoordinates(latitude, longitude)) {
      throw new Error('Invalid coordinates provided for normalization');
    }
    
    return {
      latitude: parseFloat(parseFloat(latitude).toFixed(8)),
      longitude: parseFloat(parseFloat(longitude).toFixed(8))
    };
  }
  
  /**
   * Calculate bearing between two points
   * @param {number} lat1 - Start latitude
   * @param {number} lng1 - Start longitude
   * @param {number} lat2 - End latitude
   * @param {number} lng2 - End longitude
   * @returns {number} Bearing in degrees (0-360)
   */
  static calculateBearing(lat1, lng1, lat2, lng2) {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }
  
  /**
   * Get bounding box for a given center point and radius
   * @param {number} centerLat - Center latitude
   * @param {number} centerLng - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {object} Bounding box coordinates
   */
  static getBoundingBox(centerLat, centerLng, radiusKm) {
    // Approximate degrees per km (varies by latitude)
    const kmPerDegreeLat = 111.32;
    const kmPerDegreeLng = 111.32 * Math.cos(centerLat * Math.PI / 180);
    
    const deltaLat = radiusKm / kmPerDegreeLat;
    const deltaLng = radiusKm / kmPerDegreeLng;
    
    return {
      north: centerLat + deltaLat,
      south: centerLat - deltaLat,
      east: centerLng + deltaLng,
      west: centerLng - deltaLng
    };
  }
  
  /**
   * Check if coordinates are within a bounding box
   * @param {number} lat - Latitude to check
   * @param {number} lng - Longitude to check
   * @param {object} bbox - Bounding box {north, south, east, west}
   * @returns {boolean} True if coordinates are within bounding box
   */
  static isWithinBoundingBox(lat, lng, bbox) {
    return lat >= bbox.south && lat <= bbox.north && 
           lng >= bbox.west && lng <= bbox.east;
  }
  
  /**
   * Get SQL condition for bounding box queries (faster than radius for large datasets)
   * @param {number} centerLat - Center latitude
   * @param {number} centerLng - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {object} Sequelize where condition for bounding box
   */
  static getBoundingBoxCondition(centerLat, centerLng, radiusKm) {
    const bbox = this.getBoundingBox(centerLat, centerLng, radiusKm);
    
    return {
      latitude: {
        [Op.between]: [bbox.south, bbox.north]
      },
      longitude: {
        [Op.between]: [bbox.west, bbox.east]
      }
    };
  }
  
  /**
   * Convert meters to kilometers with proper rounding
   * @param {number} meters - Distance in meters
   * @returns {number} Distance in kilometers
   */
  static metersToKm(meters) {
    return parseFloat((meters / 1000).toFixed(2));
  }
  
  /**
   * Convert kilometers to meters
   * @param {number} km - Distance in kilometers
   * @returns {number} Distance in meters
   */
  static kmToMeters(km) {
    return Math.round(km * 1000);
  }
}

module.exports = GeospatialUtils;