import { AdminOrderView } from "@/components/admin/AdminOrderView";
import { DisputeManager } from "@/components/admin/DisputeManager";
import { RefundProcessor } from "@/components/admin/RefundProcessor";
import { FakeCardReviewQueue } from "@/components/admin/FakeCardReviewQueue";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, BarChart3, Shield, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <PageLayout>
      <div className="container py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage platform operations and data</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link to="/admin/restore-cards">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader className="pb-2">
                <Database className="h-8 w-8 mb-2 text-primary" />
                <CardTitle className="text-base">Card Restoration</CardTitle>
                <CardDescription className="text-xs">Import Japanese TCGdex cards</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/admin/analytics">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader className="pb-2">
                <BarChart3 className="h-8 w-8 mb-2 text-primary" />
                <CardTitle className="text-base">Analytics</CardTitle>
                <CardDescription className="text-xs">Platform metrics</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/admin/moderation">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader className="pb-2">
                <Shield className="h-8 w-8 mb-2 text-primary" />
                <CardTitle className="text-base">Moderation</CardTitle>
                <CardDescription className="text-xs">Content review</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/admin/fraud">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader className="pb-2">
                <AlertTriangle className="h-8 w-8 mb-2 text-primary" />
                <CardTitle className="text-base">Fraud Detection</CardTitle>
                <CardDescription className="text-xs">Security monitoring</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Existing Sections */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Order Management</h2>
            <AdminOrderView />
            <RefundProcessor />
          </div>
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Safety & Moderation</h2>
            <DisputeManager />
            <FakeCardReviewQueue />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
