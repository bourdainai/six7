import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUnreadCount = (conversationId: string, currentUserId?: string) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('read', false)
        .neq('sender_id', currentUserId);

      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // Subscribe to new messages
    const channel = supabase
      .channel(`unread:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  const markAsRead = async () => {
    if (!conversationId || !currentUserId) return;

    await supabase
      .from('messages')
      .update({ 
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .eq('read', false)
      .neq('sender_id', currentUserId);

    setUnreadCount(0);
  };

  return { unreadCount, markAsRead };
};
