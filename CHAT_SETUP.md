# CUPID Chat Setup Guide

## Overview
This implementation provides a complete live chat system using Supabase Realtime with the following features:

- ✅ Real-time messaging
- ✅ Message read status
- ✅ Unread message badges
- ✅ Message deletion
- ✅ Chat room management
- ✅ Optimistic UI updates
- ✅ Proper error handling

## Database Setup

### 1. Run the SQL Schema
Execute the SQL commands in `database-schema.sql` in your Supabase SQL editor:

```sql
-- Copy and paste the entire content from database-schema.sql
```

### 2. Enable Realtime
In your Supabase dashboard:
1. Go to Database → Replication
2. Enable realtime for the `messages` and `chat_rooms` tables
3. Set the replication mode to "Logical Replication"

### 3. Verify RLS Policies
The schema includes Row Level Security policies that ensure:
- Users can only access their own chat rooms
- Users can only send messages in their own chat rooms
- Users can only delete their own messages

## Features Implemented

### Real-time Messaging
- Messages appear instantly using Supabase Realtime
- Optimistic UI updates for better UX
- Automatic message read status updates

### Chat Management
- Automatic chat room creation when users match
- Chat room list with last message preview
- Unread message indicators

### Message Features
- Text messages with timestamps
- Read receipts (checkmarks)
- Message deletion (sender only)
- Message status indicators

### UI/UX Features
- Modern chat bubble design
- Unread message badges on tab bar
- Loading states and error handling
- Keyboard-aware input
- Auto-scroll to bottom

## Usage

### Starting a Chat
1. Navigate to the Matches tab
2. Tap the chat button on any match
3. The chat room is automatically created
4. Start typing and sending messages

### Real-time Features
- Messages appear instantly for both users
- Read status updates in real-time
- Unread count updates automatically
- Chat room list updates when new messages arrive

## Technical Details

### Database Tables
- `chat_rooms`: Stores chat room information between two users
- `messages`: Stores individual messages with metadata

### Key Functions
- `getOrCreateChatRoom()`: Creates or retrieves chat room
- `sendMessage()`: Sends a new message
- `getMessages()`: Retrieves message history
- `subscribeToMessages()`: Sets up real-time message subscription
- `markMessagesAsRead()`: Updates read status

### Real-time Subscriptions
- Message subscriptions for individual chat rooms
- Chat room subscriptions for list updates
- Unread count subscriptions for badge updates

## Performance Optimizations

### Database Indexes
- Indexes on frequently queried columns
- Optimized queries for chat room lookups
- Efficient message retrieval with pagination

### Real-time Efficiency
- Channel-based subscriptions to minimize overhead
- Proper cleanup of subscriptions
- Optimistic updates to reduce perceived latency

### UI Performance
- FlatList for efficient message rendering
- Message virtualization for large chat histories
- Debounced scroll-to-bottom behavior

## Security Features

### Row Level Security (RLS)
- Users can only access their own chat rooms
- Message access restricted to chat room participants
- Sender-only message deletion

### Authentication
- All chat operations require user authentication
- User ID validation on all operations
- Proper error handling for unauthenticated requests

## Troubleshooting

### Common Issues

1. **Messages not appearing in real-time**
   - Check if Realtime is enabled in Supabase
   - Verify RLS policies are correct
   - Check network connectivity

2. **Chat rooms not creating**
   - Ensure the `get_or_create_chat_room` function exists
   - Check user authentication status
   - Verify user IDs are valid UUIDs

3. **Permission errors**
   - Check RLS policies in Supabase dashboard
   - Verify user is authenticated
   - Ensure user is part of the chat room

### Debug Tips
- Check browser console for error messages
- Use Supabase dashboard to inspect database
- Verify realtime subscriptions are active
- Test with multiple user accounts

## Future Enhancements

### Planned Features
- Image and file sharing
- Typing indicators
- Message reactions
- Group chats
- Message search
- Push notifications

### Performance Improvements
- Message pagination
- Image compression
- Offline message queuing
- Message encryption

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Supabase documentation
3. Check console logs for errors
4. Verify database schema is correct 