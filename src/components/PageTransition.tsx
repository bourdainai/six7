import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
}

export const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<"entering" | "entered">("entered");

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage("entering");
      // Small delay to allow exit animation
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage("entered");
      }, 100);

      return () => clearTimeout(timer);
    } else {
      setTransitionStage("entered");
    }
  }, [location, displayLocation]);

  return (
    <div
      key={displayLocation.pathname}
      className={`page-transition ${
        transitionStage === "entering" ? "opacity-0" : "opacity-100"
      } transition-opacity duration-100 ease-in-out`}
      style={{ minHeight: "100vh" }}
    >
      {children}
    </div>
  );
};

