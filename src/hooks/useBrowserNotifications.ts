import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useBrowserNotifications = (userId?: string) => {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Not supported",
        description: "Your browser doesn't support notifications",
        variant: "destructive",
      });
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      toast({
        title: "Notifications enabled",
        description: "You'll now receive message notifications",
      });
      return true;
    }
    
    return false;
  };

  useEffect(() => {
    if (!userId || permission !== 'granted') return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${userId}`,
        },
        async (payload) => {
          // Get conversation to check if user is a participant
          const { data: conversation } = await supabase
            .from('conversations')
            .select('buyer_id, seller_id, listing:listings(title)')
            .eq('id', payload.new.conversation_id)
            .single();

          if (
            conversation &&
            (conversation.buyer_id === userId || conversation.seller_id === userId)
          ) {
            new Notification('New message', {
              body: `${payload.new.content.substring(0, 50)}${
                payload.new.content.length > 50 ? '...' : ''
              }`,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: payload.new.conversation_id,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, permission]);

  return {
    permission,
    requestPermission,
    isEnabled: permission === 'granted',
  };
};
