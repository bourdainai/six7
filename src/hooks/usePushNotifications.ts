import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";

// OneSignal types
declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize OneSignal
  useEffect(() => {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    
    if (!appId) {
      console.warn("OneSignal App ID not configured");
      return;
    }

    // Check if push is supported
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);

    if (!supported) return;

    // Load OneSignal SDK
    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    document.head.appendChild(script);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: { scope: "/" },
        });

        setIsInitialized(true);
        setPermission(Notification.permission);

        // Check subscription status
        const subscribed = await OneSignal.User.PushSubscription.optedIn;
        setIsSubscribed(subscribed);

        // Listen for subscription changes
        OneSignal.User.PushSubscription.addEventListener("change", (event: any) => {
          setIsSubscribed(event.current.optedIn);
        });

        console.log("✅ OneSignal initialized successfully");
      } catch (error) {
        console.error("Failed to initialize OneSignal:", error);
      }
    });

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src*="OneSignalSDK"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  // Set external user ID when user logs in
  useEffect(() => {
    if (!isInitialized || !user?.id) return;

    window.OneSignalDeferred?.push(async (OneSignal: any) => {
      try {
        await OneSignal.login(user.id);
        console.log("✅ OneSignal user linked:", user.id);
      } catch (error) {
        console.error("Failed to link OneSignal user:", error);
      }
    });
  }, [isInitialized, user?.id]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error("Push notifications are not supported on this device");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
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

    if (!isInitialized) {
      toast.error("Push notification service is loading...");
      return false;
    }

    setIsLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        window.OneSignalDeferred?.push(async (OneSignal: any) => {
          try {
            await OneSignal.Notifications.requestPermission();
            await OneSignal.User.PushSubscription.optIn();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

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
  }, [user, isSupported, isInitialized]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    setIsLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        window.OneSignalDeferred?.push(async (OneSignal: any) => {
          try {
            await OneSignal.User.PushSubscription.optOut();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

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
