import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Activity, Target, Award, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function TradeAnalyticsDashboard() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch analytics data
  const { data: analytics } = useQuery({
    queryKey: ['trade-analytics', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_analytics')
        .select('*')
        .eq('user_id', user?.id)
        .order('period');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch portfolio snapshot
  const { data: portfolio } = useQuery({
    queryKey: ['portfolio-snapshot', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('user_id', user?.id)
        .order('snapshot_date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch recommendations
  const { data: recommendations } = useQuery({
    queryKey: ['trade-recommendations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_recommendations')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('confidence_score', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch market trends
  const { data: marketTrends } = useQuery({
    queryKey: ['market-trends'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('trade_market_trends')
        .select(`
          *,
          card:pokemon_card_attributes(name, set_name, images)
        `)
        .eq('date', today)
        .order('popularity_score', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Generate portfolio optimization
  const generateOptimization = async () => {
    await supabase.functions.invoke('portfolio-optimizer');
  };

  // Generate recommendations
  const generateRecommendations = async () => {
    await supabase.functions.invoke('trade-recommendations');
  };

  const latestAnalytics = analytics?.find(a => a.period === 'all_time');
  const latestPortfolio = portfolio?.[0];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestAnalytics?.total_trades || 0}</div>
            <p className="text-xs text-muted-foreground">
              {latestAnalytics?.successful_trades || 0} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${latestPortfolio?.total_value?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {latestPortfolio?.total_items || 0} cards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestPortfolio?.portfolio_health_score?.toFixed(0) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {latestPortfolio?.diversification_score?.toFixed(0) || 0}% diversified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Value Gained</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              +${latestAnalytics?.total_value_gained?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio Analysis</TabsTrigger>
          <TabsTrigger value="market">Market Trends</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
        </TabsList>

        {/* AI Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Personalized Trade Suggestions</h3>
              <p className="text-sm text-muted-foreground">AI-powered recommendations based on your portfolio</p>
            </div>
            <Button onClick={generateRecommendations}>
              Generate New Recommendations
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {recommendations?.map((rec) => (
              <Card key={rec.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">Trade Opportunity</CardTitle>
                    <Badge variant={rec.confidence_score > 80 ? "default" : "secondary"}>
                      {rec.confidence_score}% confidence
                    </Badge>
                  </div>
                  <CardDescription>
                    Potential gain: ${rec.potential_value_gain?.toFixed(2)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">{rec.reasoning}</p>
                  <div className="flex gap-2">
                    <Button size="sm">Create Offer</Button>
                    <Button size="sm" variant="outline">Dismiss</Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!recommendations || recommendations.length === 0) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No recommendations available. Click "Generate New Recommendations" to get started.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>

        {/* Portfolio Analysis Tab */}
        <TabsContent value="portfolio" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Portfolio Optimization</h3>
              <p className="text-sm text-muted-foreground">Insights to improve your collection</p>
            </div>
            <Button onClick={generateOptimization}>
              Analyze Portfolio
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Value Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={portfolio?.slice(0, 7).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="snapshot_date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="total_value" stroke="hsl(var(--primary))" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Cards by Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.isArray(latestPortfolio?.top_cards) && (latestPortfolio.top_cards as any[]).map((card: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="font-semibold text-muted-foreground">{idx + 1}</div>
                      <div className="flex-1 text-sm">{card.name}</div>
                      <div className="font-semibold">${card.value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Market Trends Tab */}
        <TabsContent value="market" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trending Cards</CardTitle>
              <CardDescription>Most popular cards in the marketplace today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {marketTrends?.map((trend) => (
                  <div key={trend.id} className="flex items-center gap-4 p-2 rounded-lg border">
                    {trend.card?.images && (
                      <img 
                        src={(trend.card.images as any)?.small} 
                        alt={trend.card.name}
                        className="w-12 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold">{trend.card?.name}</div>
                      <div className="text-sm text-muted-foreground">{trend.card?.set_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${trend.avg_trade_value}</div>
                      <Badge variant={trend.price_trend === 'rising' ? 'default' : 'secondary'}>
                        {trend.price_trend === 'rising' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {trend.price_trend}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trade History Tab */}
        <TabsContent value="history" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {analytics?.filter(a => a.period !== 'all_time').map((stat) => (
              <Card key={stat.id}>
                <CardHeader>
                  <CardTitle className="text-base capitalize">{stat.period}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Trades</span>
                    <span className="font-semibold">{stat.total_trades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Value</span>
                    <span className="font-semibold">${stat.avg_trade_value?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="font-semibold">
                      {((stat.successful_trades / stat.total_trades) * 100).toFixed(0)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}