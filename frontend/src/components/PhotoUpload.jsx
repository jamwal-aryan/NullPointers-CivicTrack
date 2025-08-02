import React, { useState, useRef } from 'react';

const PhotoUpload = ({ photos, onPhotosChange, maxPhotos = 3, error }) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = (files) => {
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];

    fileArray.forEach((file) => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name} is not an image file`);
        return;
      }

      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`${file.name} is too large (max 5MB)`);
        return;
      }

      validFiles.push(file);
    });

    // Check total photo count
    const totalPhotos = photos.length + validFiles.length;
    if (totalPhotos > maxPhotos) {
      errors.push(`Maximum ${maxPhotos} photos allowed`);
      const allowedCount = maxPhotos - photos.length;
      validFiles.splice(allowedCount);
    }

    if (errors.length > 0) {
      // You might want to show these errors to the user
      console.warn('Photo upload errors:', errors);
    }

    if (validFiles.length > 0) {
      onPhotosChange([...photos, ...validFiles]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const removePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : photos.length >= maxPhotos
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-300 hover:border-primary-400'
        } ${error ? 'border-red-300' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />
        
        {photos.length < maxPhotos ? (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4">
              <button
                type="button"
                onClick={openFileDialog}
                className="text-primary-600 hover:text-primary-500 font-medium"
              >
                Upload photos
              </button>
              <p className="text-gray-500">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              PNG, JPG, GIF up to 5MB each ({photos.length}/{maxPhotos} photos)
            </p>
          </div>
        ) : (
          <div className="text-gray-500">
            <p>Maximum {maxPhotos} photos reached</p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Photo Previews */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {photos.map((photo, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={URL.createObjectURL(photo)}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <p className="text-xs text-gray-500 mt-1 truncate">{photo.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;