
"use client";

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Paperclip, Smile } from 'lucide-react';
import type { ChatConversation, ChatMessage, UserProfileSummary } from '@/lib/types';
import { MOCK_CHAT_CONVERSATIONS, MOCK_CHAT_MESSAGES, getCurrentUser } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const MessageBubble = ({ message, isCurrentUser }: { message: ChatMessage; isCurrentUser: boolean }) => {
  const senderDetails = MOCK_CHAT_CONVERSATIONS
    .flatMap(conv => conv.participants)
    .find(p => p.id === message.senderId) || getCurrentUser(); // Fallback for sender not in current mock participants

  return (
    <div className={cn("flex mb-4", isCurrentUser ? "justify-end" : "justify-start")}>
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 mr-2 self-end">
          <AvatarImage src={senderDetails?.avatarUrl} alt={senderDetails?.name} data-ai-hint="person avatar small" />
          <AvatarFallback>{senderDetails?.name.substring(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[70%] p-3 rounded-xl",
          isCurrentUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-foreground rounded-bl-none"
        )}
      >
        <p className="text-sm">{message.text}</p>
        <p className={cn("text-xs mt-1", isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
          {format(new Date(message.timestamp), "p")}
        </p>
      </div>
       {isCurrentUser && (
        <Avatar className="h-8 w-8 ml-2 self-end">
          <AvatarImage src={senderDetails?.avatarUrl} alt={senderDetails?.name} data-ai-hint="person avatar small" />
          <AvatarFallback>{senderDetails?.name.substring(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default function IndividualChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.chatId as string;

  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUser = getCurrentUser(); // In a real app, from auth context

  useEffect(() => {
    // Fetch conversation details and messages (mocked)
    const conv = MOCK_CHAT_CONVERSATIONS.find(c => c.id === chatId);
    if (conv) {
      setConversation(conv);
      const chatMessages = MOCK_CHAT_MESSAGES[chatId] || [];
      // Sort messages by timestamp just in case they are not already
      setMessages(chatMessages.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    } else {
      // Handle conversation not found, e.g., redirect
      // router.push('/chats'); 
    }
  }, [chatId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (event: FormEvent) => {
    event.preventDefault();
    if (newMessage.trim() === '' || !conversation) return;

    const messageToSend: ChatMessage = {
      id: `msg${Date.now()}`, // Simple unique ID for mock
      senderId: currentUser.id,
      text: newMessage.trim(),
      timestamp: new Date(),
      isRead: false,
    };

    // Update mock data (in a real app, send to backend)
    MOCK_CHAT_MESSAGES[conversation.id] = [...(MOCK_CHAT_MESSAGES[conversation.id] || []), messageToSend];
    setMessages(prev => [...prev, messageToSend]);

    // Update last message in conversation (mock)
    const convIndex = MOCK_CHAT_CONVERSATIONS.findIndex(c => c.id === conversation.id);
    if (convIndex !== -1) {
        MOCK_CHAT_CONVERSATIONS[convIndex].lastMessage = messageToSend;
        MOCK_CHAT_CONVERSATIONS[convIndex].timestamp = messageToSend.timestamp;
    }
    
    setNewMessage('');
  };

  const otherParticipant = conversation?.participants.find(p => p.id !== currentUser.id);

  if (!conversation) {
    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center">
            <p className="text-muted-foreground">Loading chat or chat not found...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* Header */}
      <header className="flex items-center p-3 border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <Button variant="ghost" size="icon" onClick={() => router.push('/chats')} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {otherParticipant && (
          <>
            <Avatar className="h-9 w-9 mr-3">
              <AvatarImage src={otherParticipant.avatarUrl} alt={otherParticipant.name} data-ai-hint="person avatar small" />
              <AvatarFallback>{otherParticipant.name.substring(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold">{otherParticipant.name}</h2>
          </>
        )}
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} isCurrentUser={msg.senderId === currentUser.id} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <footer className="p-3 border-t bg-background sticky bottom-0">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" type="button" className="text-muted-foreground hover:text-primary">
            <Smile className="h-5 w-5" />
            <span className="sr-only">Emoji</span>
          </Button>
          <Button variant="ghost" size="icon" type="button" className="text-muted-foreground hover:text-primary">
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">Attach file</span>
          </Button>
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
            autoComplete="off"
          />
          <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Send className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </footer>
    </div>
  );
}
