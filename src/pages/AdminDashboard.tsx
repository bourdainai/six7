import { AdminOrderView } from "@/components/admin/AdminOrderView";
import { DisputeManager } from "@/components/admin/DisputeManager";
import { RefundProcessor } from "@/components/admin/RefundProcessor";
import { FakeCardReviewQueue } from "@/components/admin/FakeCardReviewQueue";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, BarChart3, Shield, AlertTriangle, Home } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-light text-foreground">Admin Dashboard</h1>
          </div>
          <p className="text-base text-muted-foreground font-light">
            Manage platform operations and data
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Link to="/admin/restore-cards">
            <Card className="cursor-pointer hover:border-primary transition-colors h-full">
              <CardHeader className="space-y-0 pb-3">
                <Database className="h-6 w-6 mb-3 text-primary" />
                <CardTitle className="text-sm font-medium">Card Restoration</CardTitle>
                <CardDescription className="text-xs font-light">Import Japanese TCGdex cards</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/admin/analytics">
            <Card className="cursor-pointer hover:border-primary transition-colors h-full">
              <CardHeader className="space-y-0 pb-3">
                <BarChart3 className="h-6 w-6 mb-3 text-primary" />
                <CardTitle className="text-sm font-medium">Analytics</CardTitle>
                <CardDescription className="text-xs font-light">Platform metrics</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/admin/moderation">
            <Card className="cursor-pointer hover:border-primary transition-colors h-full">
              <CardHeader className="space-y-0 pb-3">
                <Shield className="h-6 w-6 mb-3 text-primary" />
                <CardTitle className="text-sm font-medium">Moderation</CardTitle>
                <CardDescription className="text-xs font-light">Content review</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/admin/fraud">
            <Card className="cursor-pointer hover:border-primary transition-colors h-full">
              <CardHeader className="space-y-0 pb-3">
                <AlertTriangle className="h-6 w-6 mb-3 text-primary" />
                <CardTitle className="text-sm font-medium">Fraud Detection</CardTitle>
                <CardDescription className="text-xs font-light">Security monitoring</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Existing Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h2 className="text-xl font-light text-foreground">Order Management</h2>
            <AdminOrderView />
            <RefundProcessor />
          </div>
          <div className="space-y-6">
            <h2 className="text-xl font-light text-foreground">Safety & Moderation</h2>
            <DisputeManager />
            <FakeCardReviewQueue />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
