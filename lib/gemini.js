const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

export const promptGemini = async (prompt) => {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_KEY;
    
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('Gemini API key not configured. Please add your API key to the .env file.');
    }

    console.log('🔑 Using Gemini API key:', apiKey.substring(0, 10) + '...');

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    console.log('📤 Sending request to Gemini API...');
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Gemini API error response:', errorData);
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('📋 Raw Gemini response data:', JSON.stringify(data, null, 2));
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      console.log('✅ Extracted text from Gemini response:', text);
      return text;
    } else {
      console.error('❌ Invalid response format from Gemini API:', data);
      throw new Error('Invalid response format from Gemini API - no content found');
    }
  } catch (error) {
    console.error('❌ Error generating content with Gemini:', error);
    throw error;
  }
}
