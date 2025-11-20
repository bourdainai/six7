import { useNavigate as useRouterNavigate, NavigateOptions, To } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Hook to use the View Transitions API for navigation.
 * Falls back to standard React Router navigation if the API is not supported.
 */
export const useViewTransition = () => {
  const navigate = useRouterNavigate();

  const navigateWithTransition = useCallback(
    (to: To, options?: NavigateOptions) => {
      // Check if startViewTransition is supported
      if (!document.startViewTransition) {
        navigate(to, options);
        return;
      }

      // Use the View Transitions API
      document.startViewTransition(() => {
        navigate(to, options);
      });
    },
    [navigate]
  );

  return navigateWithTransition;
};

