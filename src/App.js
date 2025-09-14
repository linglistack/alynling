import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import AppPage from './pages/AppPage';
import AuthSuccess from './pages/AuthSuccess';
import SimpleWaitlistPage from './pages/SimpleWaitlistPage';
import SimpleAdminPage from './pages/SimpleAdminPage';
import './App.css';

function App() {
  // Check if we're in waitlist mode
  const isWaitlistMode = process.env.REACT_APP_WAITLIST_MODE === 'true';
  
  // Debug: Log the environment variable and mode
  console.log('REACT_APP_WAITLIST_MODE:', process.env.REACT_APP_WAITLIST_MODE);
  console.log('isWaitlistMode:', isWaitlistMode);

  // If in waitlist mode, show waitlist page for most routes, but allow direct app access via /alynling
  if (isWaitlistMode) {
    console.log('🎯 WAITLIST MODE ACTIVE - Using waitlist routing');
    return (
      <AuthProvider>
        <Router>
          <div className="app-root">
            <Routes>
              {/* Direct app access via /alynling - no authentication required */}
              <Route 
                path="/alynling" 
                element={
                  <div>
                    {console.log('🚀 /alynling route matched - rendering AppPage')}
                    <AppPage />
                  </div>
                } 
              />
              
              {/* OAuth callback route (needed for /alynling access) */}
              <Route path="/auth/success" element={<AuthSuccess />} />
              
              {/* All other routes show waitlist page */}
              <Route 
                path="*" 
                element={
                  <div>
                    {console.log('📝 Wildcard route matched - rendering SimpleWaitlistPage')}
                    <SimpleWaitlistPage />
                  </div>
                } 
              />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    );
  }

  // Normal app mode with authentication
  return (
    <AuthProvider>
      <Router>
        <div className="app-root">
          <Routes>
            {/* Landing page route */}
            <Route path="/" element={<LandingPage />} />
            
            {/* OAuth callback route */}
            <Route path="/auth/success" element={<AuthSuccess />} />
            
            {/* Protected app routes */}
            <Route 
              path="/app" 
              element={
                <ProtectedRoute fallback={<Navigate to="/" replace />}>
                  <AppPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin access (still available in normal mode) */}
            <Route path="/alynling" element={<SimpleAdminPage />} />
            
            {/* Redirect any unknown routes to landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App; 