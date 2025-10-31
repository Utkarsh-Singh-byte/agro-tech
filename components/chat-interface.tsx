// 'use client';

// import { useState, useEffect, useRef } from 'react';
// import { supabase, type Message } from '@/lib/supabase';
// import { useAuth } from './auth-provider';
// import { Button } from './ui/button';
// import { Input } from './ui/input';
// import { Card } from './ui/card';
// import { ScrollArea } from './ui/scroll-area';
// import { ImagePlus, Send, Loader2 } from 'lucide-react';
// import Image from 'next/image';

// interface ChatInterfaceProps {
//   chatId: string;
//   onTitleUpdate: (title: string) => void;
// }

// export function ChatInterface({ chatId, onTitleUpdate }: ChatInterfaceProps) {
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [input, setInput] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [selectedImage, setSelectedImage] = useState<File | null>(null);
//   const [imagePreview, setImagePreview] = useState<string | null>(null);
//   const { user } = useAuth();
//   const scrollRef = useRef<HTMLDivElement>(null);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   useEffect(() => {
//     loadMessages();
//   }, [chatId]);

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   const scrollToBottom = () => {
//     if (scrollRef.current) {
//       scrollRef.current.scrollIntoView({ behavior: 'smooth' });
//     }
//   };

//   const loadMessages = async () => {
//     const { data, error } = await supabase
//       .from('messages')
//       .select('*')
//       .eq('chat_id', chatId)
//       .order('created_at', { ascending: true });

//     if (!error && data) {
//       setMessages(data);
//     }
//   };

//   const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       setSelectedImage(file);
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         setImagePreview(reader.result as string);
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const uploadImage = async (file: File): Promise<string> => {
//     const fileName = `${user?.id}/${Date.now()}-${file.name}`;
//     const { data, error } = await supabase.storage
//       .from('chat-images')
//       .upload(fileName, file);

//     if (error) throw error;

//     const { data: { publicUrl } } = supabase.storage
//       .from('chat-images')
//       .getPublicUrl(fileName);

//     return publicUrl;
//   };

//   const handleSend = async () => {
//     if ((!input.trim() && !selectedImage) || !user) return;

//     setLoading(true);
//     try {
//       let imageUrl: string | null = null;
//       if (selectedImage) {
//         imageUrl = await uploadImage(selectedImage);
//       }

//       const userMessage: Partial<Message> = {
//         chat_id: chatId,
//         role: 'user',
//         content: input || 'Please analyze this image',
//         image_url: imageUrl,
//       };

//       const { data: savedUserMessage, error: userError } = await supabase
//         .from('messages')
//         .insert(userMessage)
//         .select()
//         .single();

//       if (userError) throw userError;

//       setMessages(prev => [...prev, savedUserMessage]);
//       setInput('');
//       setSelectedImage(null);
//       setImagePreview(null);

//       if (messages.length === 0) {
//         const title = input.slice(0, 50) || 'Image Analysis';
//         await supabase
//           .from('chats')
//           .update({ title, updated_at: new Date().toISOString() })
//           .eq('id', chatId);
//         onTitleUpdate(title);
//       }

//       const last5Messages = [...messages, savedUserMessage].slice(-5);
//       const formattedMessages = last5Messages.map(msg => ({
//         role: msg.role,
//         content: msg.content,
//         imageUrl: msg.image_url,
//       }));

//       const response = await fetch(
//         `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat-with-gemini`,
//         {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
//           },
//           body: JSON.stringify({
//             messages: formattedMessages,
//           }),
//         }
//       );

//       if (!response.ok) {
//         throw new Error('Failed to get AI response');
//       }

//       const { response: aiResponse } = await response.json();

//       const assistantMessage: Partial<Message> = {
//         chat_id: chatId,
//         role: 'assistant',
//         content: aiResponse,
//         image_url: null,
//       };

//       const { data: savedAssistantMessage, error: assistantError } = await supabase
//         .from('messages')
//         .insert(assistantMessage)
//         .select()
//         .single();

//       if (assistantError) throw assistantError;

//       setMessages(prev => [...prev, savedAssistantMessage]);

//       await supabase
//         .from('chats')
//         .update({ updated_at: new Date().toISOString() })
//         .eq('id', chatId);

//     } catch (error) {
//       console.error('Error sending message:', error);
//       if (error instanceof Error && error.message.includes('Bucket not found')) {
//         alert('Image storage not properly configured. Please contact support.');
//       } else {
//         alert('Failed to send message. Please try again.');
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="flex flex-col h-full">
//       <ScrollArea className="flex-1 p-4">
//         <div className="space-y-4 max-w-4xl mx-auto">
//           {messages.map((message) => (
//             <div
//               key={message.id}
//               className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
//             >
//               <Card
//                 className={`max-w-[80%] p-4 ${
//                   message.role === 'user'
//                     ? 'bg-green-600 text-white'
//                     : 'bg-white border border-gray-200'
//                 }`}
//               >
//                 {message.image_url && (
//                   <div className="mb-2 relative w-full h-48">
//                     <Image
//                       src={message.image_url}
//                       alt="Uploaded crop image"
//                       fill
//                       className="object-cover rounded"
//                     />
//                   </div>
//                 )}
//                 <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
//               </Card>
//             </div>
//           ))}
//           {loading && (
//             <div className="flex justify-start">
//               <Card className="max-w-[80%] p-4 bg-white border border-gray-200">
//                 <div className="flex items-center gap-2">
//                   <Loader2 className="w-4 h-4 animate-spin" />
//                   <span className="text-sm">Analyzing...</span>
//                 </div>
//               </Card>
//             </div>
//           )}
//           <div ref={scrollRef} />
//         </div>
//       </ScrollArea>

//       <div className="border-t bg-white p-4">
//         <div className="max-w-4xl mx-auto">
//           {imagePreview && (
//             <div className="mb-2 relative inline-block">
//               <div className="relative w-32 h-32">
//                 <Image
//                   src={imagePreview}
//                   alt="Preview"
//                   fill
//                   className="object-cover rounded"
//                 />
//               </div>
//               <Button
//                 size="sm"
//                 variant="destructive"
//                 className="absolute -top-2 -right-2"
//                 onClick={() => {
//                   setSelectedImage(null);
//                   setImagePreview(null);
//                   if (fileInputRef.current) fileInputRef.current.value = '';
//                 }}
//               >
//                 ×
//               </Button>
//             </div>
//           )}
//           <div className="flex gap-2">
//             <input
//               ref={fileInputRef}
//               type="file"
//               accept="image/*"
//               className="hidden"
//               onChange={handleImageSelect}
//             />
//             <Button
//               variant="outline"
//               size="icon"
//               onClick={() => fileInputRef.current?.click()}
//               disabled={loading}
//             >
//               <ImagePlus className="w-5 h-5" />
//             </Button>
//             <Input
//               value={input}
//               onChange={(e) => setInput(e.target.value)}
//               placeholder="Ask about crops, diseases, or upload an image..."
//               onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
//               disabled={loading}
//               className="flex-1"
//             />
//             <Button
//               onClick={handleSend}
//               disabled={loading || (!input.trim() && !selectedImage)}
//               className="bg-green-600 hover:bg-green-700"
//             >
//               <Send className="w-5 h-5" />
//             </Button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, type Message } from '@/lib/supabase';
import { useAuth } from './auth-provider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { ImagePlus, Send, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface ChatInterfaceProps {
  chatId: string | null;
  
}

export function ChatInterface({ chatId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch chat messages
  useEffect(() => {
    if (chatId) fetchMessages();
  }, [chatId]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (!error && data) setMessages(data);
  };

  
useEffect(() => {
  const channel = supabase
    .channel('realtime-messages')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      fetchMessages
    )
    .subscribe();

  return () => {
    // call the async cleanup safely, no await
    supabase.removeChannel(channel);
  };
}, [chatId]);


  // Scroll to bottom when new messages appear
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!input.trim() && !image) return;
    setLoading(true);

    let imageUrl = null;
    if (image) {
      console.log(image);
     

      const { data, error } = await supabase.storage
      
        .from('chat-images')
        .upload(`${Date.now()}_${image.name}`, image);
         console.log(data);
         console.log(error);
      if (!error && data) {
        const { data: url } = supabase.storage.from('chat-images').getPublicUrl(data.path);
        imageUrl = url.publicUrl;
      }
      setImage(null);
    }

   const send= await supabase.from('messages').insert([
      {
        chat_id: chatId,
        role: 'user',
        content: input,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      },
    ]);
console.log(send);
    setInput('');
    setLoading(false);
  };

  // Message bubble animation variants
  const messageVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.3 },
    }),
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-green-50 via-white to-green-100 relative">
      {/* Chat messages */}
      <ScrollArea className="flex-1 p-6 space-y-4 overflow-y-auto">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-gray-500">
            🌱 Start chatting to grow your ideas!
          </div>
        )}
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={messageVariants}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card
              className={`max-w-[75%] rounded-2xl shadow-md ${
                msg.role === 'user'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-800 border border-green-200'
              }`}
            >
              <CardContent className="p-3">
                {msg.image_url && (
                  <div className="mb-2 rounded-lg overflow-hidden">
                    <Image
                      src={msg.image_url}
                      alt="Uploaded"
                      width={250}
                      height={250}
                      className="rounded-md hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-[10px] text-gray-400 mt-1 text-right">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        <div ref={scrollRef} />
      </ScrollArea>

      {/* Chat input area */}
      <div className="p-4 border-t border-green-200 bg-white/70 backdrop-blur-md flex items-center gap-3 shadow-lg">
        {/* Image upload */}
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
          <div className="p-2 bg-green-100 hover:bg-green-200 rounded-full transition-colors">
            <ImagePlus className="w-5 h-5 text-green-700" />
          </div>
        </label>

        {/* Image preview */}
        {image && (
          <div className="flex items-center gap-2 bg-green-100 px-2 py-1 rounded-lg">
            <p className="text-sm text-green-800">{image.name}</p>
            <button
              onClick={() => setImage(null)}
              className="text-red-600 hover:text-red-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Text input */}
        <Input
          type="text"
          placeholder="Ask about crops, soil, or climate..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border-green-300 focus:ring-green-500 focus:border-green-500 rounded-xl shadow-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 rounded-xl shadow-md transition-all"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  );
}
