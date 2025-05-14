
"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquareText, Users } from "lucide-react";
import type { ChatConversation, UserProfileSummary } from "@/lib/types";
import { MOCK_CHAT_CONVERSATIONS, getCurrentUser } from "@/lib/mock-data";
import { formatDistanceToNowStrict } from 'date-fns';

// Helper function to get the other participant in a 1-on-1 chat
const getOtherParticipant = (conversation: ChatConversation, currentUserId: string): UserProfileSummary | undefined => {
  return conversation.participants.find(p => p.id !== currentUserId);
};

const ChatListItem = ({ conversation }: { conversation: ChatConversation }) => {
  const currentUser = getCurrentUser(); // In a real app, this would come from auth context
  const otherParticipant = getOtherParticipant(conversation, currentUser.id);

  if (!otherParticipant) return null;

  return (
    <Link href={`/chat/${conversation.id}`} passHref>
      <div className="flex items-center p-4 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer border-b">
        <Avatar className="h-12 w-12 mr-4">
          <AvatarImage src={otherParticipant.avatarUrl} alt={otherParticipant.name} data-ai-hint="person avatar" />
          <AvatarFallback>{otherParticipant.name.substring(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">{otherParticipant.name}</h3>
            {conversation.lastMessage && (
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNowStrict(new Date(conversation.lastMessage.timestamp), { addSuffix: true })}
              </p>
            )}
          </div>
          <div className="flex justify-between items-center mt-1">
            <p className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-[250px] md:max-w-xs">
              {conversation.lastMessage?.text || "No messages yet"}
            </p>
            {conversation.unreadCount && conversation.unreadCount > 0 && (
              <Badge variant="default" className="bg-accent text-accent-foreground text-xs px-2 py-0.5">
                {conversation.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default function ChatsPage() {
  // In a real app, fetch conversations for the current user
  const conversations: ChatConversation[] = MOCK_CHAT_CONVERSATIONS.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-semibold">
            <MessageSquareText className="mr-3 h-8 w-8 text-primary" />
            Your Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conversations.length > 0 ? (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <ChatListItem key={conv.id} conversation={conv} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Conversations Yet</h3>
              <p className="text-muted-foreground mb-6">Start matching with people to begin chatting!</p>
              <Button asChild variant="outline">
                <Link href="/dashboard">Find Matches</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
