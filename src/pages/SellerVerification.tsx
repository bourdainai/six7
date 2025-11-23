import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Mail,
  Shield,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SellerBadges } from "@/components/seller/SellerBadges";
import { TrustScore } from "@/components/seller/TrustScore";

interface Verification {
  id: string;
  verification_type: string;
  status: string;
  verified_at: string | null;
  expires_at: string | null;
  verification_data: Record<string, unknown>;
  notes: string | null;
}

const SellerVerification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, verification_level, email_verified")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: verifications, isLoading } = useQuery<Verification[]>({
    queryKey: ["seller-verifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_verifications")
        .select("*")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Verification[];
    },
  });


  const requestVerificationMutation = useMutation({
    mutationFn: async (type: string) => {
      // Check if already verified or pending
      const existing = verifications?.find(v => v.verification_type === type);
      if (existing?.status === "verified") {
        throw new Error("Already verified");
      }
      if (existing?.status === "pending") {
        throw new Error("Verification already pending");
      }

      const { data, error } = await supabase
        .from("seller_verifications")
        .insert({
          seller_id: user!.id,
          verification_type: type,
          status: "pending",
          verification_data: {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["seller-verifications", user?.id] });
      toast({
        title: "Verification requested",
        description: `Your ${data.verification_type} verification request has been submitted for review.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to request verification",
        variant: "destructive",
      });
    },
  });

  const verificationTypes = [
    {
      type: "email",
      label: "Email Verification",
      description: "Verify your email address to build trust with buyers",
      icon: Mail,
      verified: profile?.email_verified,
      trustBonus: "+5 points",
    },
  ];

  const getVerificationStatus = (type: string) => {
    const verified = verificationTypes.find(vt => vt.type === type)?.verified;
    if (verified) return "verified";
    const verification = verifications?.find(v => v.verification_type === type);
    if (verification) return verification.status;
    return "unverified";
  };

  const completedVerifications = verificationTypes.filter(vt => vt.verified).length;
  const totalVerifications = verificationTypes.length;
  const verificationProgress = (completedVerifications / totalVerifications) * 100;

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
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/seller")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-light tracking-tight mb-2">Seller Verification</h1>
          <p className="text-muted-foreground">
            Verify your email address to build trust with buyers
          </p>
        </div>

        {/* Trust Score */}
        <div className="mb-6">
          <TrustScore sellerId={user.id} />
        </div>

        {/* Badges */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Badges</CardTitle>
            <CardDescription>
              Badges earned based on your performance and verification status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SellerBadges sellerId={user.id} />
          </CardContent>
        </Card>

        {/* Verification Progress */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Verification Progress</CardTitle>
                <CardDescription>
                  {completedVerifications} of {totalVerifications} verifications completed
                </CardDescription>
              </div>
              <Badge variant="outline" className="capitalize">
                {profile?.verification_level || "unverified"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">{Math.round(verificationProgress)}%</span>
                </div>
                <Progress value={verificationProgress} className="h-2" />
              </div>

              <Separator />

              {/* Verification Types */}
              <div className="space-y-4">
                {verificationTypes.map((vt) => {
                  const Icon = vt.icon;
                  const status = getVerificationStatus(vt.type);
                  const verification = verifications?.find(v => v.verification_type === vt.type);

                  return (
                    <div
                      key={vt.type}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${status === "verified"
                            ? "bg-green-500/10"
                            : status === "pending"
                              ? "bg-yellow-500/10"
                              : "bg-muted"
                          }`}>
                          <Icon className={`h-5 w-5 ${status === "verified"
                              ? "text-green-500"
                              : status === "pending"
                                ? "text-yellow-500"
                                : "text-muted-foreground"
                            }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{vt.label}</h3>
                            {status === "verified" && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            {status === "pending" && (
                              <Badge variant="outline" className="text-xs">
                                Pending Review
                              </Badge>
                            )}
                            {status === "rejected" && (
                              <Badge variant="destructive" className="text-xs">
                                Rejected
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{vt.description}</p>
                          {vt.trustBonus && (
                            <p className="text-xs text-primary font-medium mt-1">
                              Trust Score Bonus: {vt.trustBonus}
                            </p>
                          )}
                          {verification?.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {verification.notes}
                            </p>
                          )}
                          {verification?.verified_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Verified {new Date(verification.verified_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        {status === "verified" ? (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            Verified
                          </Badge>
                        ) : status === "pending" ? (
                          <Button variant="outline" size="sm" disabled>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Pending
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => requestVerificationMutation.mutate(vt.type)}
                            disabled={requestVerificationMutation.isPending}
                          >
                            {requestVerificationMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Requesting...
                              </>
                            ) : (
                              "Request Verification"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Benefits of Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Increased Trust</h4>
                  <p className="text-sm text-muted-foreground">
                    Verified sellers receive higher trust scores and more buyer confidence
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Badge Display</h4>
                  <p className="text-sm text-muted-foreground">
                    Show verification badges on your listings and profile
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Priority Support</h4>
                  <p className="text-sm text-muted-foreground">
                    Verified sellers get priority customer support
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Higher Visibility</h4>
                  <p className="text-sm text-muted-foreground">
                    Verified listings appear higher in search results
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default SellerVerification;
