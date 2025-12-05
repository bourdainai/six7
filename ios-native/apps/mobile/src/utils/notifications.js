import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabaseClient';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and save device token to Supabase
 */
export async function registerForPushNotificationsAsync(userId) {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  try {
    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }

    // Get push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    const token = tokenData.data;
    console.log('Push token:', token);

    // Save token to user's profile or create device_tokens table entry
    if (userId && token) {
      try {
        // Check if device_tokens table exists, if not we'll store in profile metadata
        const { error } = await supabase
          .from('profiles')
          .update({
            push_token: token,
            push_token_platform: Platform.OS,
          })
          .eq('id', userId);

        if (error) {
          console.error('Error saving push token:', error);
        } else {
          console.log('Push token saved successfully');
        }
      } catch (error) {
        console.error('Error saving push token to database:', error);
      }
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Set up notification listeners
 */
export function setupNotificationListeners(navigation) {
  // Handle notification received while app is in foreground
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
    // You can handle the notification here (show custom UI, etc.)
  });

  // Handle notification tap/response
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('Notification tapped:', data);

    // Navigate based on notification data
    if (data?.link && navigation) {
      // Parse link and navigate
      // e.g., /listing/123 -> navigation.navigate('listing', { id: '123' })
    }
  });

  return {
    notificationListener,
    responseListener,
  };
}

/**
 * Remove notification listeners
 */
export function removeNotificationListeners(listeners) {
  if (listeners?.notificationListener) {
    Notifications.removeNotificationSubscription(listeners.notificationListener);
  }
  if (listeners?.responseListener) {
    Notifications.removeNotificationSubscription(listeners.responseListener);
  }
}

