import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BASE_URL } from '../services/api';
import { Platform } from 'react-native';

export interface NotificationMessage {
  id: string;
  tipo: string;
  resultado: string;
  colaborador: string;
  subestacao_id: string;
  data_hora: string;
  lida: boolean;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || user.role === 'admin' || user.role === 'operador') {
      return;
    }

    const wsUrl = BASE_URL.replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/ws/notifications/${user.id}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const newNotification: NotificationMessage = {
          id: Math.random().toString(36).substring(7),
          ...data,
          lida: false,
        };
        
        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      } catch (e) {
        console.error("Error parsing WS message", e);
      }
    };

    ws.onerror = (e) => {
      console.error("WebSocket error", e);
    };

    return () => {
      ws.close();
    };
  }, [user]);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, markAllAsRead };
}
