import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTotalUnreadMessages = (userId?: string) => {
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchTotalUnread = async () => {
      // Get all conversations for this user
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

      if (!conversations) return;

      const conversationIds = conversations.map(c => c.id);
      if (conversationIds.length === 0) return;

      // Count all unread messages across all conversations
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .eq('read', false)
        .neq('sender_id', userId);

      setTotalUnread(count || 0);
    };

    fetchTotalUnread();

    // Subscribe to new messages
    const channel = supabase
      .channel('total-unread')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchTotalUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return totalUnread;
};
