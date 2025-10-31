// 'use client';

// import { useState, useEffect } from 'react';
// import { supabase, type Chat } from '@/lib/supabase';
// import { useAuth } from './auth-provider';
// import { Button } from './ui/button';
// import { ScrollArea } from './ui/scroll-area';
// import { MessageSquarePlus, Sprout, LogOut, Trash2 } from 'lucide-react';
// import { cn } from '@/lib/utils';

// interface ChatSidebarProps {
//   currentChatId: string | null;
//   onChatSelect: (chatId: string) => void;
//   onNewChat: () => void;
//   onChatDeleted: (chatId: string) => void;
// }

// export function ChatSidebar({ currentChatId, onChatSelect, onNewChat, onChatDeleted }: ChatSidebarProps) {
//   const [chats, setChats] = useState<Chat[]>([]);
//   const { user, signOut } = useAuth();

//   useEffect(() => {
//     if (user) {
//       loadChats();
//     }
//   }, [user]);

//   const loadChats = async () => {
//     const { data, error } = await supabase
//       .from('chats')
//       .select('*')
//       .order('updated_at', { ascending: false });

//     if (!error && data) {
//       setChats(data);
//     }
//   };

//   const handleDelete = async (chatId: string, e: React.MouseEvent) => {
//     e.stopPropagation();
//     if (!confirm('Are you sure you want to delete this chat?')) return;

//     const { error } = await supabase
//       .from('chats')
//       .delete()
//       .eq('id', chatId);

//     if (!error) {
//       setChats(prev => prev.filter(chat => chat.id !== chatId));
//       onChatDeleted(chatId);
//     }
//   };

//   const handleNewChat = () => {
//     onNewChat();
//     loadChats();
//   };

//   useEffect(() => {
//     const channel = supabase
//       .channel('chats-changes')
//       .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
//         loadChats();
//       })
//       .subscribe();

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, []);

//   return (
//     <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
//       <div className="p-4 border-b border-gray-800">
//         <div className="flex items-center gap-2 mb-4">
//           <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
//             <Sprout className="w-6 h-6" />
//           </div>
//           <div>
//             <h1 className="font-bold text-lg">AgriAssist</h1>
//             <p className="text-xs text-gray-400">AI Agriculture Helper</p>
//           </div>
//         </div>
//         <Button
//           onClick={handleNewChat}
//           className="w-full bg-green-600 hover:bg-green-700 flex items-center gap-2"
//         >
//           <MessageSquarePlus className="w-4 h-4" />
//           New Chat
//         </Button>
//       </div>

//       <ScrollArea className="flex-1 p-2">
//         <div className="space-y-1">
//           {chats.map((chat) => (
//             <div
//               key={chat.id}
//               className={cn(
//                 'group relative p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-800',
//                 currentChatId === chat.id && 'bg-gray-800'
//               )}
//               onClick={() => onChatSelect(chat.id)}
//             >
//               <div className="flex items-start justify-between gap-2">
//                 <div className="flex-1 min-w-0">
//                   <p className="text-sm font-medium truncate">{chat.title}</p>
//                   <p className="text-xs text-gray-400 mt-1">
//                     {new Date(chat.updated_at).toLocaleDateString()}
//                   </p>
//                 </div>
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-red-600"
//                   onClick={(e) => handleDelete(chat.id, e)}
//                 >
//                   <Trash2 className="w-3 h-3" />
//                 </Button>
//               </div>
//             </div>
//           ))}
//         </div>
//       </ScrollArea>

//       <div className="p-4 border-t border-gray-800">
//         <div className="text-sm text-gray-400 mb-2 truncate">
//           {user?.email}
//         </div>
//         <Button
//           onClick={signOut}
//           variant="outline"
//           className="w-full border-gray-700 hover:bg-gray-800 flex items-center gap-2"
//         >
//           <LogOut className="w-4 h-4" />
//           Sign Out
//         </Button>
//       </div>
//     </div>
//   );
// }

'use client';

import { useState, useEffect } from 'react';
import { supabase, type Chat } from '@/lib/supabase';
import { useAuth } from './auth-provider';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { MessageSquarePlus, Sprout, LogOut, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ChatSidebarProps {
  currentChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onChatDeleted: (chatId: string) => void;
}

export function ChatSidebar({ currentChatId, onChatSelect, onNewChat, onChatDeleted }: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (user) loadChats();
  }, [user]);

  const loadChats = async () => {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .order('updated_at', { ascending: false });
    if (!error && data) setChats(data);
  };

  const handleDelete = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;
    const { error } = await supabase.from('chats').delete().eq('id', chatId);
    if (!error) {
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      onChatDeleted(chatId);
    }
  };

  const handleNewChat = () => {
    onNewChat();
    loadChats();
  };

 useEffect(() => {
  const channel = supabase
    .channel('chats-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
      loadChats();
    })
    .subscribe();

  // cleanup (safe and synchronous)
  return () => {
    channel.unsubscribe();
  };
}, []);


  return (
    <div className="w-72 bg-gradient-to-b from-green-950 via-green-900 to-gray-900 text-white flex flex-col h-full shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-green-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-green-600 rounded-xl p-2">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">AgriAssist</h1>
            <p className="text-xs text-gray-400">AI Agriculture Helper</p>
          </div>
        </div>
      </div>

      {/* New chat */}
      <div className="p-3">
        <Button
          onClick={handleNewChat}
          className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2 rounded-xl shadow-md transition-all"
        >
          <MessageSquarePlus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      {/* Chats List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1">
          {chats.length === 0 && (
            <p className="text-gray-400 text-center text-sm mt-4">No chats yet — start one!</p>
          )}
          {chats.map((chat) => (
            <motion.div
              key={chat.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'group relative p-3 rounded-lg cursor-pointer transition-colors hover:bg-green-800/40',
                currentChatId === chat.id && 'bg-green-800/60 ring-2 ring-green-600'
              )}
              onClick={() => onChatSelect(chat.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{chat.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(chat.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-red-600 rounded-full"
                  onClick={(e) => handleDelete(chat.id, e)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-green-800 bg-green-950/30">
        <p className="text-sm text-gray-300 mb-2 truncate">{user?.email}</p>
        <Button
          onClick={signOut}
          variant="outline"
          className="w-full border-gray-700 hover:bg-green-800 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
