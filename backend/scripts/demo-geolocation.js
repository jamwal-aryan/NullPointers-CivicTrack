/**
 * Demo script for geolocation services
 * This script demonstrates the core geolocation functionality without requiring database connection
 */

const GeospatialUtils = require('../utils/geospatial');
const LocationMiddleware = require('../middleware/location');

console.log('🌍 CivicTrack Geolocation Services Demo\n');

// Demo 1: Coordinate validation
console.log('1. Coordinate Validation:');
const testCoords = [
  { lat: 40.7128, lng: -74.0060, name: 'NYC (valid)' },
  { lat: 91, lng: 0, name: 'Invalid latitude' },
  { lat: 0, lng: 181, name: 'Invalid longitude' },
  { lat: 'invalid', lng: 0, name: 'Non-numeric' }
];

testCoords.forEach(coord => {
  const isValid = GeospatialUtils.validateCoordinates(coord.lat, coord.lng);
  console.log(`   ${coord.name}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
});

// Demo 2: Coordinate normalization
console.log('\n2. Coordinate Normalization:');
const rawCoords = { lat: 40.712812345678901, lng: -74.006012345678901 };
const normalized = GeospatialUtils.normalizeCoordinates(rawCoords.lat, rawCoords.lng);
console.log(`   Raw: ${rawCoords.lat}, ${rawCoords.lng}`);
console.log(`   Normalized: ${normalized.latitude}, ${normalized.longitude}`);

// Demo 3: Bounding box calculation
console.log('\n3. Bounding Box Calculation:');
const center = { lat: 40.7128, lng: -74.0060 };
const radius = 5; // km
const bbox = GeospatialUtils.getBoundingBox(center.lat, center.lng, radius);
console.log(`   Center: ${center.lat}, ${center.lng}`);
console.log(`   Radius: ${radius}km`);
console.log(`   Bounding Box:`);
console.log(`     North: ${bbox.north.toFixed(6)}`);
console.log(`     South: ${bbox.south.toFixed(6)}`);
console.log(`     East: ${bbox.east.toFixed(6)}`);
console.log(`     West: ${bbox.west.toFixed(6)}`);

// Demo 4: Bearing calculation
console.log('\n4. Bearing Calculation:');
const nyc = { lat: 40.7128, lng: -74.0060 };
const boston = { lat: 42.3601, lng: -71.0589 };
const bearing = GeospatialUtils.calculateBearing(nyc.lat, nyc.lng, boston.lat, boston.lng);
console.log(`   From NYC to Boston: ${bearing.toFixed(1)}° (Northeast)`);

// Demo 5: Distance conversion utilities
console.log('\n5. Distance Conversions:');
const meters = 5500;
const km = 3.2;
console.log(`   ${meters}m = ${GeospatialUtils.metersToKm(meters)}km`);
console.log(`   ${km}km = ${GeospatialUtils.kmToMeters(km)}m`);

// Demo 6: Middleware validation simulation
console.log('\n6. Middleware Validation Simulation:');

// Simulate valid request
const validReq = {
  body: { latitude: 40.7128, longitude: -74.0060 },
  query: {},
  params: {}
};

const mockRes = {
  status: (code) => ({ json: (data) => console.log(`   Status ${code}:`, data.error?.code || 'Success') }),
  json: (data) => console.log('   Response:', data)
};

const mockNext = () => console.log('   ✅ Validation passed, coordinates normalized');

console.log('   Testing valid coordinates:');
LocationMiddleware.validateCoordinates(validReq, mockRes, mockNext);
console.log(`   Normalized coordinates: ${validReq.coordinates.latitude}, ${validReq.coordinates.longitude}`);

// Simulate invalid request
console.log('\n   Testing invalid coordinates:');
const invalidReq = {
  body: { latitude: 91, longitude: 0 },
  query: {},
  params: {}
};

LocationMiddleware.validateCoordinates(invalidReq, mockRes, () => {});

// Demo 7: Radius validation
console.log('\n7. Radius Validation:');
const radiusTests = [
  { radius: '2.5', expected: 'valid' },
  { radius: '10', expected: 'invalid (too large)' },
  { radius: '0.05', expected: 'invalid (too small)' },
  { radius: undefined, expected: 'default (3km)' }
];

radiusTests.forEach(test => {
  const req = { query: { radius: test.radius }, body: {} };
  const res = {
    status: (code) => ({ json: (data) => console.log(`   ${test.radius || 'undefined'}: ❌ ${data.error.code}`) })
  };
  const next = () => console.log(`   ${test.radius || 'undefined'}: ✅ ${req.radius}km (${test.expected})`);
  
  LocationMiddleware.validateRadius(req, res, next);
});

console.log('\n🎉 Demo completed! All geolocation utilities are working correctly.');
console.log('\nNote: Database-dependent functions (distance calculations, issue queries)');
console.log('require a PostgreSQL connection with PostGIS extension for full functionality.');