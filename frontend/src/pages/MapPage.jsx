import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { issueService } from '../services/issueService';
import { geolocationService } from '../services/geolocationService';
import LoadingSpinner from '../components/LoadingSpinner';

// Fix for default markers in react-leaflet
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons for different categories
const categoryIcons = {
  roads: new Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3VjEwQzIgMTAgMTIgMTUgMjIgMTBWN0wxMiAyWiIgZmlsbD0iI0Y1OTM0MyIvPgo8cGF0aCBkPSJNMTIgMkwxMiAxNUwyMiAxMFY3TDEyIDJaIiBmaWxsPSIjRkY2QjM0Ii8+Cjwvc3ZnPgo=',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
  lighting: new Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTIgMTJMMTggMTJMMTIgMloiIGZpbGw9IiNGRkQ3MDAiLz4KPHBhdGggZD0iTTEyIDJMMTIgMTJMMTYgMTJMMTIgMloiIGZpbGw9IiNGRkY5MDAiLz4KPC9zdmc+Cg==',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
  water: new Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTIgMTJMMTggMTJMMTIgMloiIGZpbGw9IiMwMEE2RkYiLz4KPHBhdGggZD0iTTEyIDJMMTIgMTJMMTYgMTJMMTIgMloiIGZpbGw9IiMwMEE2RkYiLz4KPC9zdmc+Cg==',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
  cleanliness: new Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTIgMTJMMTggMTJMMTIgMloiIGZpbGw9IiMxMEI5NEEiLz4KPHBhdGggZD0iTTEyIDJMMTIgMTJMMTYgMTJMMTIgMloiIGZpbGw9IiMxMEI5NEEiLz4KPC9zdmc+Cg==',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
  safety: new Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTIgMTJMMTggMTJMMTIgMloiIGZpbGw9IiNGRjQ0NDQiLz4KPHBhdGggZD0iTTEyIDJMMTIgMTJMMTYgMTJMMTIgMloiIGZpbGw9IiNGRjQ0NDQiLz4KPC9zdmc+Cg==',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
  obstructions: new Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTIgMTJMMTggMTJMMTIgMloiIGZpbGw9IiM2QzcyODAiLz4KPHBhdGggZD0iTTEyIDJMMTIgMTJMMTYgMTJMMTIgMloiIGZpbGw9IiM2QzcyODAiLz4KPC9zdmc+Cg==',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
};

const CATEGORIES = [
  { value: 'roads', label: 'Roads' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'water', label: 'Water Supply' },
  { value: 'cleanliness', label: 'Cleanliness' },
  { value: 'safety', label: 'Public Safety' },
  { value: 'obstructions', label: 'Obstructions' }
];

const STATUS_COLORS = {
  'reported': '#6B7280',
  'under_review': '#F59E0B',
  'in_progress': '#3B82F6',
  'resolved': '#10B981',
  'rejected': '#EF4444'
};

// Component to handle map center updates
function MapUpdater({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  
  return null;
}

const MapPage = () => {
  const [issues, setIssues] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    distance: 5, // km
    showUserLocation: true
  });
  const [selectedIssue, setSelectedIssue] = useState(null);
  const mapRef = useRef(null);

  // Get user location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Load issues when location or filters change
  useEffect(() => {
    if (userLocation) {
      loadIssues();
    }
  }, [userLocation, filters]);

  const getCurrentLocation = async () => {
    try {
      const position = await geolocationService.getCurrentPosition();
      setUserLocation([position.lat, position.lng]);
    } catch (err) {
      console.error('Failed to get user location:', err);
      // Default to a fallback location
      setUserLocation([51.505, -0.09]); // London coordinates as fallback
    } finally {
      setLoading(false);
    }
  };

  const loadIssues = async () => {
    if (!userLocation) return;

    try {
      setLoading(true);
      const params = {
        latitude: userLocation[0],
        longitude: userLocation[1],
        radius: filters.distance * 1000, // Convert km to meters
        category: filters.category || undefined,
        status: filters.status || undefined,
      };

      const response = await issueService.getIssues(params);
      setIssues(response.data.issues || []);
    } catch (err) {
      console.error('Failed to load issues:', err);
      setError('Failed to load issues. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'reported': 'Reported',
      'under_review': 'Under Review',
      'in_progress': 'In Progress',
      'resolved': 'Resolved',
      'rejected': 'Rejected'
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && !userLocation) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Loading map...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadIssues}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Issues Map</h1>
          <p className="text-gray-600">
            View and track civic issues in your area
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Statuses</option>
                <option value="reported">Reported</option>
                <option value="under_review">Under Review</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Distance Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Distance (km)
              </label>
              <select
                value={filters.distance}
                onChange={(e) => handleFilterChange('distance', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={1}>1 km</option>
                <option value={3}>3 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
              </select>
            </div>

            {/* Show User Location Toggle */}
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.showUserLocation}
                  onChange={(e) => handleFilterChange('showUserLocation', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show my location</span>
              </label>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-96 w-full">
            <MapContainer
              center={userLocation || [51.505, -0.09]}
              zoom={13}
              className="h-full w-full"
              ref={mapRef}
            >
              <MapUpdater center={userLocation} />
              
              {/* Tile Layer */}
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              {/* User Location */}
              {userLocation && filters.showUserLocation && (
                <>
                  <Marker
                    position={userLocation}
                    icon={new Icon({
                      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTIgMTJMMTggMTJMMTIgMloiIGZpbGw9IiMzQjgyRkYiLz4KPC9zdmc+Cg==',
                      iconSize: [25, 41],
                      iconAnchor: [12, 41],
                    })}
                  >
                    <Popup>
                      <div className="text-center">
                        <p className="font-medium">Your Location</p>
                        <p className="text-sm text-gray-600">
                          {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                  
                  {/* Distance Circle */}
                  <Circle
                    center={userLocation}
                    radius={filters.distance * 1000}
                    pathOptions={{
                      color: '#3B82F6',
                      fillColor: '#3B82F6',
                      fillOpacity: 0.1,
                      weight: 2
                    }}
                  />
                </>
              )}

              {/* Issue Markers */}
              {issues.map((issue) => (
                <Marker
                  key={issue.id}
                  position={[issue.latitude, issue.longitude]}
                  icon={categoryIcons[issue.category] || categoryIcons.roads}
                  eventHandlers={{
                    click: () => setSelectedIssue(issue)
                  }}
                >
                  <Popup>
                    <div className="min-w-64">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{issue.title}</h3>
                        <span
                          className="px-2 py-1 text-xs font-medium rounded-full"
                          style={{
                            backgroundColor: `${STATUS_COLORS[issue.status]}20`,
                            color: STATUS_COLORS[issue.status]
                          }}
                        >
                          {getStatusLabel(issue.status)}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-3">{issue.description}</p>
                      
                      <div className="space-y-1 text-xs text-gray-500">
                        <p><strong>Category:</strong> {CATEGORIES.find(c => c.value === issue.category)?.label}</p>
                        <p><strong>Reported:</strong> {formatDate(issue.createdAt)}</p>
                        {issue.updatedAt !== issue.createdAt && (
                          <p><strong>Updated:</strong> {formatDate(issue.updatedAt)}</p>
                        )}
                        {issue.photos && issue.photos.length > 0 && (
                          <p><strong>Photos:</strong> {issue.photos.length}</p>
                        )}
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => {
                            // Navigate to issue detail page
                            window.location.href = `/issues/${issue.id}`;
                          }}
                          className="w-full bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Issue Count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {issues.length} issue{issues.length !== 1 ? 's' : ''} within {filters.distance}km
          {userLocation && (
            <span> of your location</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPage; 