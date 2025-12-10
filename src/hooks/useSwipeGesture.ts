import { useState, useCallback, useRef } from "react";

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  preventDefaultTouchmoveEvent?: boolean;
}

interface SwipeState {
  startX: number;
  startY: number;
  isSwiping: boolean;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  preventDefaultTouchmoveEvent = false,
}: SwipeConfig) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const state = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    isSwiping: false,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    state.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      isSwiping: false,
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!state.current.startX) return;

    const touch = e.touches[0];
    const diffX = touch.clientX - state.current.startX;
    const diffY = touch.clientY - state.current.startY;

    // Only start swiping if horizontal movement is greater than vertical
    if (!state.current.isSwiping && Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      state.current.isSwiping = true;
    }

    if (state.current.isSwiping) {
      if (preventDefaultTouchmoveEvent) {
        e.preventDefault();
      }
      // Limit the offset with resistance at edges
      const resistance = 0.4;
      const limitedOffset = diffX * resistance;
      setSwipeOffset(limitedOffset);
    }
  }, [preventDefaultTouchmoveEvent]);

  const handleTouchEnd = useCallback(() => {
    const diffX = swipeOffset / 0.4; // Reverse the resistance to get actual diff

    if (Math.abs(diffX) > threshold) {
      if (diffX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (diffX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    setSwipeOffset(0);
    state.current = {
      startX: 0,
      startY: 0,
      isSwiping: false,
    };
  }, [swipeOffset, threshold, onSwipeLeft, onSwipeRight]);

  return {
    swipeOffset,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
