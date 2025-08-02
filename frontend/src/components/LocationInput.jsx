import React, { useState, useEffect } from 'react';
import { geolocationService } from '../services/geolocationService';

const LocationInput = ({ location, onLocationChange, error }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [manualEntry, setManualEntry] = useState(false);

  // Auto-detect location on component mount
  useEffect(() => {
    if (!location.lat && !location.lng) {
      getCurrentLocation();
    }
  }, []);

  const getCurrentLocation = async () => {
    setIsLoading(true);
    setLocationError('');
    
    try {
      const position = await geolocationService.getCurrentPosition();
      onLocationChange({
        lat: position.lat,
        lng: position.lng,
        address: '' // Will be filled by reverse geocoding if needed
      });
      setManualEntry(false);
    } catch (err) {
      setLocationError(err.message);
      setManualEntry(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualLocationChange = (field, value) => {
    const numValue = parseFloat(value);
    onLocationChange({
      ...location,
      [field]: isNaN(numValue) ? '' : numValue
    });
  };

  const handleAddressChange = (value) => {
    onLocationChange({
      ...location,
      address: value
    });
  };

  const validateCoordinates = () => {
    if (!location.lat || !location.lng) return false;
    return geolocationService.isValidCoordinate(location.lat, location.lng);
  };

  return (
    <div className="space-y-4">
      {/* Location Status */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={isLoading}
          className="text-sm text-primary-600 hover:text-primary-500 disabled:text-gray-400"
        >
          {isLoading ? 'Detecting...' : 'Use Current Location'}
        </button>
      </div>

      {/* Location Display */}
      {location.lat && location.lng && validateCoordinates() && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <p className="text-sm text-green-800">
                Location detected: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
              {location.address && (
                <p className="text-xs text-green-600">{location.address}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {(locationError || error) && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800">{locationError || error}</p>
          </div>
        </div>
      )}

      {/* Manual Entry Toggle */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="manual-location"
          checked={manualEntry}
          onChange={(e) => setManualEntry(e.target.checked)}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label htmlFor="manual-location" className="ml-2 text-sm text-gray-700">
          Enter location manually
        </label>
      </div>

      {/* Manual Entry Fields */}
      {manualEntry && (
        <div className="space-y-3 bg-gray-50 p-4 rounded-md">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={location.lat || ''}
                onChange={(e) => handleManualLocationChange('lat', e.target.value)}
                placeholder="e.g., 40.7128"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={location.lng || ''}
                onChange={(e) => handleManualLocationChange('lng', e.target.value)}
                placeholder="e.g., -74.0060"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address (optional)
            </label>
            <input
              type="text"
              value={location.address || ''}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="e.g., 123 Main St, City, State"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <p className="text-xs text-gray-500">
            Tip: You can find coordinates using Google Maps by right-clicking on a location.
          </p>
        </div>
      )}

      {/* Validation Error */}
      {location.lat && location.lng && !validateCoordinates() && (
        <p className="text-sm text-red-600">
          Please enter valid coordinates (latitude: -90 to 90, longitude: -180 to 180)
        </p>
      )}
    </div>
  );
};

export default LocationInput;