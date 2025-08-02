const GeospatialUtils = require('../utils/geospatial');
const Issue = require('../models/Issue');
const { Op } = require('sequelize');

/**
 * Geolocation service for proximity-based filtering and location access control
 */
class GeolocationService {
  
  /**
   * Get issues within user's neighborhood radius with proximity-based filtering
   * @param {number} userLat - User's latitude
   * @param {number} userLng - User's longitude
   * @param {object} filters - Filtering options
   * @param {number} filters.radius - Search radius in km (default: 3, max: 5)
   * @param {string[]} filters.status - Array of status filters
   * @param {string[]} filters.category - Array of category filters
   * @param {number} filters.limit - Maximum number of results (default: 50)
   * @param {number} filters.offset - Pagination offset (default: 0)
   * @returns {Promise<object>} Issues with distance information and metadata
   */
  static async getIssuesWithinRadius(userLat, userLng, filters = {}) {
    try {
      // Validate user coordinates
      if (!GeospatialUtils.validateCoordinates(userLat, userLng)) {
        throw new Error('Invalid user coordinates');
      }
      
      // Set default and validate radius
      const radius = Math.min(Math.max(filters.radius || 3, 0.1), 5);
      const limit = Math.min(filters.limit || 50, 100);
      const offset = Math.max(filters.offset || 0, 0);
      
      // Build base query with geospatial filtering
      const queryOptions = GeospatialUtils.getIssuesWithinRadiusQuery(userLat, userLng, radius);
      
      // Add additional filters
      const whereConditions = [
        queryOptions.where,
        { is_hidden: false } // Never show hidden issues
      ];
      
      // Status filtering
      if (filters.status && filters.status.length > 0) {
        whereConditions.push({
          status: {
            [Op.in]: filters.status
          }
        });
      }
      
      // Category filtering
      if (filters.category && filters.category.length > 0) {
        whereConditions.push({
          category: {
            [Op.in]: filters.category
          }
        });
      }
      
      // Combine all where conditions
      queryOptions.where = {
        [Op.and]: whereConditions
      };
      
      // Add pagination
      queryOptions.limit = limit;
      queryOptions.offset = offset;
      
      // Add coordinate extraction to attributes
      queryOptions.attributes.include.push(
        ...Object.values(GeospatialUtils.extractCoordinates())
      );
      
      // Execute query
      const issues = await Issue.findAll(queryOptions);
      
      // Get total count for pagination metadata
      const totalCount = await Issue.count({
        where: queryOptions.where
      });
      
      // Format results with distance information
      const formattedIssues = issues.map(issue => {
        const issueData = issue.toJSON();
        return {
          ...issueData,
          distance_km: parseFloat(issueData.distance_km || 0).toFixed(2),
          distance_meters: Math.round(issueData.distance_meters || 0)
        };
      });
      
      return {
        issues: formattedIssues,
        metadata: {
          total: totalCount,
          count: formattedIssues.length,
          limit,
          offset,
          radius,
          userLocation: {
            latitude: userLat,
            longitude: userLng
          },
          filters: {
            status: filters.status || [],
            category: filters.category || []
          }
        }
      };
      
    } catch (error) {
      console.error('Error getting issues within radius:', error);
      throw new Error(`Failed to retrieve nearby issues: ${error.message}`);
    }
  }
  
  /**
   * Check if user has access to a specific issue based on location
   * @param {string} issueId - Issue ID to check access for
   * @param {number} userLat - User's latitude
   * @param {number} userLng - User's longitude
   * @param {number} maxRadius - Maximum allowed radius in km (default: 5)
   * @returns {Promise<object>} Access result with issue data or error
   */
  static async checkIssueAccess(issueId, userLat, userLng, maxRadius = 5) {
    try {
      // Validate user coordinates
      if (!GeospatialUtils.validateCoordinates(userLat, userLng)) {
        return {
          hasAccess: false,
          error: 'Invalid user coordinates'
        };
      }
      
      // Find the issue
      const issue = await Issue.findOne({
        where: {
          id: issueId,
          is_hidden: false
        },
        attributes: ['id', 'title', 'latitude', 'longitude', 'status', 'category']
      });
      
      if (!issue) {
        return {
          hasAccess: false,
          error: 'Issue not found or is hidden'
        };
      }
      
      // Calculate distance
      const distance = await GeospatialUtils.calculateDistance(
        userLat, userLng, issue.latitude, issue.longitude
      );
      
      const hasAccess = distance <= maxRadius;
      
      return {
        hasAccess,
        issue: hasAccess ? issue.toJSON() : null,
        distance: parseFloat(distance.toFixed(2)),
        maxRadius,
        error: hasAccess ? null : `Issue is ${distance.toFixed(2)}km away (max ${maxRadius}km allowed)`
      };
      
    } catch (error) {
      console.error('Error checking issue access:', error);
      return {
        hasAccess: false,
        error: `Failed to check issue access: ${error.message}`
      };
    }
  }
  
