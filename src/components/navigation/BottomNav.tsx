import { Link, useLocation } from "react-router-dom";
import { Plus, Search, MessageSquare, Menu } from "lucide-react";
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

  const hasUnread = unreadMessagesCount > 0;

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 lg:hidden bottom-nav"
      style={{
        zIndex: 9999,
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
      }}
    >
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" />
      
      {/* Subtle top border glow */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {/* Safe area padding for iOS */}
      <div className="relative flex items-center justify-around px-4 h-[72px] pb-safe">
        
        {/* Sell Button */}
        <Link to="/sell" className="relative group">
          <motion.div
            whileTap={{ scale: 0.92 }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2 px-5 rounded-2xl transition-all duration-300",
              isActive('/sell')
                ? "text-white" 
                : "text-white/50 hover:text-white/80"
            )}
          >
            <div className={cn(
              "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
              isActive('/sell') 
                ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                : "bg-white/10 group-hover:bg-white/15"
            )}>
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className={cn(
              "text-[11px] font-medium tracking-wide transition-all duration-300",
              isActive('/sell') ? "text-white" : "text-white/50"
            )}>
              Sell
            </span>
          </motion.div>
        </Link>

        {/* Search Button */}
        <Link to="/browse" className="relative group">
          <motion.div
            whileTap={{ scale: 0.92 }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2 px-5 rounded-2xl transition-all duration-300",
              isActive('/browse')
                ? "text-white" 
                : "text-white/50 hover:text-white/80"
            )}
          >
            <div className={cn(
              "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
              isActive('/browse') 
                ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                : "bg-white/10 group-hover:bg-white/15"
            )}>
              <Search className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className={cn(
              "text-[11px] font-medium tracking-wide transition-all duration-300",
              isActive('/browse') ? "text-white" : "text-white/50"
            )}>
              Search
            </span>
          </motion.div>
        </Link>

        {/* Inbox Button */}
        <Link to="/messages" className="relative group">
          <motion.div
            whileTap={{ scale: 0.92 }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2 px-5 rounded-2xl transition-all duration-300",
              isActive('/messages')
                ? "text-white" 
                : "text-white/50 hover:text-white/80"
            )}
          >
            <div className={cn(
              "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
              isActive('/messages') 
                ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                : "bg-white/10 group-hover:bg-white/15"
            )}>
              <MessageSquare className="h-5 w-5" strokeWidth={2.5} />
              {/* Unread indicator - subtle pulsing dot */}
              {hasUnread && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  </span>
                </motion.div>
              )}
            </div>
            <span className={cn(
              "text-[11px] font-medium tracking-wide transition-all duration-300",
              isActive('/messages') ? "text-white" : "text-white/50"
            )}>
              Inbox
            </span>
          </motion.div>
        </Link>

        {/* Menu Button */}
        <button onClick={onMenuClick} className="relative group">
          <motion.div
            whileTap={{ scale: 0.92 }}
            className="flex flex-col items-center justify-center gap-1 py-2 px-5 rounded-2xl transition-all duration-300 text-white/50 hover:text-white/80"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 group-hover:bg-white/15 transition-all duration-300">
              <Menu className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-medium tracking-wide text-white/50 group-hover:text-white/80 transition-all duration-300">
              Menu
            </span>
          </motion.div>
        </button>

      </div>
    </nav>
  );
};

