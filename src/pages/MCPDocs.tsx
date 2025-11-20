import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Code, BookOpen, Key, Zap } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/components/auth/AuthProvider";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function MCPDocs() {
  const { user } = useAuth();

  return (
    <PageLayout>
      <SEO title="MCP & ACP Documentation - 6Seven" />
      <div className="max-w-5xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">MCP & ACP Documentation</h1>
          <p className="text-lg text-muted-foreground">
            Complete guide for AI agents to interact with 6Seven marketplace
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="acp">ACP Protocol</TabsTrigger>
            <TabsTrigger value="mcp">MCP Protocol</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>What are ACP and MCP?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    ACP (Agentic Commerce Protocol)
                  </h3>
                  <p className="text-muted-foreground">
                    A standardized API for AI agents to browse and purchase items. Perfect for autonomous shopping agents.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    MCP (Model Context Protocol)
                  </h3>
                  <p className="text-muted-foreground">
                    A JSON-RPC 2.0 protocol exposing 13+ tools for comprehensive marketplace interaction including search, listing creation, price evaluation, and more.
                  </p>
                </div>
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    AI Visibility Control
                  </h3>
                  <p className="text-muted-foreground">
                    Users control whether their listings are visible to AI agents via the "Sell via AI Answer Engines" toggle. 
                    Only listings with this enabled will appear in ACP/MCP searches and can be purchased by AI agents.
                  </p>
                </div>
              </CardContent>
            </Card>

            {!user && (
              <Card>
                <CardContent className="py-6 text-center">
                  <p className="text-muted-foreground mb-4">
                    Sign in to generate API keys and start using ACP/MCP
                  </p>
                  <Button asChild>
                    <Link to="/settings/api-keys">Get Started</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {user && (
              <Card>
                <CardContent className="py-6 text-center">
                  <p className="text-muted-foreground mb-4">
                    Generate your API key to start using ACP/MCP
                  </p>
                  <Button asChild>
                    <Link to="/settings/api-keys">Manage API Keys</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="acp" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ACP Endpoints</CardTitle>
                <CardDescription>RESTful API for commerce operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">GET /acp/products</h3>
                  <p className="text-sm text-muted-foreground mb-2">List available products (AI-enabled only)</p>
                  <code className="text-xs bg-muted p-2 rounded block">
                    GET /functions/v1/acp/products?limit=20&condition=Near+Mint
                  </code>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">GET /acp/product/:id</h3>
                  <p className="text-sm text-muted-foreground mb-2">Get product details</p>
                  <code className="text-xs bg-muted p-2 rounded block">
                    GET /functions/v1/acp/product/{`{listing_id}`}
                  </code>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">POST /acp/checkout</h3>
                  <p className="text-sm text-muted-foreground mb-2">Create checkout session</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">POST /acp/payment</h3>
                  <p className="text-sm text-muted-foreground mb-2">Process payment</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">POST /acp/confirm</h3>
                  <p className="text-sm text-muted-foreground mb-2">Confirm order</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mcp" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>MCP Tools</CardTitle>
                <CardDescription>13 tools available via JSON-RPC 2.0</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 border rounded">
                    <Badge variant="outline" className="mb-2">Discovery</Badge>
                    <div className="font-medium text-sm">search_listings</div>
                    <div className="font-medium text-sm">get_listing</div>
                  </div>
                  <div className="p-3 border rounded">
                    <Badge variant="outline" className="mb-2">Selling</Badge>
                    <div className="font-medium text-sm">create_listing</div>
                    <div className="font-medium text-sm">update_listing</div>
                    <div className="font-medium text-sm">auto_list_from_photos</div>
                  </div>
                  <div className="p-3 border rounded">
                    <Badge variant="outline" className="mb-2">Pricing</Badge>
                    <div className="font-medium text-sm">evaluate_price</div>
                  </div>
                  <div className="p-3 border rounded">
                    <Badge variant="outline" className="mb-2">Trading</Badge>
                    <div className="font-medium text-sm">submit_trade_offer</div>
                  </div>
                  <div className="p-3 border rounded">
                    <Badge variant="outline" className="mb-2">Buying</Badge>
                    <div className="font-medium text-sm">purchase_item</div>
                  </div>
                  <div className="p-3 border rounded">
                    <Badge variant="outline" className="mb-2">Wallet</Badge>
                    <div className="font-medium text-sm">get_wallet_balance</div>
                    <div className="font-medium text-sm">deposit</div>
                    <div className="font-medium text-sm">withdraw</div>
                  </div>
                  <div className="p-3 border rounded">
                    <Badge variant="outline" className="mb-2">Fraud</Badge>
                    <div className="font-medium text-sm">ai_detect_fake</div>
                  </div>
                  <div className="p-3 border rounded">
                    <Badge variant="outline" className="mb-2">Inventory</Badge>
                    <div className="font-medium text-sm">list_inventory</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examples" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Example: Search Listings (MCP)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
{`{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "search_listings",
  "params": {
    "query": "Charizard",
    "filters": {
      "condition": "Near Mint",
      "min_price": 20,
      "max_price": 100
    },
    "limit": 10
  }
}`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Example: List Products (ACP)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
{`GET /functions/v1/acp/products?limit=20&rarity=Ultra+Rare
Authorization: Bearer YOUR_API_KEY`}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
