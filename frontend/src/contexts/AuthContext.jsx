import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        loading: false, 
        user: action.payload.user, 
        token: action.payload.token,
        isAuthenticated: true,
        error: null 
      };
    case 'LOGIN_ERROR':
      return { 
        ...state, 
        loading: false, 
        error: action.payload,
        isAuthenticated: false 
      };
    case 'LOGOUT':
      return { 
        ...state, 
        user: null, 
        token: null, 
        isAuthenticated: false,
        loading: false,
        error: null 
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: false,
  error: null
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is authenticated on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch({ type: 'SET_LOADING', payload: true });
      authService.verifyToken(token)
        .then(user => {
          dispatch({ 
            type: 'LOGIN_SUCCESS', 
            payload: { user, token } 
          });
        })
        .catch(() => {
          localStorage.removeItem('token');
          dispatch({ type: 'LOGOUT' });
        });
    }
  }, []);

  const login = async (credentials) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.login(credentials);
      localStorage.setItem('token', response.token);
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: response 
      });
      return response;
    } catch (error) {
      dispatch({ 
        type: 'LOGIN_ERROR', 
        payload: error.message || 'Login failed' 
      });
      throw error;
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.register(userData);
      localStorage.setItem('token', response.token);
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: response 
      });
      return response;
    } catch (error) {
      dispatch({ 
        type: 'LOGIN_ERROR', 
        payload: error.message || 'Registration failed' 
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};