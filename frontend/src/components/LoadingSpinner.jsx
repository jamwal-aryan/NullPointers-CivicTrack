import React from 'react';

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div 
      className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export const LoadingPage = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <LoadingSpinner size="xl" />
      <p className="mt-4 text-lg text-gray-600">{message}</p>
    </div>
  );
};

export const LoadingOverlay = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 flex flex-col items-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-700">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;