import { supabase } from './supabase.js';

// Function to detect violent threats in messages
export const detectViolentThreats = async (messageContent, senderId, recipientId) => {
  try {
    console.log(`🔍 Scanning message for explicit violent threats...`);
    
    // Convert to lowercase for case-insensitive matching
    const lowerMessage = messageContent.toLowerCase();
    
    // Explicit violent threat keywords
    const violentKeywords = [
      'kill you', 'kill them', 'kill him', 'kill her',
      'murder you', 'murder them', 'murder him', 'murder her',
      'shoot you', 'shoot them', 'shoot him', 'shoot her',
      'stab you', 'stab them', 'stab him', 'stab her',
      'beat you to death', 'beat them to death', 'beat him to death', 'beat her to death',
      'strangle you', 'strangle them', 'strangle him', 'strangle her',
      'choke you', 'choke them', 'choke him', 'choke her',
      'burn you alive', 'burn them alive', 'burn him alive', 'burn her alive',
      'drown you', 'drown them', 'drown him', 'drown her',
      'poison you', 'poison them', 'poison him', 'poison her',
      'run you over', 'run them over', 'run him over', 'run her over',
      'hit you with', 'hit them with', 'hit him with', 'hit her with',
      'punch you in the face', 'punch them in the face', 'punch him in the face', 'punch her in the face',
      'break your neck', 'break their neck', 'break his neck', 'break her neck',
      'cut your throat', 'cut their throat', 'cut his throat', 'cut her throat',
      'slit your throat', 'slit their throat', 'slit his throat', 'slit her throat',
      'blow your head off', 'blow their head off', 'blow his head off', 'blow her head off',
      'put a bullet in you', 'put a bullet in them', 'put a bullet in him', 'put a bullet in her',
      'i will kill', 'i will murder', 'i will shoot', 'i will stab',
      'i will beat', 'i will strangle', 'i will choke', 'i will burn',
      'i will drown', 'i will poison', 'i will run over', 'i will hit',
      'i will punch', 'i will break', 'i will cut', 'i will slit',
      'i will blow', 'i will put a bullet',
      'going to kill', 'going to murder', 'going to shoot', 'going to stab',
      'going to beat', 'going to strangle', 'going to choke', 'going to burn',
      'going to drown', 'going to poison', 'going to run over', 'going to hit',
      'going to punch', 'going to break', 'going to cut', 'going to slit',
      'going to blow', 'going to put a bullet',
      'gonna kill', 'gonna murder', 'gonna shoot', 'gonna stab',
      'gonna beat', 'gonna strangle', 'gonna choke', 'gonna burn',
      'gonna drown', 'gonna poison', 'gonna run over', 'gonna hit',
      'gonna punch', 'gonna break', 'gonna cut', 'gonna slit',
      'gonna blow', 'gonna put a bullet'
    ];
    
    // Check for explicit violent threats
    const detectedKeywords = violentKeywords.filter(keyword => 
      lowerMessage.includes(keyword)
    );
    
    if (detectedKeywords.length > 0) {
      console.log(`🚨 Explicit violent threat detected: ${detectedKeywords.join(', ')}`);
      
      // Add strike to user
      const strikeResult = await addStrikeToUser(senderId, messageContent, {
        detectedKeywords,
        threatType: 'explicit_violent_language',
        severity: 'high'
      });
      
      return {
        isThreat: true,
        detectedKeywords,
        threatType: 'explicit_violent_language',
        severity: 'high',
        actionTaken: strikeResult.actionTaken,
        strikesRemaining: strikeResult.strikesRemaining,
        isBanned: strikeResult.isBanned
      };
    }
    
    // No threats detected
    return {
      isThreat: false,
      detectedKeywords: [],
      threatType: null,
      severity: null,
      actionTaken: null,
      strikesRemaining: null,
      isBanned: false
    };
    
  } catch (error) {
    console.error('❌ Error detecting violent threats:', error);
    // In case of error, allow the message to pass through
    return {
      isThreat: false,
      detectedKeywords: [],
      threatType: null,
      severity: null,
      actionTaken: null,
      strikesRemaining: null,
      isBanned: false
    };
  }
};

// Function to add strike to user and handle banning
export const addStrikeToUser = async (userId, violatingMessage, threatAnalysis) => {
  try {
    console.log(`⚠️ Adding strike to user ${userId}...`);
    
    // Get current user info and strikes
    const { data: userInfo, error: userError } = await supabase
      .from('users')
      .select('name, email, phone, strikes')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Error getting user info:', userError);
      throw userError;
    }

    const currentStrikes = userInfo.strikes || 0;
    const newStrikes = currentStrikes + 1;
    
    // Log the violation
    await logViolation(userId, userInfo, violatingMessage, threatAnalysis, newStrikes);
    
    // Update user's strike count
    const { error: updateError } = await supabase
      .from('users')
      .update({ strikes: newStrikes })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error updating strikes:', updateError);
      throw updateError;
    }

    console.log(`✅ Strike added to user ${userId}. Total strikes: ${newStrikes}`);

    // Check if user should be banned (3 strikes)
    if (newStrikes >= 3) {
      console.log(`🚫 User ${userId} has reached 3 strikes. Banning user...`);
      await banUser(userId, userInfo);
      
      return {
        actionTaken: 'User banned for 3 strikes',
        strikesRemaining: 0,
        isBanned: true
      };
    } else {
      const strikesRemaining = 3 - newStrikes;
      return {
        actionTaken: `Strike added (${newStrikes}/3)`,
        strikesRemaining,
        isBanned: false
      };
    }
    
  } catch (error) {
    console.error('❌ Error adding strike to user:', error);
    throw error;
  }
};