  /**
   * Get nearby issues grouped by distance ranges
   * @param {number} userLat - User's latitude
   * @param {number} userLng - User's longitude
   * @param {object} options - Options for grouping
   * @returns {Promise<object>} Issues grouped by distance ranges
   */
  static async getIssuesByDistanceRanges(userLat, userLng, options = {}) {
    try {
      const maxRadius = options.maxRadius || 5;
      const ranges = options.ranges || [
        { label: 'Very Close', min: 0, max: 1 },
        { label: 'Close', min: 1, max: 3 },
        { label: 'Nearby', min: 3, max: 5 }
      ];
      
      // Get all issues within max radius
      const allIssues = await this.getIssuesWithinRadius(userLat, userLng, {
        radius: maxRadius,
        limit: 200 // Higher limit for grouping
      });
      
      // Group issues by distance ranges
      const groupedIssues = {};
      ranges.forEach(range => {
        groupedIssues[range.label] = {
          range,
          issues: allIssues.issues.filter(issue => {
            const distance = parseFloat(issue.distance_km);
            return distance >= range.min && distance < range.max;
          }),
          count: 0
        };
        groupedIssues[range.label].count = groupedIssues[range.label].issues.length;
      });
      
      return {
        groupedIssues,
        totalIssues: allIssues.issues.length,
        userLocation: {
          latitude: userLat,
          longitude: userLng
        },
        maxRadius
      };
      
    } catch (error) {
      console.error('Error grouping issues by distance:', error);
      throw new Error(`Failed to group issues by distance: ${error.message}`);
    }
  }
  
  /**
   * Find the closest issues to a user's location
   * @param {number} userLat - User's latitude
   * @param {number} userLng - User's longitude
   * @param {number} count - Number of closest issues to return (default: 5)
   * @param {object} filters - Additional filters
   * @returns {Promise<object>} Closest issues with distance information
   */
  static async getClosestIssues(userLat, userLng, count = 5, filters = {}) {
    try {
      const result = await this.getIssuesWithinRadius(userLat, userLng, {
        ...filters,
        radius: 5, // Search within max radius
        limit: count
      });
      
      return {
        issues: result.issues.slice(0, count),
        count: Math.min(result.issues.length, count),
        userLocation: {
          latitude: userLat,
          longitude: userLng
        }
      };
      
    } catch (error) {
      console.error('Error getting closest issues:', error);
      throw new Error(`Failed to get closest issues: ${error.message}`);
    }
  }
  
  /**
   * Validate if a location is within an allowed reporting area
   * This can be extended to include city boundaries, restricted zones, etc.
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @returns {Promise<object>} Validation result
   */
  static async validateReportingLocation(latitude, longitude) {
    try {
      // Basic coordinate validation
      if (!GeospatialUtils.validateCoordinates(latitude, longitude)) {
        return {
          isValid: false,
          error: 'Invalid coordinates'
        };
      }
      
      // TODO: Add more sophisticated validation like:
      // - City boundary checks
      // - Restricted area checks
      // - Water body checks
      // For now, just validate coordinates
      
      return {
        isValid: true,
        location: {
          latitude: parseFloat(latitude.toFixed(8)),
          longitude: parseFloat(longitude.toFixed(8))
        }
      };
      
    } catch (error) {
      console.error('Error validating reporting location:', error);
      return {
        isValid: false,
        error: `Location validation failed: ${error.message}`
      };
    }
  }
  
  /**
   * Get statistics about issues in different distance ranges from user
   * @param {number} userLat - User's latitude
   * @param {number} userLng - User's longitude
   * @returns {Promise<object>} Statistics by distance and category
   */
  static async getLocationStatistics(userLat, userLng) {
    try {
      const ranges = [1, 2, 3, 5]; // km ranges
      const statistics = {
        byDistance: {},
        byCategory: {},
        byStatus: {},
        total: 0
      };
      
      // Get issues for each range
      for (const radius of ranges) {
        const result = await this.getIssuesWithinRadius(userLat, userLng, {
          radius,
          limit: 1000 // High limit for statistics
        });
        
        statistics.byDistance[`within_${radius}km`] = {
          count: result.issues.length,
          radius
        };
        
        if (radius === 5) { // Use max range for category/status stats
          statistics.total = result.issues.length;
          
          // Group by category
          statistics.byCategory = result.issues.reduce((acc, issue) => {
            acc[issue.category] = (acc[issue.category] || 0) + 1;
            return acc;
          }, {});
          
          // Group by status
          statistics.byStatus = result.issues.reduce((acc, issue) => {
            acc[issue.status] = (acc[issue.status] || 0) + 1;
            return acc;
          }, {});
        }
      }
      
      return {
        statistics,
        userLocation: {
          latitude: userLat,
          longitude: userLng
        },
        generatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error getting location statistics:', error);
      throw new Error(`Failed to get location statistics: ${error.message}`);
    }
  }
}

module.exports = GeolocationService;