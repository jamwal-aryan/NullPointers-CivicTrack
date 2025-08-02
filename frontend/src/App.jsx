import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import ReportPage from './pages/ReportPage';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes with layout */}
            <Route path="/" element={
              <Layout>
                <HomePage />
              </Layout>
            } />
            
            {/* Auth routes without layout */}
            <Route path="/login" element={
              <ProtectedRoute requireAuth={false}>
                <LoginForm />
              </ProtectedRoute>
            } />
            <Route path="/register" element={
              <ProtectedRoute requireAuth={false}>
                <RegisterForm />
              </ProtectedRoute>
            } />
            
            {/* Protected routes with layout */}
            <Route path="/map" element={
              <Layout>
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                  <div className="px-4 py-6 sm:px-0">
                    <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
                      <div className="text-center">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Issues Map</h2>
                        <p className="text-gray-600">Map view coming in the next task!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Layout>
            } />
            
            <Route path="/report" element={
              <Layout>
                <ReportPage />
              </Layout>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6 sm:px-0">
                      <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
                        <div className="text-center">
                          <h2 className="text-2xl font-semibold text-gray-900 mb-4">User Profile</h2>
                          <p className="text-gray-600">Profile page coming soon!</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* 404 page */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;