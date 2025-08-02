# CivicTrack

A citizen engagement platform that empowers local residents to report and track civic issues within their neighborhood. The system enables users to report various types of local problems (road damage, lighting issues, water leaks, cleanliness concerns, etc.) and track their resolution status.

## Features

- 📍 **Location-based reporting** - Report issues with GPS location capture
- 🗺️ **Interactive map view** - View issues on an interactive map with filtering
- 📱 **Mobile-responsive** - Progressive Web App (PWA) for mobile devices
- 👤 **Anonymous & verified reporting** - Support for both anonymous and verified users
- 🚩 **Content moderation** - Community flagging and admin review system
- 📊 **Analytics dashboard** - Admin tools for tracking platform usage
- 🔔 **Real-time notifications** - WebSocket-based status updates

## Tech Stack

### Frontend
- React.js with Vite
- Tailwind CSS for styling
- Leaflet.js for interactive maps
- Progressive Web App (PWA) capabilities

### Backend
- Node.js with Express.js
- PostgreSQL with PostGIS for geospatial data
- Redis for caching and sessions
- Socket.io for real-time notifications
- JWT for authentication

## Prerequisites

Before running this application, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/) (v13 or higher) with PostGIS extension
- [Redis](https://redis.io/) (v6 or higher)
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd civic-track
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   
   **Backend configuration:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your database and other configuration details
   ```

   **Frontend configuration:**
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env with your API and map configuration
   ```

4. **Set up the database**
   - Create a PostgreSQL database named `civic_track`
   - Install PostGIS extension: `CREATE EXTENSION postgis;`
   - Run database setup:
     ```bash
     cd backend
     npm run db:setup
     ```

5. **Start Redis server**
   ```bash
   redis-server
   ```

## Development

### Start the development servers

**Option 1: Start both frontend and backend together**
```bash
npm run dev
```

**Option 2: Start servers individually**

Backend server (runs on http://localhost:3001):
```bash
npm run dev:backend
```

Frontend server (runs on http://localhost:5173):
```bash
npm run dev:frontend
```

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build the frontend for production
- `npm start` - Start the backend in production mode
- `npm test` - Run tests for both frontend and backend
- `npm run install:all` - Install dependencies for root, backend, and frontend

### Database Scripts (Backend)

- `npm run db:validate` - Validate database models without connection
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with test data
- `npm run db:setup` - Run migrations and seed data

## Project Structure

```
civic-track/
├── backend/                 # Node.js/Express backend
│   ├── controllers/         # Request handlers
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── server.js           # Main server file
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── main.jsx        # Entry point
│   ├── index.html
│   └── package.json
├── package.json            # Root package.json
└── README.md
```

## API Endpoints

The backend server provides a REST API with the following base endpoints:

- `GET /health` - Health check endpoint
- `GET /api` - API status endpoint

More endpoints will be added as development progresses.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.