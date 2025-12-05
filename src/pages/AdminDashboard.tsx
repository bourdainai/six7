import { AdminOrderView } from "@/components/admin/AdminOrderView";
import { DisputeManager } from "@/components/admin/DisputeManager";
import { RefundProcessor } from "@/components/admin/RefundProcessor";
import { FakeCardReviewQueue } from "@/components/admin/FakeCardReviewQueue";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, BarChart3, Shield, AlertTriangle, Home, Layers } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage platform operations and data
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/admin/cards" className="group">
              <Card className="cursor-pointer hover:border-primary transition-all h-full hover:shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Card Catalog</CardTitle>
                      <CardDescription className="text-sm">Browse all cards</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/admin/restore-cards" className="group">
              <Card className="cursor-pointer hover:border-primary transition-all h-full hover:shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Database className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Card Restoration</CardTitle>
                      <CardDescription className="text-sm">Import TCGdex cards</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/admin/analytics" className="group">
              <Card className="cursor-pointer hover:border-primary transition-all h-full hover:shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Analytics</CardTitle>
                      <CardDescription className="text-sm">Platform metrics</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/admin/moderation" className="group">
              <Card className="cursor-pointer hover:border-primary transition-all h-full hover:shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Moderation</CardTitle>
                      <CardDescription className="text-sm">Content review</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/admin/fraud" className="group">
              <Card className="cursor-pointer hover:border-primary transition-all h-full hover:shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Fraud Detection</CardTitle>
                      <CardDescription className="text-sm">Security monitoring</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Order Management</h2>
            </div>
            <AdminOrderView />
            <RefundProcessor />
          </div>
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Safety & Moderation</h2>
            </div>
            <DisputeManager />
            <FakeCardReviewQueue />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
