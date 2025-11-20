import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createMCPClient } from "@/lib/mcp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MCPAgentDashboardProps {
  apiKey: string;
}

interface TestResultItem {
  id: string;
  title: string;
  price: number;
  condition: string;
}

interface TestResult {
  total: number;
  results: TestResultItem[];
  execution_time_ms: number;
}

export const MCPAgentDashboard: React.FC<MCPAgentDashboardProps> = ({ apiKey }) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  const mcpClient = React.useMemo(() => createMCPClient(apiKey), [apiKey]);

  // Get server info
  const { data: serverInfo, isLoading: infoLoading } = useQuery({
    queryKey: ["mcp-server-info", apiKey],
    queryFn: async () => {
      return mcpClient.getServerInfo();
    },
    enabled: !!apiKey,
  });

  // List tools
  const { data: toolsData, isLoading: toolsLoading } = useQuery({
    queryKey: ["mcp-tools", apiKey],
    queryFn: async () => {
      return mcpClient.listTools();
    },
    enabled: !!apiKey,
  });

  const handleTestSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Enter a search query",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    try {
      const result = await mcpClient.searchListings({
        query: searchQuery,
        limit: 5,
      });
      setTestResult(result);
      toast({
        title: "Search successful",
        description: `Found ${result.total} results`,
      });
    } catch (error) {
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      setTestResult(null);
    } finally {
      setTesting(false);
    }
  };

  if (infoLoading || toolsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Server Info */}
      <Card>
        <CardHeader>
          <CardTitle>MCP Server Information</CardTitle>
          <CardDescription>Connection status and capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Server:</span>
              <Badge>{serverInfo?.name || 'Unknown'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Version:</span>
              <span className="text-sm font-medium">{serverInfo?.version || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available Tools:</span>
              <Badge variant="secondary">{toolsData?.tools.length || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">AI Visibility Control:</span>
              <Badge variant={serverInfo?.capabilities?.ai_visibility_control ? "default" : "secondary"}>
                {serverInfo?.capabilities?.ai_visibility_control ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Available Tools</CardTitle>
          <CardDescription>MCP tools you can use with this API key</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {toolsData?.tools.map((tool) => (
              <div key={tool.name} className="p-3 border rounded-lg">
                <div className="font-medium text-sm mb-1">{tool.name}</div>
                <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Tool */}
      <Card>
        <CardHeader>
          <CardTitle>Test Tool</CardTitle>
          <CardDescription>Test the search_listings tool</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-search">Search Query</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="test-search"
                  placeholder="e.g., Charizard, Pikachu VMAX"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTestSearch()}
                />
                <Button onClick={handleTestSearch} disabled={testing}>
                  {testing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {testResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Results</span>
                  <Badge>{testResult.total} found</Badge>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {testResult.results.map((result: TestResultItem) => (
                    <div key={result.id} className="p-2 bg-background rounded text-sm">
                      <div className="font-medium">{result.title}</div>
                      <div className="text-muted-foreground">£{result.price.toFixed(2)} • {result.condition}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Execution time: {testResult.execution_time_ms}ms
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
