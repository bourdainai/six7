import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const EmailVerificationStatus = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: authUser, refetch: refetchAuth } = useQuery({
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

  const isVerified = authUser?.email_confirmed_at !== null && authUser?.email_confirmed_at !== undefined;
  const email = authUser?.email || user?.email;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Verification
            </CardTitle>
            <CardDescription>
              {isVerified 
                ? "Your email address has been verified"
                : "Verify your email to unlock all features"}
            </CardDescription>
          </div>
          {isVerified ? (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          ) : (
            <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
              <AlertCircle className="h-3 w-3 mr-1" />
              Unverified
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isVerified ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Email verified: {email}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your email address is verified. You have full access to all features.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span>Email: {email}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Please verify your email address to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
              <li>Create and publish listings</li>
              <li>Make purchases</li>
              <li>Receive important notifications</li>
              <li>Access all marketplace features</li>
            </ul>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => sendVerificationMutation.mutate()}
                disabled={sendVerificationMutation.isPending}
              >
                {sendVerificationMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Verification Email
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => refetchAuth()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Status
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Didn't receive the email? Check your spam folder or click "Send Verification Email" again.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
