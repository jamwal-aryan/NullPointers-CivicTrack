import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import notificationService from '../services/notificationService';
import NotificationToast from './NotificationToast';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Connect to notification service when user is authenticated
    if (isAuthenticated && user) {
      notificationService.connect(user.id);
      
      // Listen for user notifications
      notificationService.onNotification((notification) => {
        setNotifications(prev => [...prev, { ...notification, id: Date.now() }]);
      });

      // Listen for system notifications
      notificationService.onSystemNotification((notification) => {
        setNotifications(prev => [...prev, { ...notification, id: Date.now() }]);
      });

      // Cleanup on unmount
      return () => {
        notificationService.removeListeners();
        notificationService.disconnect();
      };
    }
  }, [isAuthenticated, user]);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const value = {
    notifications,
    removeNotification,
    clearAllNotifications,
    isConnected: notificationService.getConnectionStatus()
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Render notification toasts */}
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </NotificationContext.Provider>
  );
}; 