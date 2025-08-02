const GeospatialUtils = require('../utils/geospatial');

/**
 * Location validation and access control middleware
 */
class LocationMiddleware {
  
  /**
   * Validate coordinates in request body or query parameters
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  static validateCoordinates(req, res, next) {
    // Check for coordinates in body (for POST/PUT requests)
    let { latitude, longitude } = req.body;
    
    // Check for coordinates in query params (for GET requests)
    if (!latitude || !longitude) {
      latitude = parseFloat(req.query.lat);
      longitude = parseFloat(req.query.lng);
    }
    
    // Convert string coordinates to numbers if needed
    if (typeof latitude === 'string') latitude = parseFloat(latitude);
    if (typeof longitude === 'string') longitude = parseFloat(longitude);
    
    if (!GeospatialUtils.validateCoordinates(latitude, longitude)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_COORDINATES',
          message: 'Invalid latitude or longitude coordinates',
          details: {
            latitude: 'Must be between -90 and 90',
            longitude: 'Must be between -180 and 180'
          },
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Normalize coordinates and attach to request
    req.coordinates = {
      latitude: parseFloat(latitude.toFixed(8)),
      longitude: parseFloat(longitude.toFixed(8))
    };
    
    next();
  }
  
  /**
   * Enforce 3-5km radius access control for viewing issues
   * Validates that user can only access issues within their neighborhood zone
   * @param {number} maxRadius - Maximum allowed radius in km (default: 5)
   */
  static enforceRadiusAccess(maxRadius = 5) {
    return async (req, res, next) => {
      try {
        const userLat = parseFloat(req.query.userLat || req.body.userLat);
        const userLng = parseFloat(req.query.userLng || req.body.userLng);
        
        // Validate user's current location
        if (!GeospatialUtils.validateCoordinates(userLat, userLng)) {
          return res.status(400).json({
            error: {
              code: 'USER_LOCATION_REQUIRED',
              message: 'Valid user location (userLat, userLng) is required for location-based access',
              timestamp: new Date().toISOString()
            }
          });
        }
        
        // For issue access by ID, check if issue is within user's radius
        if (req.params.id) {
          const Issue = require('../models/Issue');
          const issue = await Issue.findByPk(req.params.id, {
            attributes: ['id', 'latitude', 'longitude']
          });
          
          if (!issue) {
            return res.status(404).json({
              error: {
                code: 'ISSUE_NOT_FOUND',
                message: 'Issue not found',
                timestamp: new Date().toISOString()
              }
            });
          }
          
          const distance = await GeospatialUtils.calculateDistance(
            userLat, userLng, issue.latitude, issue.longitude
          );
          
          if (distance > maxRadius) {
            return res.status(403).json({
              error: {
                code: 'LOCATION_ACCESS_DENIED',
                message: `Issue is outside your neighborhood zone (${distance.toFixed(2)}km away, max ${maxRadius}km allowed)`,
                timestamp: new Date().toISOString()
              }
            });
          }
        }
        
        // Attach user location to request for further processing
        req.userLocation = {
          latitude: parseFloat(userLat.toFixed(8)),
          longitude: parseFloat(userLng.toFixed(8))
        };
        
        next();
      } catch (error) {
        console.error('Location access control error:', error);
        res.status(500).json({
          error: {
            code: 'LOCATION_ACCESS_ERROR',
            message: 'Error validating location access',
            timestamp: new Date().toISOString()
          }
        });
      }
    };
  }
  
  /**
   * Validate and normalize radius parameter
   * Ensures radius is within acceptable bounds (0.1km to 5km)
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  static validateRadius(req, res, next) {
    let radius = parseFloat(req.query.radius || req.body.radius || 3); // Default 3km
    
    // Validate radius bounds
    if (isNaN(radius) || radius < 0.1 || radius > 5) {
      return res.status(400).json({
        error: {
          code: 'INVALID_RADIUS',
          message: 'Radius must be between 0.1km and 5km',
          details: {
            provided: req.query.radius || req.body.radius,
            min: 0.1,
            max: 5,
            default: 3
          },
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Normalize radius to 2 decimal places
    req.radius = parseFloat(radius.toFixed(2));
    next();
  }
  
  /**
   * Validate location for issue creation
   * Ensures the issue location is reasonable and not in restricted areas
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  static validateIssueLocation(req, res, next) {
    const { latitude, longitude, userLat, userLng } = req.body;
    
    // Validate issue coordinates
    if (!GeospatialUtils.validateCoordinates(latitude, longitude)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ISSUE_LOCATION',
          message: 'Invalid issue location coordinates',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // If user location is provided, validate they're not reporting too far away
    if (userLat && userLng) {
      if (!GeospatialUtils.validateCoordinates(userLat, userLng)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_USER_LOCATION',
            message: 'Invalid user location coordinates',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Check if issue is being reported within reasonable distance (10km max)
      GeospatialUtils.calculateDistance(userLat, userLng, latitude, longitude)
        .then(distance => {
          if (distance > 10) {
            return res.status(400).json({
              error: {
                code: 'ISSUE_TOO_FAR',
                message: `Issue location is too far from your current location (${distance.toFixed(2)}km away, max 10km allowed)`,
                timestamp: new Date().toISOString()
              }
            });
          }
          
          // Normalize coordinates
          req.body.latitude = parseFloat(latitude.toFixed(8));
          req.body.longitude = parseFloat(longitude.toFixed(8));
          next();
        })
        .catch(error => {
          console.error('Distance calculation error:', error);
          res.status(500).json({
            error: {
              code: 'LOCATION_VALIDATION_ERROR',
              message: 'Error validating issue location',
              timestamp: new Date().toISOString()
            }
          });
        });
    } else {
      // No user location provided, just normalize coordinates
      req.body.latitude = parseFloat(latitude.toFixed(8));
      req.body.longitude = parseFloat(longitude.toFixed(8));
      next();
    }
  }
}

module.exports = LocationMiddleware;