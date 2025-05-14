

export const HOBBIES_LIST = [
  "Reading",
  "Traveling",
  "Cooking",
  "Sports",
  "Music",
  "Art",
  "Gaming",
  "Hiking",
  "Photography",
  "Movies",
  "Dancing",
  "Yoga",
  "Writing",
  "Coding",
  "Volunteering",
];

export const SEX_OPTIONS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
];

// Chat related types
export interface UserProfileSummary {
  id: string;
  name: string;
  avatarUrl?: string; // URL to user's main profile picture
}

export interface ChatMessage {
  id: string;
  senderId: string; // ID of the user who sent the message
  text: string;
  timestamp: Date;
  isRead?: boolean; // Optional: for tracking read status
}

export interface ChatConversation {
  id: string; // Unique ID for the conversation
  participants: UserProfileSummary[]; // Array of users in the chat (usually 2)
  lastMessage: ChatMessage | null;
  unreadCount?: number; // Number of unread messages for the current user in this conversation
  timestamp: Date; // Timestamp of the last activity or creation
}

// Extended User Profile for detailed information
export interface UserProfile extends UserProfileSummary {
  birthDate?: Date; // Already part of registration, might be useful here too
  sex?: string; // Also part of registration
  bio?: string;
  photos?: (string | null)[];
  hobbies?: string[];
}
