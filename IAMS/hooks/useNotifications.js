import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const useNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count || 0);
    } catch (err) {
      console.error('Failed to fetch unread count:', err.message);
      // Silently fail - don't crash the app
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return { unreadCount, fetchUnreadCount };
};