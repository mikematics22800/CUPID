
import type { ChatConversation, UserProfileSummary, ChatMessage, UserProfile } from './types';

const mockUsers: UserProfile[] = [ // Changed to UserProfile to hold more details
  { 
    id: 'user1', 
    name: 'Alice', 
    avatarUrl: 'https://placehold.co/100x100/E91E63/white?text=A',
    bio: "Alice's mock bio. Loves painting and quiet evenings.",
    photos: [
        "https://placehold.co/400x500/E91E63/white?text=Alice+1", 
        "https://placehold.co/400x500/E91E63/black?text=Alice+2",
        null, null, null, null
    ],
    hobbies: ["Art", "Reading", "Movies"],
  },
  { 
    id: 'user2', 
    name: 'Bob', 
    avatarUrl: 'https://placehold.co/100x100/4CAF50/white?text=B',
    bio: "Bob's adventure-filled bio. Always looking for the next hike.",
    photos: [
        "https://placehold.co/400x500/4CAF50/white?text=Bob+1",
        null, null, null, null, null
    ],
    hobbies: ["Hiking", "Sports", "Traveling", "Photography"],
  },
  { 
    id: 'user3', 
    name: 'Charlie', 
    avatarUrl: 'https://placehold.co/100x100/2196F3/white?text=C',
    bio: "Charlie's tech-focused bio. Enjoys coding and gaming.",
    photos: [
        "https://placehold.co/400x500/2196F3/white?text=Charlie+1", 
        "https://placehold.co/400x500/2196F3/black?text=Charlie+2",
        "https://placehold.co/400x500/2196F3/grey?text=Charlie+3",
        null, null, null
    ],
    hobbies: ["Coding", "Gaming", "Music"],
  },
  { 
    id: 'currentUser', 
    name: 'You', 
    avatarUrl: 'https://placehold.co/100x100/FFC107/white?text=Y',
    bio: "This is your current bio. It's pretty cool, right? Make sure it's at least 100 characters long to be effective! You can write about your passions, what you're looking for, or just a fun fact about yourself. The more detailed, the better!",
    photos: [
        "https://placehold.co/400x500/FFC107/white?text=You+1",
        "https://placehold.co/400x500/FFC107/black?text=You+2",
        "https://placehold.co/400x500/FFC107/grey?text=You+3",
        "https://placehold.co/400x500/FFC107/blue?text=You+4",
        null,
        null,
    ],
    hobbies: ["Photography", "Yoga", "Traveling", "Cooking"],
    birthDate: new Date(1990, 5, 15), // Example birth date
    sex: "female", // Example sex
  },
];

export const MOCK_CHAT_MESSAGES: { [conversationId: string]: ChatMessage[] } = {
  'conv1': [
    { id: 'msg1', senderId: 'user1', text: 'Hey Bob, how are you?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), isRead: true },
    { id: 'msg2', senderId: 'currentUser', text: 'Hi Alice! I am good, thanks for asking. What about you?', timestamp: new Date(Date.now() - 1000 * 60 * 50), isRead: true },
    { id: 'msg3', senderId: 'user1', text: 'Doing great! Just finished a new painting.', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
    { id: 'msg4', senderId: 'currentUser', text: 'Oh, awesome! Would love to see it sometime.', timestamp: new Date(Date.now() - 1000 * 60 * 10) },
  ],
  'conv2': [
    { id: 'msg5', senderId: 'user3', text: 'Found this cool new cafe, wanna check it out?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), isRead: true },
    { id: 'msg6', senderId: 'currentUser', text: 'Sure Charlie, sounds fun! When were you thinking?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4) },
  ],
  'conv3': [
     { id: 'msg7', senderId: 'currentUser', text: 'Hey, saw you like hiking too!', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) },
     { id: 'msg8', senderId: 'user2', text: 'Yes! We should go sometime.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23) },
  ]
};

export const MOCK_CHAT_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'conv1',
    participants: [mockUsers[0] as UserProfileSummary, mockUsers[3] as UserProfileSummary], // Alice and You
    lastMessage: MOCK_CHAT_MESSAGES['conv1'][MOCK_CHAT_MESSAGES['conv1'].length - 1],
    unreadCount: 1,
    timestamp: MOCK_CHAT_MESSAGES['conv1'][MOCK_CHAT_MESSAGES['conv1'].length - 1].timestamp,
  },
  {
    id: 'conv2',
    participants: [mockUsers[2] as UserProfileSummary, mockUsers[3] as UserProfileSummary], // Charlie and You
    lastMessage: MOCK_CHAT_MESSAGES['conv2'][MOCK_CHAT_MESSAGES['conv2'].length - 1],
    unreadCount: 0,
    timestamp: MOCK_CHAT_MESSAGES['conv2'][MOCK_CHAT_MESSAGES['conv2'].length - 1].timestamp,
  },
  {
    id: 'conv3',
    participants: [mockUsers[1] as UserProfileSummary, mockUsers[3] as UserProfileSummary], // Bob and You
    lastMessage: MOCK_CHAT_MESSAGES['conv3'][MOCK_CHAT_MESSAGES['conv3'].length - 1],
    unreadCount: 2,
    timestamp: MOCK_CHAT_MESSAGES['conv3'][MOCK_CHAT_MESSAGES['conv3'].length - 1].timestamp,
  },
];

export const getCurrentUser = (): UserProfile => mockUsers.find(u => u.id === 'currentUser')!;
