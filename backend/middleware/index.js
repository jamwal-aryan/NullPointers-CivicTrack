// Middleware modules will be exported here
// This file will export all middleware for easy importing

const auth = require('./auth');
const location = require('./location');

module.exports = {
  auth,
  location
};