import { useAuth } from '@/utils/auth/useAuth';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthModal } from '@/components/AuthModal';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const { isReady } = useAuth();

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="listing/[id]" />
          <Stack.Screen name="checkout/[id]" />
          <Stack.Screen name="messages/[id]" />
          <Stack.Screen name="orders/index" />
          <Stack.Screen name="orders/[id]" />
          <Stack.Screen name="wallet/index" />
          <Stack.Screen name="saved/index" />
          <Stack.Screen name="settings/index" />
          <Stack.Screen name="settings/notifications" />
          <Stack.Screen name="seller/dashboard" />
          <Stack.Screen name="trade-offers/index" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <AuthModal />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
