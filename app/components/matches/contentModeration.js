import { supabase } from '../../../lib/supabase.js';

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
      .from('user')
      .select('email, phone, strikes, banned')
      .eq('id', userId)
      .single();

    // Get user personal info
    const { data: userPersonal, error: personalError } = await supabase
      .from('personal')
      .select('name')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Error getting user info:', userError);
      throw userError;
    }

    if (personalError) {
      console.error('❌ Error getting user personal data:', personalError);
      throw personalError;
    }

    // Combine user info with personal info
    const combinedUserInfo = {
      ...userInfo,
      name: userPersonal?.name || 'Unknown User'
    };

    if (userError) {
      console.error('❌ Error getting user info:', userError);
      throw userError;
    }

    // Check if user is already banned
    if (combinedUserInfo.banned) {
      console.log(`🚫 User ${userId} is already banned`);
      return {
        actionTaken: 'User already banned',
        strikesRemaining: 0,
        isBanned: true
      };
    }

    const currentStrikes = combinedUserInfo.strikes || 0;
    const newStrikes = currentStrikes + 1;
    
    // Log the violation
    await logViolation(userId, combinedUserInfo, violatingMessage, threatAnalysis, newStrikes);
    
    // Check if user should be banned (3 strikes)
    if (newStrikes >= 3) {
      console.log(`🚫 User ${userId} has reached 3 strikes. Banning user...`);
      
      // Update user's strikes and ban status
      const { error: updateError } = await supabase
        .from('user')
        .update({ 
          strikes: newStrikes,
          banned: true
        })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Error banning user:', updateError);
        throw updateError;
      }

      // Perform additional ban actions
      await banUser(userId, combinedUserInfo);
      
      return {
        actionTaken: 'User banned for 3 strikes',
        strikesRemaining: 0,
        isBanned: true
      };
    } else {
      // Just update strikes
      const { error: updateError } = await supabase
        .from('user')
        .update({ strikes: newStrikes })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Error updating strikes:', updateError);
        throw updateError;
      }

      console.log(`✅ Strike added to user ${userId}. Total strikes: ${newStrikes}`);
      
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
    
    // Note: In new schema, messages are stored within matches arrays
    // Messages will be cleared when the user is banned and matches are deactivated
    console.log('✅ Messages will be cleared when user is banned and matches are deactivated');

    // Note: In new schema, likes and matches are stored in separate tables
    // We need to delete the user's records from like, match, and message tables
    // and their profile will be deleted when the user is banned

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
      .from('banned')
      .insert([{
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
// Note: violations table doesn't exist in schema, so we'll just log to console
const logViolation = async (userId, userInfo, message, threatAnalysis, strikeCount) => {
  try {
    console.log('🚨 Violation logged:', {
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
    });
  } catch (error) {
    console.error('❌ Error logging violation:', error);
    // Don't throw error here as it's not critical
  }
};

// Function to delete user's photos from storage
const deleteUserPhotos = async (userId) => {
  try {
    const { data: photos } = await supabase.storage
      .from('users')
      .list(`${userId}/`);
    
    if (photos && photos.length > 0) {
      const photoPaths = photos.map(photo => `${userId}/${photo.name}`);
      await supabase.storage
        .from('users')
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
    // Get all matches to find those who have matches with the banned user
    const { data: allMatches } = await supabase
      .from('match')
      .select('user_1_id, user_2_id');
    
    // Find users who have matches with the banned user
    const affectedUsers = allMatches.filter(match => 
      match.user_1_id === userId || match.user_2_id === userId
    );
    
    const otherUserIds = affectedUsers.map(match => 
      match.user_1_id === userId ? match.user_2_id : match.user_1_id
    );

      // Send system messages to notify other users
      for (const otherUserId of otherUserIds) {
        try {
          const message = action === 'banned' 
            ? `⚠️ Safety Alert: The user you were chatting with has been banned for using explicit violent language. Your safety is our top priority.`
            : `⚠️ Safety Notice: The user you were chatting with has received a strike for using explicit violent language.`;
          
          // In new schema, we need to add system messages to the user's matches
          // Get the user's matches
          const { data: userMatches, error: userError } = await supabase
            .from('match')
            .select('id')
            .or(`user_1_id.eq.${otherUserId},user_2_id.eq.${otherUserId}`);

          if (!userError && userMatches) {
            // Add system message to all matches
            for (const match of userMatches) {
              const systemMessage = {
                match_id: match.id,
                sender_id: 'system', // System messages use 'system' as sender ID
                receiver_id: otherUserId,
                content: message,
                read: false,
                created_at: new Date().toISOString()
              };
              
              await supabase
                .from('message')
                .insert([systemMessage]);
            }
          }
        } catch (error) {
          console.error('❌ Error notifying user:', error);
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
      .from('user')
      .select('banned, strikes')
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
    
    // Use the dedicated banned field, but also check strikes as fallback
    const isBanned = data.banned || data.strikes >= 3;
    console.log(`🔍 User ${userId} ban status: ${isBanned} (banned: ${data.banned}, strikes: ${data.strikes})`);
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
      .from('user')
      .select('strikes, banned')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      return { strikes: 0, banned: false };
    }
    
    return {
      strikes: data.strikes || 0,
      banned: data.banned || false
    };
  } catch (error) {
    return { strikes: 0, banned: false };
  }
};

// Default export
export default detectViolentThreats; 