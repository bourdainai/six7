import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  email_order_confirmation: boolean;
  email_payment_received: boolean;
  email_shipping_update: boolean;
  email_new_message: boolean;
  email_price_drop: boolean;
  email_offer_update: boolean;
  email_review_request: boolean;
  email_order_delivered: boolean;
  email_payout_completed: boolean;
  email_listing_published: boolean;
  email_dispute_created: boolean;
}

const NotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const preferences: NotificationPreferences = profile?.notification_preferences || {
    email_enabled: true,
    push_enabled: true,
    email_order_confirmation: true,
    email_payment_received: true,
    email_shipping_update: true,
    email_new_message: true,
    email_price_drop: true,
    email_offer_update: true,
    email_review_request: true,
    email_order_delivered: true,
    email_payout_completed: true,
    email_listing_published: true,
    email_dispute_created: true,
  };

  const updatePreferences = useMutation({
    mutationFn: async (newPreferences: NotificationPreferences) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          notification_preferences: newPreferences,
        })
        .eq("id", user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save preferences",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (key: keyof NotificationPreferences) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };
    updatePreferences.mutate(newPreferences);
  };

  if (!user) {
    return (
      <PageLayout>
        <div className="text-center">
          <h1 className="text-2xl font-light mb-4 tracking-tight">Please sign in</h1>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-light tracking-tight mb-2">Notification Preferences</h1>
          <p className="text-muted-foreground">
            Manage how you receive notifications and updates from 6Seven
          </p>
        </div>

        {/* Email Notifications */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Receive important updates and notifications via email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Master Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="email-enabled" className="text-base font-semibold">
                  Enable Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Turn off all email notifications
                </p>
              </div>
              <Switch
                id="email-enabled"
                checked={preferences.email_enabled}
                onCheckedChange={() => handleToggle("email_enabled")}
              />
            </div>

            <Separator />

            {/* Individual Email Types */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Email Types</h3>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="order-confirmation" className="text-sm font-medium">
                    Order Confirmations
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Receive confirmation when you place an order
                  </p>
                </div>
                <Switch
                  id="order-confirmation"
                  checked={preferences.email_order_confirmation && preferences.email_enabled}
                  onCheckedChange={() => handleToggle("email_order_confirmation")}
                  disabled={!preferences.email_enabled}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="payment-received" className="text-sm font-medium">
                    Payment Received
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Notify when you receive payments from sales
                  </p>
                </div>
                <Switch
                  id="payment-received"
                  checked={preferences.email_payment_received && preferences.email_enabled}
                  onCheckedChange={() => handleToggle("email_payment_received")}
                  disabled={!preferences.email_enabled}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="shipping-update" className="text-sm font-medium">
                    Shipping Updates
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Get notified when your orders are shipped
                  </p>
                </div>
                <Switch
                  id="shipping-update"
                  checked={preferences.email_shipping_update && preferences.email_enabled}
                  onCheckedChange={() => handleToggle("email_shipping_update")}
                  disabled={!preferences.email_enabled}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="new-message" className="text-sm font-medium">
                    New Messages
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Email when you receive new messages
                  </p>
                </div>
                <Switch
                  id="new-message"
                  checked={preferences.email_new_message && preferences.email_enabled}
                  onCheckedChange={() => handleToggle("email_new_message")}
                  disabled={!preferences.email_enabled}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="price-drop" className="text-sm font-medium">
                    Price Drop Alerts
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Notify when prices drop on saved items
                  </p>
                </div>
                <Switch
                  id="price-drop"
                  checked={preferences.email_price_drop && preferences.email_enabled}
                  onCheckedChange={() => handleToggle("email_price_drop")}
                  disabled={!preferences.email_enabled}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="offer-update" className="text-sm font-medium">
                    Offer Updates
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Notify when offers are accepted, rejected, or countered
                  </p>
                </div>
                <Switch
                  id="offer-update"
                  checked={preferences.email_offer_update && preferences.email_enabled}
                  onCheckedChange={() => handleToggle("email_offer_update")}
                  disabled={!preferences.email_enabled}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="review-request" className="text-sm font-medium">
                    Review Requests
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Remind you to leave reviews after purchases
                  </p>
                </div>
                <Switch
                  id="review-request"
                  checked={preferences.email_review_request && preferences.email_enabled}
                  onCheckedChange={() => handleToggle("email_review_request")}
                  disabled={!preferences.email_enabled}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="order-delivered" className="text-sm font-medium">
                    Order Delivered
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Notify when your orders are delivered
                  </p>
                </div>
                <Switch
                  id="order-delivered"
                  checked={preferences.email_order_delivered && preferences.email_enabled}
                  onCheckedChange={() => handleToggle("email_order_delivered")}
                  disabled={!preferences.email_enabled}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="payout-completed" className="text-sm font-medium">
                    Payout Completed
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Notify when payouts are processed
                  </p>
                </div>
                <Switch
                  id="payout-completed"
                  checked={preferences.email_payout_completed && preferences.email_enabled}
                  onCheckedChange={() => handleToggle("email_payout_completed")}
                  disabled={!preferences.email_enabled}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="listing-published" className="text-sm font-medium">
                    Listing Published
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Confirm when your listings go live
                  </p>
                </div>
                <Switch
                  id="listing-published"
                  checked={preferences.email_listing_published && preferences.email_enabled}
                  onCheckedChange={() => handleToggle("email_listing_published")}
                  disabled={!preferences.email_enabled}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="dispute-created" className="text-sm font-medium">
                    Dispute Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Notify when disputes are created or updated
                  </p>
                </div>
                <Switch
                  id="dispute-created"
                  checked={preferences.email_dispute_created && preferences.email_enabled}
                  onCheckedChange={() => handleToggle("email_dispute_created")}
                  disabled={!preferences.email_enabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications (Future) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Browser push notifications (coming soon)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
              <div className="flex-1">
                <Label className="text-base font-semibold">
                  Enable Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Receive real-time notifications in your browser
                </p>
              </div>
              <Switch disabled checked={false} />
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Push notifications will be available in a future update.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default NotificationPreferences;
