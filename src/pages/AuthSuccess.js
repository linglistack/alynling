import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * 🔐 MICRO-FEATURE: OAuth Success Handler
 * 
 * Handles OAuth callback success by:
 * - Extracting token from URL parameters
 * - Setting authentication state
 * - Redirecting to main application
 */
const AuthSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthSuccess = async () => {
      try {
        // Extract token from URL parameters
        const urlParams = new URLSearchParams(location.search);
        const token = urlParams.get('token');

        if (token) {
          // Store the token in localStorage
          localStorage.setItem('authToken', token);
          
          // Redirect to main application and let the AuthContext handle the rest
          // The AuthContext will detect the token and fetch user data
          navigate('/app', { replace: true });
        } else {
          console.error('No token found in URL');
          navigate('/?error=no_token', { replace: true });
        }
      } catch (error) {
        console.error('OAuth success handling error:', error);
        navigate('/?error=oauth_error', { replace: true });
      }
    };

    handleAuthSuccess();
  }, [location, navigate]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #f3f3f3',
        borderTop: '3px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <p style={{ color: '#666', fontSize: '16px' }}>
        Completing sign in...
      </p>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AuthSuccess;
