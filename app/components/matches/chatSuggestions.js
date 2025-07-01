import { promptGemini } from '../../../lib/gemini.js';
import { getUserProfileData } from '../../../lib/supabase.js';

// Function to generate chat suggestions using Gemini AI
export const generateChatSuggestions = async (currentUserId, matchUserId, recentMessages = [], suggestionType = 'general') => {
  try {
    console.log('🤖 Generating chat suggestions with Gemini AI...');
    
    // Get both users' profile data
    const [currentUserProfile, matchUserProfile] = await Promise.all([
      getUserProfileData(currentUserId),
      getUserProfileData(matchUserId)
    ]);

    // Prepare conversation context (last 5 messages)
    const conversationContext = recentMessages
      .slice(-5)
      .map(msg => `${msg.sender_name}: ${msg.content}`)
      .join('\n');

    // Create a comprehensive prompt for Gemini
    const prompt = createSuggestionPrompt(
      currentUserProfile,
      matchUserProfile,
      conversationContext,
      suggestionType
    );

    // Get suggestions from Gemini
    const response = await promptGemini(prompt);
    
    // Parse the response to extract suggestions
    const suggestions = parseSuggestions(response);
    
    console.log(`✅ Generated ${suggestions.length} chat suggestions`);
    return suggestions;
    
  } catch (error) {
    console.error('❌ Error generating chat suggestions:', error);
    // Return fallback suggestions if Gemini fails
    return getFallbackSuggestions(suggestionType);
  }
};

// Function to create a comprehensive prompt for Gemini
const createSuggestionPrompt = (currentUser, matchUser, conversationContext, suggestionType) => {
  const currentUserInterests = currentUser.interests.join(', ') || 'No specific interests listed';
  const matchUserInterests = matchUser.interests.join(', ') || 'No specific interests listed';
  
  const sharedInterests = currentUser.interests.filter(interest => 
    matchUser.interests.includes(interest)
  );
  
  const sharedInterestsText = sharedInterests.length > 0 
    ? `Shared interests: ${sharedInterests.join(', ')}`
    : 'No shared interests identified';

  let contextPrompt = '';
  if (conversationContext) {
    contextPrompt = `
Recent conversation context:
${conversationContext}

Based on this conversation context, `;
  }

  let typeSpecificPrompt = '';
  switch (suggestionType) {
    case 'opener':
      typeSpecificPrompt = `generate 3 engaging conversation starters that are:
- Personalized based on their interests and bio
- Natural and not overly formal
- Designed to spark meaningful conversation
- Respectful and appropriate for a dating app context`;
      break;
    case 'question':
      typeSpecificPrompt = `generate 3 thoughtful questions that are:
- Based on their interests, bio, or shared interests
- Designed to learn more about them
- Open-ended to encourage detailed responses
- Appropriate for getting to know someone better`;
      break;
    case 'response':
      typeSpecificPrompt = `generate 3 potential responses that are:
- Engaging and show genuine interest
- Based on the conversation context
- Natural and conversational in tone
- Designed to keep the conversation flowing`;
      break;
    case 'activity':
      typeSpecificPrompt = `generate 3 activity or date suggestions that are:
- Based on shared interests or their individual interests
- Realistic and achievable
- Creative and fun
- Designed to move the conversation toward meeting in person`;
      break;
    default:
      typeSpecificPrompt = `generate 3 engaging message suggestions that are:
- Personalized based on their interests and bio
- Natural and conversational
- Designed to spark meaningful conversation
- Appropriate for the current stage of conversation`;
  }

  return `You are an AI assistant helping someone write engaging messages on a dating app. 

Current user profile:
- Name: ${currentUser.name}
- Bio: ${currentUser.bio || 'No bio provided'}
- Interests: ${currentUserInterests}

Match's profile:
- Name: ${matchUser.name}
- Bio: ${matchUser.bio || 'No bio provided'}
- Interests: ${matchUserInterests}
- ${sharedInterestsText}

${contextPrompt}${typeSpecificPrompt}

Please provide exactly 3 suggestions in this format:
1. [First suggestion]
2. [Second suggestion]
3. [Third suggestion]

Make sure each suggestion is:
- Under 100 characters
- Natural and conversational
- Personalized to their interests or bio
- Appropriate for a dating app context
- Not generic or overly formal`;
};

// Function to parse Gemini's response into structured suggestions
const parseSuggestions = (response) => {
  try {
    // Extract numbered suggestions from the response
    const lines = response.split('\n').filter(line => line.trim());
    const suggestions = [];
    
    for (const line of lines) {
      // Look for numbered suggestions (1., 2., 3.)
      const match = line.match(/^\d+\.\s*(.+)$/);
      if (match && match[1].trim()) {
        suggestions.push(match[1].trim());
      }
    }
    
    // If we couldn't parse numbered suggestions, try to extract any meaningful text
    if (suggestions.length === 0) {
      const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
      suggestions.push(...sentences.slice(0, 3).map(s => s.trim()));
    }
    
    return suggestions.slice(0, 3); // Ensure we only return 3 suggestions
  } catch (error) {
    console.error('❌ Error parsing suggestions:', error);
    return getFallbackSuggestions('general');
  }
};

// Fallback suggestions if Gemini fails
const getFallbackSuggestions = (suggestionType) => {
  const fallbackSuggestions = {
    opener: [
      "Hey! I loved your profile - what's your favorite way to spend a weekend?",
      "Hi there! I noticed we both love [interest] - what got you into that?",
      "Hey! Your bio caught my attention - what's the story behind that?"
    ],
    question: [
      "What's something you're passionate about that most people don't know?",
      "If you could travel anywhere right now, where would you go?",
      "What's the best book or movie you've experienced recently?"
    ],
    response: [
      "That sounds amazing! I'd love to hear more about that.",
      "Wow, that's really interesting! How did you get into that?",
      "That's awesome! I can totally relate to that."
    ],
    activity: [
      "We should grab coffee sometime and chat more about [shared interest]!",
      "I'd love to explore [activity] together - what do you think?",
      "We could check out that new [place/activity] - interested?"
    ],
    general: [
      "Hey! How's your day going?",
      "I'd love to get to know you better!",
      "What's something exciting you're looking forward to?"
    ]
  };
  
  return fallbackSuggestions[suggestionType] || fallbackSuggestions.general;
};

// Function to get suggestion categories based on conversation context
export const getSuggestionCategories = (messageCount, hasSharedInterests) => {
  const categories = [];
  
  if (messageCount === 0) {
    categories.push('opener');
  } else if (messageCount < 5) {
    categories.push('question', 'response');
  } else {
    categories.push('response', 'activity');
  }
  
  if (hasSharedInterests) {
    categories.push('activity');
  }
  
  return [...new Set(categories)]; // Remove duplicates
}; 