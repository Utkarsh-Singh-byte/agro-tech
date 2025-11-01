'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { AuthForm } from '@/components/auth-form';
import { ChatSidebar } from '@/components/chat-sidebar';
import { ChatInterface } from '@/components/chat-interface';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !currentChatId) {
      createNewChat();
    }
  }, [user]);

  const createNewChat = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('chats')
      .insert({
        user_id: user.id,
        title: 'New Chat',
      })
      .select()
      .single();

    if (!error && data) {
      setCurrentChatId(data.id);
    }
  };

  const handleChatDeleted = (chatId: string) => {
    if (currentChatId === chatId) {
      createNewChat();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar
        currentChatId={currentChatId}
        onChatSelect={setCurrentChatId}
        onNewChat={createNewChat}
        onChatDeleted={handleChatDeleted}
      />
      <div className="flex-1 flex flex-col bg-gray-50">
        {currentChatId ? (
          <ChatInterface
            chatId={currentChatId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
