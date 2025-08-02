# File Upload System Documentation

## Overview

The CivicTrack file upload system handles image uploads for issue reports with comprehensive validation, organized storage, and secure file serving. The system is built using Multer for handling multipart form data and includes features for file management, access control, and basic optimization.

## Features

- **Multi-file Upload**: Support for up to 3 images per issue report
- **File Validation**: Size, type, and count limits with detailed error messages
- **Organized Storage**: Date-based directory structure for better file management
- **Secure Serving**: Access control and path validation for file serving
- **File Management**: Admin tools for file information, deletion, and cleanup
- **Error Handling**: Comprehensive error handling with specific error codes

## API Endpoints

### Issue Photo Upload

#### POST /api/issues
Upload photos as part of issue creation.

**Request:**
- Content-Type: `multipart/form-data`
- Files: `photos[]` (up to 3 files)
- Supported formats: JPEG, PNG, WebP
- Max file size: 5MB per file

**Example:**
```javascript
const formData = new FormData();
formData.append('title', 'Road damage on Main St');
formData.append('description', 'Large pothole causing traffic issues');
formData.append('category', 'roads');
formData.append('latitude', '40.7128');
formData.append('longitude', '-74.0060');
formData.append('photos', file1);
formData.append('photos', file2);

fetch('/api/issues', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
```

**Response:**
```json
{
  "message": "Issue created successfully",
  "issue": {
    "id": "uuid",
    "title": "Road damage on Main St",
    "photos": [
      {
        "filename": "issue_1234567890_abc123.jpg",
        "originalName": "pothole.jpg",
        "path": "issues/2024/01/15/issue_1234567890_abc123.jpg",
        "size": 1024000,
        "mimetype": "image/jpeg",
        "url": "/api/files/issues/2024/01/15/issue_1234567890_abc123.jpg"
      }
    ]
  }
}
```

### File Serving

#### GET /api/files/{path}
Serve uploaded files with access control.

**Parameters:**
- `path`: File path relative to uploads directory

**Headers:**
- `Content-Type`: Appropriate MIME type
- `Cache-Control`: Public caching for 24 hours
- `Last-Modified`: File modification timestamp

**Example:**
```
GET /api/files/issues/2024/01/15/issue_1234567890_abc123.jpg
```

### File Management (Admin Only)

#### GET /api/files/info/{path}
Get file information and metadata.

**Response:**
```json
{
  "file": {
    "path": "issues/2024/01/15/file.jpg",
    "size": 1024000,
    "created": "2024-01-15T10:30:00Z",
    "modified": "2024-01-15T10:30:00Z",
    "isFile": true,
    "publicUrl": "/api/files/issues/2024/01/15/file.jpg"
  }
}
```

#### DELETE /api/files/{path}
Delete uploaded files (admin only).

**Response:**
```json
{
  "message": "File deleted successfully",
  "path": "issues/2024/01/15/file.jpg"
}
```

#### POST /api/files/cleanup
Clean up old files based on age.

**Request:**
```json
{
  "daysOld": 30
}
```

**Response:**
```json
{
  "message": "Cleanup completed",
  "results": {
    "filesDeleted": 15,
    "errors": 0,
    "daysOld": 30
  }
}
```

## File Storage Structure

Files are organized in a date-based directory structure:

```
uploads/
├── issues/
│   ├── 2024/
│   │   ├── 01/
│   │   │   ├── 15/
│   │   │   │   ├── issue_1234567890_abc123.jpg
│   │   │   │   └── issue_1234567891_def456.png
│   │   │   └── 16/
│   │   └── 02/
│   └── temp/ (for temporary files)
```

## File Naming Convention

Files are renamed using the following pattern:
```
issue_{timestamp}_{randomString}.{extension}
```

Example: `issue_1642248600000_a1b2c3d4e5f6.jpg`

## Validation Rules

### File Type Validation
- **Allowed MIME types**: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
- **Allowed extensions**: `.jpg`, `.jpeg`, `.png`, `.webp`

### File Size Validation
- **Maximum file size**: 5MB per file
- **Maximum files per request**: 3 files

### Security Validation
- Path traversal protection
- File extension validation
- MIME type verification
- Directory access restrictions

## Error Codes

| Code | Description |
|------|-------------|
| `FILE_TOO_LARGE` | File exceeds 5MB limit |
| `TOO_MANY_FILES` | More than 3 files uploaded |
| `INVALID_FILE_TYPE` | Unsupported MIME type |
| `INVALID_FILE_EXTENSION` | Unsupported file extension |
| `UNEXPECTED_FILE_FIELD` | Wrong form field name |
| `FILE_NOT_FOUND` | File doesn't exist or access denied |
| `DELETE_FAILED` | File deletion failed |
| `FILE_SERVE_ERROR` | Error serving file |

## Usage Examples

### Frontend File Upload (React)

```javascript
const handleFileUpload = async (files, issueData) => {
  const formData = new FormData();
  
  // Add issue data
  Object.keys(issueData).forEach(key => {
    formData.append(key, issueData[key]);
  });
  
  // Add files
  files.forEach(file => {
    formData.append('photos', file);
  });
  
  try {
    const response = await fetch('/api/issues', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }
    
    const result = await response.json();
    return result.issue;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

### File Preview Component

```javascript
const FilePreview = ({ photos }) => {
  return (
    <div className="photo-grid">
      {photos.map((photo, index) => (
        <div key={index} className="photo-item">
          <img 
            src={photo.url} 
            alt={photo.originalName}
            loading="lazy"
          />
          <div className="photo-info">
            <span>{photo.originalName}</span>
            <span>{(photo.size / 1024).toFixed(1)} KB</span>
          </div>
        </div>
      ))}
    </div>
  );
};
```

## Configuration

### Environment Variables

```env
# File upload settings
MAX_FILE_SIZE=5242880  # 5MB in bytes
MAX_FILES_PER_REQUEST=3
UPLOAD_PATH=./uploads
```

### Multer Configuration

The upload middleware is configured in `middleware/upload.js`:

```javascript
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 3 // Max 3 files
  }
});
```

## Security Considerations

1. **File Type Validation**: Both MIME type and extension are validated
2. **Path Traversal Protection**: Prevents access to files outside upload directory
3. **File Size Limits**: Prevents DoS attacks through large file uploads
4. **Access Control**: File serving includes basic access validation
5. **Directory Structure**: Organized storage prevents directory listing attacks

## Performance Considerations

1. **Caching**: Files are served with appropriate cache headers
2. **Directory Organization**: Date-based structure improves file system performance
3. **File Cleanup**: Admin tools for removing old files
4. **Lazy Loading**: Frontend should implement lazy loading for images

## Future Enhancements

1. **Image Optimization**: Automatic resizing and compression
2. **CDN Integration**: Serve files from CDN for better performance
3. **Thumbnail Generation**: Create thumbnails for faster loading
4. **Advanced Access Control**: User-specific file access permissions
5. **File Versioning**: Support for file updates and versioning
6. **Virus Scanning**: Integrate antivirus scanning for uploaded files

## Troubleshooting

### Common Issues

1. **"File too large" errors**: Check file size limits and client-side validation
2. **"Invalid file type" errors**: Ensure files have correct extensions and MIME types
3. **Files not serving**: Check file permissions and path validation
4. **Upload timeouts**: Consider increasing request timeout for large files

### Debugging

Enable debug logging by setting:
```env
DEBUG=multer,file-service
```

### File System Permissions

Ensure the uploads directory has proper permissions:
```bash
chmod 755 uploads/
chmod 644 uploads/**/*
```