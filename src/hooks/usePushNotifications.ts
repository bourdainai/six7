import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    // Check if push notifications are supported
    const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (user && isSupported) {
      checkSubscription();
    }
  }, [user, isSupported]);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking push subscription:", error);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error("Push notifications are not supported on this device");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        return true;
      } else if (result === "denied") {
        toast.error("Notification permission denied. Please enable in browser settings.");
      }
      return false;
    } catch (error) {
      console.error("Error requesting permission:", error);
      return false;
    }
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to enable notifications");
      return false;
    }

    if (!isSupported) {
      toast.error("Push notifications are not supported");
      return false;
    }

    setIsLoading(true);
    try {
      // First request permission
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        return false;
      }

      // Register service worker if not already
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Get VAPID public key from edge function
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke("get-vapid-key");
      
      if (vapidError || !vapidData?.publicKey) {
        console.error("Could not get VAPID key:", vapidError);
        toast.error("Push notifications are not configured yet");
        return false;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      // Save subscription to database
      const { error: saveError } = await supabase.functions.invoke("save-push-subscription", {
        body: {
          subscription: subscription.toJSON(),
        },
      });

      if (saveError) {
        console.error("Error saving subscription:", saveError);
        toast.error("Failed to save notification settings");
        return false;
      }

      setIsSubscribed(true);
      toast.success("Push notifications enabled!");
      return true;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      toast.error("Failed to enable notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported, requestPermission]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        await supabase.functions.invoke("remove-push-subscription", {
          body: {
            endpoint: subscription.endpoint,
          },
        });
      }

      setIsSubscribed(false);
      toast.success("Push notifications disabled");
      return true;
    } catch (error) {
      console.error("Error unsubscribing:", error);
      toast.error("Failed to disable notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}
