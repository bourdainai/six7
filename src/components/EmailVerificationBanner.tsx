import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Mail, X, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const EmailVerificationBanner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("email_verified")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: authUser } = useQuery({
    queryKey: ["auth-user", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      return authUser;
    },
  });

  const sendVerificationMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("send-verification-email", {
        body: {},
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Verification email sent",
        description: "Please check your inbox and click the verification link.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send verification email",
        variant: "destructive",
      });
    },
  });

  // Check if email is verified
  const isVerified = authUser?.email_confirmed_at !== null && authUser?.email_confirmed_at !== undefined;

  // Don't show if verified or dismissed
  if (!user || isVerified || dismissed) {
    return null;
  }

  return (
    <Alert className="border-yellow-500 bg-yellow-500/5 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
          <div className="flex-1">
            <AlertDescription className="text-foreground">
              <strong className="font-semibold">Verify your email address</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Please verify your email to unlock all features. Check your inbox for the verification link.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendVerificationMutation.mutate()}
                  disabled={sendVerificationMutation.isPending}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {sendVerificationMutation.isPending ? "Sending..." : "Resend Email"}
                </Button>
              </div>
            </AlertDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
};
