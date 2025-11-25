import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Instagram, Twitter, Youtube, User, Facebook, Linkedin } from "lucide-react";
import { SEO } from "@/components/SEO";
import { AvatarUpload } from "@/components/profile/AvatarUpload";

export default function SellerProfileSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    business_name: "",
    bio: "",
    avatar_url: "",
    instagram_url: "",
    twitter_url: "",
    facebook_url: "",
    linkedin_url: "",
    youtube_url: "",
    tiktok_url: "",
  });

  const { isLoading } = useQuery({
    queryKey: ["seller-profile-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("business_name, bio, avatar_url, instagram_url, twitter_url, facebook_url, linkedin_url, youtube_url, tiktok_url")
        .eq("id", user!.id)
        .single();

      if (error) throw error;
      
      setFormData({
        business_name: data.business_name || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
        instagram_url: data.instagram_url || "",
        twitter_url: data.twitter_url || "",
        facebook_url: data.facebook_url || "",
        linkedin_url: data.linkedin_url || "",
        youtube_url: data.youtube_url || "",
        tiktok_url: data.tiktok_url || "",
      });
      
      return data;
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-profile-settings"] });
      queryClient.invalidateQueries({ queryKey: ["seller-profile", user?.id] });
      toast.success("Profile updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  if (!user) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Please sign in to access this page</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Go Home
          </Button>
        </div>
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SEO
        title="Seller Profile Settings - 6Seven"
        description="Manage your seller profile on 6Seven"
      />

      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Seller Profile Settings</h1>
          <p className="text-muted-foreground">
            Customize how your profile appears to buyers
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>
                Upload a professional photo to build trust with buyers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AvatarUpload
                currentAvatarUrl={formData.avatar_url}
                userName={user.email}
                onUploadComplete={(url) => setFormData({ ...formData, avatar_url: url })}
              />
            </CardContent>
          </Card>

          {/* Basic Info Section */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                This information will be visible to all buyers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name (Optional)</Label>
                <Input
                  id="business_name"
                  placeholder="Your business or brand name"
                  value={formData.business_name}
                  onChange={(e) =>
                    setFormData({ ...formData, business_name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell buyers about yourself and what you sell..."
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.bio.length}/500 characters
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>
                Connect your social media to build trust with buyers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagram_url" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </Label>
                <Input
                  id="instagram_url"
                  type="url"
                  placeholder="https://instagram.com/yourprofile"
                  value={formData.instagram_url}
                  onChange={(e) =>
                    setFormData({ ...formData, instagram_url: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter_url" className="flex items-center gap-2">
                  <Twitter className="h-4 w-4" />
                  Twitter/X
                </Label>
                <Input
                  id="twitter_url"
                  type="url"
                  placeholder="https://twitter.com/yourprofile"
                  value={formData.twitter_url}
                  onChange={(e) =>
                    setFormData({ ...formData, twitter_url: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebook_url" className="flex items-center gap-2">
                  <Facebook className="h-4 w-4" />
                  Facebook
                </Label>
                <Input
                  id="facebook_url"
                  type="url"
                  placeholder="https://facebook.com/yourprofile"
                  value={formData.facebook_url}
                  onChange={(e) =>
                    setFormData({ ...formData, facebook_url: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin_url" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </Label>
                <Input
                  id="linkedin_url"
                  type="url"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={formData.linkedin_url}
                  onChange={(e) =>
                    setFormData({ ...formData, linkedin_url: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtube_url" className="flex items-center gap-2">
                  <Youtube className="h-4 w-4" />
                  YouTube
                </Label>
                <Input
                  id="youtube_url"
                  type="url"
                  placeholder="https://youtube.com/@yourchannel"
                  value={formData.youtube_url}
                  onChange={(e) =>
                    setFormData({ ...formData, youtube_url: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tiktok_url" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  TikTok
                </Label>
                <Input
                  id="tiktok_url"
                  type="url"
                  placeholder="https://tiktok.com/@yourprofile"
                  value={formData.tiktok_url}
                  onChange={(e) =>
                    setFormData({ ...formData, tiktok_url: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={updateProfile.isPending}
              className="flex-1"
            >
              {updateProfile.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/seller/${user.id}`)}
            >
              View Profile
            </Button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}