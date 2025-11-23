import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { AuthModal } from "@/components/auth/AuthModal";
import { NotificationCenter } from "@/components/NotificationCenter";
import { DesktopNav } from "@/components/navigation/DesktopNav";
import { MobileMenu } from "@/components/navigation/MobileMenu";
import { useTotalUnreadMessages } from "@/hooks/useTotalUnreadMessages";
import logo from "@/assets/logo.svg";
import React from "react";

export const Navigation = React.memo(() => {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notificationRef = useRef<HTMLButtonElement>(null);
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useAdminCheck();
  const totalUnread = useTotalUnreadMessages(user?.id);

  const handleAuthClick = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  const handleNotificationsClick = () => {
    notificationRef.current?.click();
  };

  const navLinks = [
    { to: "/browse", label: "Browse" },
    { to: "/sell", label: "Sell" },
  ];

  return (
    <>
      <nav 
        className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-divider-gray"
        style={{
          width: '100%',
          height: '72px',
          contain: 'layout style paint',
          willChange: 'auto',
        }}
      >
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between"
          style={{
            width: '100%',
            maxWidth: '1280px',
            height: '72px',
            minHeight: '72px',
            maxHeight: '72px',
            contain: 'layout',
          }}
        >
          <Link 
            to="/" 
            className="flex items-center gap-2 group relative flex-shrink-0"
            style={{
              height: '56px',
              minHeight: '56px',
              maxHeight: '56px',
              width: 'auto',
              contain: 'layout',
            }}
          >
            <img 
              src={logo} 
              alt="6Seven" 
              className="h-14 w-auto transition-opacity duration-fast group-hover:opacity-80"
              style={{ 
                width: 'auto',
                height: '56px',
                minHeight: '56px',
                maxHeight: '56px',
                display: 'block',
                position: 'relative',
                flexShrink: 0,
                contain: 'layout',
              }}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4" style={{ contain: 'layout' }}>
            <DesktopNav 
              navLinks={navLinks}
              user={user}
              isAdmin={!!isAdmin}
              onSignOut={handleSignOut}
              onAuthClick={handleAuthClick}
              unreadMessagesCount={totalUnread}
            />
            {user && <NotificationCenter ref={notificationRef} />}
          </div>

          {/* Mobile Navigation */}
          <div className="flex lg:hidden items-center gap-2" style={{ contain: 'layout' }}>
            {user && <NotificationCenter ref={notificationRef} />}
            <MobileMenu 
              open={mobileMenuOpen}
              onOpenChange={setMobileMenuOpen}
              navLinks={navLinks}
              user={user}
              isAdmin={!!isAdmin}
              onSignOut={handleSignOut}
              onNotificationsClick={handleNotificationsClick}
              unreadMessagesCount={totalUnread}
            />
          </div>
        </div>
      </nav>

      <AuthModal 
        open={authOpen} 
        onOpenChange={setAuthOpen} 
        defaultMode={authMode}
      />
    </>
  );
});

Navigation.displayName = "Navigation";
