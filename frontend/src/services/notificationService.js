import io from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

class NotificationService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  // Connect to WebSocket server
  connect(userId = null) {
    if (this.socket && this.isConnected) {
      return;
    }

    this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('Connected to notification server');
      this.isConnected = true;
      
      // Join user-specific room if authenticated
      if (userId) {
        this.socket.emit('join-user', userId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from notification server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.isConnected = false;
    });
  }

  // Join admin room
  joinAdminRoom() {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-admin');
    }
  }

  // Disconnect from WebSocket server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Listen for notifications
  onNotification(callback) {
    if (!this.socket) return;

    this.socket.on('notification', callback);
    this.listeners.set('notification', callback);
  }

  // Listen for admin notifications
  onAdminNotification(callback) {
    if (!this.socket) return;

    this.socket.on('admin-notification', callback);
    this.listeners.set('admin-notification', callback);
  }

  // Listen for system notifications
  onSystemNotification(callback) {
    if (!this.socket) return;

    this.socket.on('system-notification', callback);
    this.listeners.set('system-notification', callback);
  }

  // Remove notification listeners
  removeListeners() {
    if (!this.socket) return;

    this.listeners.forEach((callback, event) => {
      this.socket.off(event, callback);
    });
    this.listeners.clear();
  }

  // Get connection status
  getConnectionStatus() {
    return this.isConnected;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService; 