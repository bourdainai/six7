import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

export const useTypingIndicator = (conversationId: string, currentUserId?: string) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const typingChannel = supabase.channel(`typing:${conversationId}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    typingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState<TypingUser>();
        const users: TypingUser[] = [];
        
        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            if (presence.userId !== currentUserId) {
              users.push(presence);
            }
          });
        });
        
        // Filter out users who haven't typed in last 3 seconds
        const now = Date.now();
        const activeUsers = users.filter(u => now - u.timestamp < 3000);
        setTypingUsers(activeUsers);
      })
      .subscribe();

    setChannel(typingChannel);

    return () => {
      typingChannel.unsubscribe();
    };
  }, [conversationId, currentUserId]);

  const startTyping = async (userName: string) => {
    if (channel && currentUserId) {
      await channel.track({
        userId: currentUserId,
        userName,
        timestamp: Date.now(),
      });
    }
  };

  const stopTyping = async () => {
    if (channel) {
      await channel.untrack();
    }
  };

  return {
    typingUsers,
    startTyping,
    stopTyping,
    isTyping: typingUsers.length > 0,
  };
};
