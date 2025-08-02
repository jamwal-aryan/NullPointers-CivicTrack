import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { issueService } from '../services/issueService';
import PhotoUpload from './PhotoUpload';
import LocationInput from './LocationInput';
import LoadingSpinner from './LoadingSpinner';

const CATEGORIES = [
  { value: 'roads', label: 'Roads' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'water', label: 'Water Supply' },
  { value: 'cleanliness', label: 'Cleanliness' },
  { value: 'safety', label: 'Public Safety' },
  { value: 'obstructions', label: 'Obstructions' }
];

const IssueReportForm = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    photos: [],
    location: { lat: '', lng: '', address: '' },
    isAnonymous: !isAuthenticated // Default to anonymous if not logged in
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    // Category validation
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    // Location validation
    if (!formData.location.lat || !formData.location.lng) {
      newErrors.location = 'Location is required';
    } else if (
      typeof formData.location.lat !== 'number' ||
      typeof formData.location.lng !== 'number' ||
      formData.location.lat < -90 ||
      formData.location.lat > 90 ||
      formData.location.lng < -180 ||
      formData.location.lng > 180
    ) {
      newErrors.location = 'Please provide valid coordinates';
    }

    // Photos validation (optional but if provided, must be valid)
    if (formData.photos.length > 3) {
      newErrors.photos = 'Maximum 3 photos allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await issueService.createIssue(formData);
      setSubmitSuccess(true);
      
      // Redirect to issue detail or map after successful submission
      setTimeout(() => {
        navigate('/map');
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting issue:', error);
      setErrors({
        submit: error.message || 'Failed to submit issue. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-semibold text-green-800 mb-2">Issue Reported Successfully!</h2>
          <p className="text-green-700 mb-4">
            Thank you for reporting this issue. You'll be redirected to the map view shortly.
          </p>
          <button
            onClick={() => navigate('/map')}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            View on Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Report an Issue</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Anonymous/Verified Toggle */}
          {isAuthenticated && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Reporting as</h3>
                  <p className="text-sm text-blue-600">
                    {formData.isAnonymous ? 'Anonymous user' : `${user?.email || 'Verified user'}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('isAnonymous', !formData.isAnonymous)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.isAnonymous ? 'bg-gray-400' : 'bg-primary-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.isAnonymous ? 'translate-x-1' : 'translate-x-6'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Brief description of the issue"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.category ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Provide detailed information about the issue"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <div className="flex justify-between mt-1">
              {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
              <p className="text-sm text-gray-500">{formData.description.length}/1000</p>
            </div>
          </div>

          {/* Location */}
          <div>
            <LocationInput
              location={formData.location}
              onLocationChange={(location) => handleInputChange('location', location)}
              error={errors.location}
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photos (optional)
            </label>
            <PhotoUpload
              photos={formData.photos}
              onPhotosChange={(photos) => handleInputChange('photos', photos)}
              error={errors.photos}
            />
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssueReportForm;