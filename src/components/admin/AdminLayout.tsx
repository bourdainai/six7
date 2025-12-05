import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Database, BarChart3, AlertTriangle, Home, AlertCircle, Layers } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { NavLink } from "@/components/NavLink";
import { Navigation } from "@/components/Navigation";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface AdminLayoutProps {
  children: ReactNode;
}

const adminMenuItems = [
  { title: "Dashboard", url: "/admin", icon: Home },
  { title: "Live Stats", url: "/admin/live", icon: BarChart3 },
  { title: "Card Catalog", url: "/admin/cards", icon: Layers },
  { title: "Disputes", url: "/admin/disputes", icon: AlertCircle },
  { title: "Card Restoration", url: "/admin/restore-cards", icon: Database },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Moderation", url: "/admin/moderation", icon: Shield },
  { title: "Fraud Detection", url: "/admin/fraud", icon: AlertTriangle },
];

function AdminSidebar() {
  const { state } = useSidebar();

  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={state === "collapsed" ? "opacity-0" : ""}>
            Admin Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { data: isAdmin, isLoading } = useAdminCheck();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription className="text-base">
              You don't have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} size="lg" className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex flex-col w-full">
        <Navigation />
        
        <div className="flex flex-1 w-full pt-[72px]">
          <AdminSidebar />
          
          <main className="flex-1 overflow-auto bg-muted/30">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
              <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-4">
                <SidebarTrigger />
              </div>
            </div>
            
            <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8">
              <EmailVerificationBanner />
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
