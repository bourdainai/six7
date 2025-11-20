import React, { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Trash2, Plus, Eye, EyeOff, Check, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import type { Database } from "@/integrations/supabase/types";

type ApiKey = Database["public"]["Tables"]["api_keys"]["Row"] & {
  daily_usage?: number;
}

export default function APIKeysPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({});

  // Fetch API keys
  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("api-key-manage", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data.keys || [];
    },
  });

  // Generate new key
  const generateKey = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("api-key-generate", {
        body: {
          label: newKeyLabel || undefined,
          scopes: ["acp_read", "acp_purchase", "mcp_search", "mcp_listing"],
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setRevealedKeys((prev) => ({ ...prev, [data.id]: data.api_key }));
      setNewKeyLabel("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast({
        title: "API Key Generated",
        description: "Save this key now - it won't be shown again!",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete key
  const deleteKey = useMutation({
    mutationFn: async (keyId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke(`api-key-manage?id=${keyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast({
        title: "API Key Deleted",
        description: "The key has been revoked and can no longer be used.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "API key copied successfully.",
    });
  };

  if (isLoading) {
    return (
      <PageLayout>
        <SEO title="API Keys - 6Seven" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SEO title="API Keys - 6Seven" />
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">API Keys</h1>
          <p className="text-muted-foreground">
            Manage your API keys for ACP and MCP access. Use these keys to allow AI agents to interact with your listings.
          </p>
        </div>

        {/* Generate New Key */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Generate New API Key</CardTitle>
            <CardDescription>
              Create a new API key to enable AI agents to discover and purchase your listings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="key-label">Label (Optional)</Label>
                <Input
                  id="key-label"
                  placeholder="e.g., ChatGPT Agent, Production Key"
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={() => generateKey.mutate()}
                disabled={generating || generateKey.isPending}
              >
                {generating || generateKey.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate API Key
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Existing Keys */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Your API Keys</h2>

          {keys && keys.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No API keys yet. Generate one above to get started.
              </CardContent>
            </Card>
          )}

          {keys?.map((key: ApiKey) => {
            const revealedKey = revealedKeys[key.id];
            const isRevealed = !!revealedKey;

            return (
              <Card key={key.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{key.label || "Unnamed Key"}</h3>
                        <Badge variant={key.is_active ? "default" : "secondary"}>
                          {key.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {key.expires_at && new Date(key.expires_at) < new Date() && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Scopes: {key.scopes?.join(", ") || "None"}</p>
                        <p>Created: {new Date(key.created_at).toLocaleDateString()}</p>
                        {key.last_used_at && (
                          <p>Last used: {new Date(key.last_used_at).toLocaleString()}</p>
                        )}
                        {key.daily_usage !== undefined && (
                          <p>Daily usage: {key.daily_usage} requests</p>
                        )}
                      </div>

                      {isRevealed && (
                        <Alert className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="flex items-center gap-2 mt-2">
                              <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                                {revealedKey}
                              </code>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(revealedKey)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                            <p className="text-xs mt-2 text-amber-600 dark:text-amber-400">
                              ⚠️ Save this key now - it will not be shown again!
                            </p>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteKey.mutate(key.id)}
                        disabled={deleteKey.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}

