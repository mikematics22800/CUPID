
import type { ChatConversation, UserProfileSummary, ChatMessage } from './types';

const mockUsers: UserProfileSummary[] = [
  { id: 'user1', name: 'Alice', avatarUrl: 'https://placehold.co/100x100/E91E63/white?text=A' },
  { id: 'user2', name: 'Bob', avatarUrl: 'https://placehold.co/100x100/4CAF50/white?text=B' },
  { id: 'user3', name: 'Charlie', avatarUrl: 'https://placehold.co/100x100/2196F3/white?text=C' },
  { id: 'currentUser', name: 'You', avatarUrl: 'https://placehold.co/100x100/FFC107/white?text=Y' }, // Representing the current user
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
    participants: [mockUsers[0], mockUsers[3]], // Alice and You
    lastMessage: MOCK_CHAT_MESSAGES['conv1'][MOCK_CHAT_MESSAGES['conv1'].length - 1],
    unreadCount: 1,
    timestamp: MOCK_CHAT_MESSAGES['conv1'][MOCK_CHAT_MESSAGES['conv1'].length - 1].timestamp,
  },
  {
    id: 'conv2',
    participants: [mockUsers[2], mockUsers[3]], // Charlie and You
    lastMessage: MOCK_CHAT_MESSAGES['conv2'][MOCK_CHAT_MESSAGES['conv2'].length - 1],
    unreadCount: 0,
    timestamp: MOCK_CHAT_MESSAGES['conv2'][MOCK_CHAT_MESSAGES['conv2'].length - 1].timestamp,
  },
  {
    id: 'conv3',
    participants: [mockUsers[1], mockUsers[3]], // Bob and You
    lastMessage: MOCK_CHAT_MESSAGES['conv3'][MOCK_CHAT_MESSAGES['conv3'].length - 1],
    unreadCount: 2,
    timestamp: MOCK_CHAT_MESSAGES['conv3'][MOCK_CHAT_MESSAGES['conv3'].length - 1].timestamp,
  },
];

export const getCurrentUser = (): UserProfileSummary => mockUsers.find(u => u.id === 'currentUser')!;
