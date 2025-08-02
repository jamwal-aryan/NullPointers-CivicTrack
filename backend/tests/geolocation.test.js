const { describe, it, expect, beforeEach } = require('@jest/globals');
const GeospatialUtils = require('../utils/geospatial');
const LocationMiddleware = require('../middleware/location');

describe('Geolocation Services', () => {

  describe('GeospatialUtils', () => {
    describe('validateCoordinates', () => {
      it('should validate correct coordinates', () => {
        expect(GeospatialUtils.validateCoordinates(40.7128, -74.0060)).toBe(true);
        expect(GeospatialUtils.validateCoordinates(0, 0)).toBe(true);
        expect(GeospatialUtils.validateCoordinates(-90, -180)).toBe(true);
        expect(GeospatialUtils.validateCoordinates(90, 180)).toBe(true);
      });

      it('should reject invalid coordinates', () => {
        expect(GeospatialUtils.validateCoordinates(91, 0)).toBe(false);
        expect(GeospatialUtils.validateCoordinates(-91, 0)).toBe(false);
        expect(GeospatialUtils.validateCoordinates(0, 181)).toBe(false);
        expect(GeospatialUtils.validateCoordinates(0, -181)).toBe(false);
        expect(GeospatialUtils.validateCoordinates(NaN, 0)).toBe(false);
        expect(GeospatialUtils.validateCoordinates(0, NaN)).toBe(false);
        expect(GeospatialUtils.validateCoordinates('invalid', 0)).toBe(false);
      });
    });

    // Note: calculateDistance and isWithinRadius tests require database connection
    // These would be tested in integration tests with proper database setup

    describe('normalizeCoordinates', () => {
      it('should normalize coordinates to 8 decimal places', () => {
        const normalized = GeospatialUtils.normalizeCoordinates(
          40.712812345678901,
          -74.006012345678901
        );
        expect(normalized.latitude).toBe(40.71281235);
        expect(normalized.longitude).toBe(-74.00601235);
      });

      it('should throw error for invalid coordinates', () => {
        expect(() => {
          GeospatialUtils.normalizeCoordinates(91, 0);
        }).toThrow('Invalid coordinates provided for normalization');
      });
    });

    describe('getBoundingBox', () => {
      it('should calculate correct bounding box', () => {
        const bbox = GeospatialUtils.getBoundingBox(40.7128, -74.0060, 5);
        expect(bbox.north).toBeGreaterThan(40.7128);
        expect(bbox.south).toBeLessThan(40.7128);
        expect(bbox.east).toBeGreaterThan(-74.0060);
        expect(bbox.west).toBeLessThan(-74.0060);
      });
    });

    describe('calculateBearing', () => {
      it('should calculate bearing between two points', () => {
        // Bearing from NYC to Boston (approximately northeast, ~45 degrees)
        const bearing = GeospatialUtils.calculateBearing(
          40.7128, -74.0060, // NYC
          42.3601, -71.0589  // Boston
        );
        expect(bearing).toBeGreaterThan(30);
        expect(bearing).toBeLessThan(60);
      });
    });
  });

  // Note: GeolocationService tests require database connection
  // These would be tested in integration tests with proper database setup

  describe('LocationMiddleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        body: {},
        query: {},
        params: {}
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });

    describe('validateCoordinates', () => {
      it('should validate coordinates in request body', () => {
        mockReq.body = { latitude: 40.7128, longitude: -74.0060 };

        LocationMiddleware.validateCoordinates(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.coordinates).toEqual({
          latitude: 40.71280000,
          longitude: -74.00600000
        });
      });

      it('should validate coordinates in query params', () => {
        mockReq.query = { lat: '40.7128', lng: '-74.0060' };

        LocationMiddleware.validateCoordinates(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.coordinates).toEqual({
          latitude: 40.71280000,
          longitude: -74.00600000
        });
      });

      it('should reject invalid coordinates', () => {
        mockReq.body = { latitude: 91, longitude: 0 };

        LocationMiddleware.validateCoordinates(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'INVALID_COORDINATES'
            })
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('validateRadius', () => {
      it('should validate and normalize radius', () => {
        mockReq.query = { radius: '2.5' };

        LocationMiddleware.validateRadius(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.radius).toBe(2.5);
      });

      it('should use default radius when none provided', () => {
        LocationMiddleware.validateRadius(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.radius).toBe(3);
      });

      it('should reject radius outside bounds', () => {
        mockReq.query = { radius: '10' };

        LocationMiddleware.validateRadius(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'INVALID_RADIUS'
            })
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('validateIssueLocation', () => {
      it('should validate issue location without user location', () => {
        mockReq.body = { latitude: 40.7128, longitude: -74.0060 };

        LocationMiddleware.validateIssueLocation(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.latitude).toBe(40.71280000);
        expect(mockReq.body.longitude).toBe(-74.00600000);
      });

      it('should reject invalid issue coordinates', () => {
        mockReq.body = { latitude: 91, longitude: 0 };

        LocationMiddleware.validateIssueLocation(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'INVALID_ISSUE_LOCATION'
            })
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });
});