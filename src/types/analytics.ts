export interface AdminOverview {
  totalRevenue: number;
  platformFees: number;
  totalOrders: number;
  completedOrders: number;
  avgOrderValue: number;
  totalUsers: number;
  newUsers: number;
  activeListings: number;
  totalListings: number;
  openDisputes: number;
  resolvedDisputes: number;
  pendingReports: number;
  avgRating: number;
}

export interface RevenueChartPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface UserGrowthPoint {
  date: string;
  users: number;
}

export interface CategoryBreakdownEntry {
  category: string;
  listings: number;
  sales: number;
  revenue: number;
}

export interface OrderStatusEntry {
  status: string;
  count: number;
}

export interface TopSeller {
  id: string;
  name: string;
  revenue: number;
  orders: number;
}

export interface AdminAnalyticsResponse {
  overview: AdminOverview;
  revenueChart: RevenueChartPoint[];
  userGrowthChart: UserGrowthPoint[];
  topSellers: TopSeller[];
  categoryBreakdown: CategoryBreakdownEntry[];
  orderStatusBreakdown: OrderStatusEntry[];
}
