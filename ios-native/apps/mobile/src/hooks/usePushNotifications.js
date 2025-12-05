import { useEffect, useRef } from 'react';
import { useAuth } from '@/utils/auth/useAuth';
import {
  registerForPushNotificationsAsync,
  setupNotificationListeners,
  removeNotificationListeners,
} from '@/utils/notifications';

export function usePushNotifications() {
  const { user } = useAuth();
  const listenersRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    // Register for push notifications when user is logged in
    registerForPushNotificationsAsync(user.id).catch((error) => {
      console.error('Error registering for push notifications:', error);
    });

    // Set up notification listeners
    listenersRef.current = setupNotificationListeners();

    // Cleanup on unmount
    return () => {
      if (listenersRef.current) {
        removeNotificationListeners(listenersRef.current);
      }
    };
  }, [user?.id]);
}


