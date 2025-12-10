import { useEffect, useRef, useMemo } from 'react';
import { logger } from '@/lib/logger';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  componentName: string;
}

export function useTradePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current += 1;

    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      
      // Log slow renders (>16ms = 60fps threshold)
      if (renderTime > 16) {
        logger.warn(`[Performance] ${componentName} slow render:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          renderCount: renderCount.current,
          memory: (performance as any).memory?.usedJSHeapSize
            ? `${((performance as any).memory.usedJSHeapSize / 1048576).toFixed(2)}MB`
            : 'N/A'
        });
      }

      // Log to analytics every 10 renders
      if (renderCount.current % 10 === 0) {
        const metrics: PerformanceMetrics = {
          componentName,
          renderTime,
          memoryUsage: (performance as any).memory?.usedJSHeapSize
        };
        
        // Could send to analytics service here
        logger.debug('[Performance Metrics]', metrics);
      }
    };
  });
}

// Memoization helper for expensive calculations
export function useMemoizedTradeValue<T>(
  calculate: () => T,
  deps: React.DependencyList
): T {
  const startTime = performance.now();
  const result = useMemo(calculate, deps);
  const calcTime = performance.now() - startTime;
  
  if (calcTime > 10) {
    logger.warn('[Performance] Expensive calculation detected:', {
      time: `${calcTime.toFixed(2)}ms`,
      deps: deps.length
    });
  }
  
  return result;
}
