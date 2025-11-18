import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

interface SendEmailNotificationParams {
  type: 'order_confirmation' | 'payment_received' | 'shipping_update' | 'new_message' | 
        'price_drop' | 'offer_update' | 'review_request' | 'order_delivered' | 
        'payout_completed' | 'listing_published' | 'dispute_created' | 'account_verification';
  subject: string;
  template: string;
  data?: Record<string, any>;
  userId?: string;
}

export const useEmailNotification = () => {
  const { user } = useAuth();

  const sendEmail = useMutation({
    mutationFn: async ({ type, subject, template, data, userId }: SendEmailNotificationParams) => {
      const targetUserId = userId || user?.id;
      if (!targetUserId) {
        throw new Error("User ID is required");
      }

      const { error } = await supabase.functions.invoke("send-email-notification", {
        body: {
          userId: targetUserId,
          type,
          subject,
          template,
          data,
        },
      });

      if (error) throw error;
    },
  });

  return {
    sendEmail: sendEmail.mutate,
    sendEmailAsync: sendEmail.mutateAsync,
    isSending: sendEmail.isPending,
  };
};
