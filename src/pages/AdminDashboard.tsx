import { AdminOrderView } from "@/components/admin/AdminOrderView";
import { DisputeManager } from "@/components/admin/DisputeManager";
import { RefundProcessor } from "@/components/admin/RefundProcessor";
import { FakeCardReviewQueue } from "@/components/admin/FakeCardReviewQueue";
import { PageLayout } from "@/components/PageLayout";

export default function AdminDashboard() {
  return (
    <PageLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
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
