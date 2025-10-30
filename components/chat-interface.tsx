'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, type Message } from '@/lib/supabase';
import { useAuth } from './auth-provider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { ImagePlus, Send, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ChatInterfaceProps {
  chatId: string;
  onTitleUpdate: (title: string) => void;
}

export function ChatInterface({ chatId, onTitleUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setGeminiApiKey(storedKey);
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || !user) return;

    if (!geminiApiKey) {
      const key = prompt('Please enter your Gemini API key:');
      if (!key) return;
      setGeminiApiKey(key);
      localStorage.setItem('gemini_api_key', key);
    }

    setLoading(true);
    try {
      let imageUrl: string | null = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      const userMessage: Partial<Message> = {
        chat_id: chatId,
        role: 'user',
        content: input || 'Please analyze this image',
        image_url: imageUrl,
      };

      const { data: savedUserMessage, error: userError } = await supabase
        .from('messages')
        .insert(userMessage)
        .select()
        .single();

      if (userError) throw userError;

      setMessages(prev => [...prev, savedUserMessage]);
      setInput('');
      setSelectedImage(null);
      setImagePreview(null);

      if (messages.length === 0) {
        const title = input.slice(0, 50) || 'Image Analysis';
        await supabase
          .from('chats')
          .update({ title, updated_at: new Date().toISOString() })
          .eq('id', chatId);
        onTitleUpdate(title);
      }

      const last5Messages = [...messages, savedUserMessage].slice(-5);
      const formattedMessages = last5Messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        imageUrl: msg.image_url,
      }));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat-with-gemini`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: formattedMessages,
            geminiApiKey: geminiApiKey,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const { response: aiResponse } = await response.json();

      const assistantMessage: Partial<Message> = {
        chat_id: chatId,
        role: 'assistant',
        content: aiResponse,
        image_url: null,
      };

      const { data: savedAssistantMessage, error: assistantError } = await supabase
        .from('messages')
        .insert(assistantMessage)
        .select()
        .single();

      if (assistantError) throw assistantError;

      setMessages(prev => [...prev, savedAssistantMessage]);

      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`max-w-[80%] p-4 ${
                  message.role === 'user'
                    ? 'bg-green-600 text-white'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {message.image_url && (
                  <div className="mb-2 relative w-full h-48">
                    <Image
                      src={message.image_url}
                      alt="Uploaded crop image"
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
              </Card>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <Card className="max-w-[80%] p-4 bg-white border border-gray-200">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Analyzing...</span>
                </div>
              </Card>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="border-t bg-white p-4">
        <div className="max-w-4xl mx-auto">
          {imagePreview && (
            <div className="mb-2 relative inline-block">
              <div className="relative w-32 h-32">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="object-cover rounded"
                />
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2"
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                ×
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <ImagePlus className="w-5 h-5" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about crops, diseases, or upload an image..."
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={loading || (!input.trim() && !selectedImage)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