// Function to ban user after 3 strikes
const banUser = async (userId, userInfo) => {
  try {
    console.log(`🚫 Banning user ${userId}...`);
    
    // Add user to banned table first
    await addToBannedTable(userId, userInfo);
    
    // Update user's strikes to 3 (this indicates banned status)
    const { error: banError } = await supabase
      .from('users')
      .update({ 
        strikes: 3
      })
      .eq('id', userId);

    if (banError) {
      console.error('❌ Error banning user:', banError);
      throw banError;
    }

    // Delete user's messages
    await supabase
      .from('messages')
      .delete()
      .eq('sender_id', userId);

    // Delete user's chat rooms
    await supabase
      .from('chat_rooms')
      .delete()
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    // Delete user's likes
    await supabase
      .from('likes')
      .delete()
      .eq('id', userId);

    // Delete user's matches
    await supabase
      .from('matches')
      .delete()
      .eq('id', userId);

    // Delete user's photos from storage
    await deleteUserPhotos(userId);

    // Note: We cannot delete the auth account from client-side
    // This should be done server-side or through admin functions
    console.log(`⚠️ Note: Auth account deletion requires server-side implementation`);

    console.log(`✅ User ${userId} (${userInfo?.name || 'Unknown'}) banned successfully`);

    // Notify other users in chat rooms about the ban
    await notifyOtherUsers(userId, userInfo, 'banned');

  } catch (error) {
    console.error('❌ Error banning user:', error);
    throw error;
  }
};

// Function to add user to banned table
const addToBannedTable = async (userId, userInfo) => {
  try {
    await supabase
      .from('banned_users')
      .insert([{
        id: userId, // Use the user's ID as the primary key
        email: userInfo?.email || '',
        phone: userInfo?.phone || ''
      }]);
    
    console.log(`✅ User ${userId} added to banned users table`);
  } catch (error) {
    console.error('❌ Error adding user to banned table:', error);
    // Don't throw error here as it's not critical
  }
};

// Function to log violations for monitoring
const logViolation = async (userId, userInfo, message, threatAnalysis, strikeCount) => {
  try {
    await supabase
      .from('violations')
      .insert([{
        user_id: userId,
        user_name: userInfo?.name || 'Unknown',
        user_email: userInfo?.email || 'Unknown',
        violation_type: 'explicit_violent_language',
        message_content: message,
        threat_level: threatAnalysis.severity || 'high',
        reason: `Detected explicit violent language: ${threatAnalysis.detectedKeywords?.join(', ')}`,
        detected_keywords: threatAnalysis.detectedKeywords || [],
        strike_count: strikeCount,
        detected_at: new Date().toISOString(),
        action_taken: strikeCount >= 3 ? 'user_banned' : 'strike_added'
      }]);
  } catch (error) {
    console.error('❌ Error logging violation:', error);
    // Don't throw error here as it's not critical
  }
};

// Function to delete user's photos from storage
const deleteUserPhotos = async (userId) => {
  try {
    const { data: photos } = await supabase.storage
      .from('user-photos')
      .list(`${userId}/`);
    
    if (photos && photos.length > 0) {
      const photoPaths = photos.map(photo => `${userId}/${photo.name}`);
      await supabase.storage
        .from('user-photos')
        .remove(photoPaths);
    }
  } catch (error) {
    console.error('❌ Error deleting user photos:', error);
    // Don't throw error here as it's not critical
  }
};

// Function to notify other users about the violation/ban
const notifyOtherUsers = async (userId, userInfo, action = 'strike') => {
  try {
    // Get all chat rooms where the user was involved
    const { data: chatRooms } = await supabase
      .from('chat_rooms')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (chatRooms && chatRooms.length > 0) {
      const otherUserIds = chatRooms.map(room => 
        room.user1_id === userId ? room.user2_id : room.user1_id
      );

      // Send system messages to notify other users
      for (const otherUserId of otherUserIds) {
        try {
          const message = action === 'banned' 
            ? `⚠️ Safety Alert: The user you were chatting with has been banned for using explicit violent language. Your safety is our top priority.`
            : `⚠️ Safety Notice: The user you were chatting with has received a strike for using explicit violent language.`;
          
          // Create a system message in their chat
          await supabase
            .from('messages')
            .insert([{
              room_id: null, // Will be handled by the app
              sender_id: 'system',
              content: message,
              message_type: 'system',
              created_at: new Date().toISOString()
            }]);
        } catch (error) {
          console.error('❌ Error notifying user:', error);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error notifying other users:', error);
  }
};

// Function to check if a user is banned
export const isUserBanned = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('strikes')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('❌ Error checking user ban status:', error);
      return false; // Don't assume banned on error
    }
    
    if (!data) {
      console.log('⚠️ User not found in database, assuming not banned');
      return false; // Don't assume banned if user not found
    }
    
    const isBanned = data.strikes >= 3;
    console.log(`🔍 User ${userId} ban status: ${isBanned} (strikes: ${data.strikes})`);
    return isBanned;
  } catch (error) {
    console.error('❌ Exception checking user ban status:', error);
    return false; // Don't assume banned on exception
  }
};

// Function to get user's current strike count
export const getUserStrikes = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('strikes')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      return { strikes: 0 };
    }
    
    return {
      strikes: data.strikes || 0
    };
  } catch (error) {
    return { strikes: 0 };
  }
}; 