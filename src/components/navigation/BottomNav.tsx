import { Link, useLocation } from "react-router-dom";
import { PlusCircle, Search, MessageCircle, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BottomNavProps {
  onMenuClick: () => void;
  unreadMessagesCount?: number;
}

export const BottomNav = ({ onMenuClick, unreadMessagesCount = 0 }: BottomNavProps) => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/browse') {
      return location.pathname === '/browse' || location.pathname.startsWith('/browse');
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const navItems = [
    {
      to: "/sell",
      icon: PlusCircle,
      label: "Sell",
      isLink: true,
    },
    {
      to: "/browse",
      icon: Search,
      label: "Search",
      isLink: true,
    },
    {
      to: "/messages",
      icon: MessageCircle,
      label: "Inbox",
      isLink: true,
      badge: unreadMessagesCount,
    },
    {
      icon: Menu,
      label: "Menu",
      isLink: false,
      onClick: onMenuClick,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Background with blur effect */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl border-t border-divider-gray" />
      
      {/* Safe area padding for iOS */}
      <div className="relative flex items-center justify-around px-2 h-16 pb-safe">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = item.isLink && isActive(item.to!);
          
          const content = (
            <motion.div
              whileTap={{ scale: 0.9 }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-4 rounded-xl transition-all duration-200",
                "min-w-[64px]",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon 
                  className={cn(
                    "h-6 w-6 transition-all duration-200",
                    active && "stroke-[2.5px]"
                  )} 
                />
                {item.badge && item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] font-bold rounded-full shadow-lg"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium tracking-tight transition-all duration-200",
                active && "font-semibold"
              )}>
                {item.label}
              </span>
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute bottom-1 w-1 h-1 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.div>
          );

          if (item.isLink) {
            return (
              <Link
                key={item.to}
                to={item.to!}
                className="relative flex items-center justify-center"
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={`menu-${index}`}
              onClick={item.onClick}
              className="relative flex items-center justify-center"
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

