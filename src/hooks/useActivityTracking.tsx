import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

export const useActivityTracking = (activityType: string, metadata?: Record<string, any>) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const trackActivity = async () => {
      try {
        await supabase.functions.invoke("track-user-activity", {
          body: {
            activity_type: activityType,
            metadata: metadata || {}
          }
        });
      } catch (error) {
        console.error("Error tracking activity:", error);
      }
    };

    trackActivity();
  }, [user, activityType, JSON.stringify(metadata)]);
};
