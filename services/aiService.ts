import { Chore } from '@/types/database';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function askMoneyMentor(
  messages: ChatMessage[],
  childName: string,
  totalBalance: number,
  chores: Chore[]
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API Key is missing. Please add it to your .env file.');
  }

  // Build the system prompt context dynamically
  const pendingChores = chores.filter(c => c.status === 'assigned');
  
  const systemPrompt: ChatMessage = {
    role: 'system',
    content: `You are the FamFi "Money Mentor", a fun, friendly, and super encouraging robotic financial advisor for children! 
Your job is to teach kids about saving, spending wisely, and earning money through chores. Keep responses very short (2-3 sentences), incredibly easy to read, age-appropriate, and use lots of fun emojis!

Here is the secure live data for the child you are talking to:
- Child's Name: ${childName}
- Total Savings Balance: $${totalBalance.toFixed(2)}
- Available Chores to Earn Money: ${pendingChores.length > 0 ? pendingChores.map(c => `"${c.title}" (Earn $${c.value.toFixed(2)})`).join(', ') : 'No chores available right now.'}

Use this data to give them personalized advice. If they ask how to afford a goal, read their current balance and accurately tell them how many available chores they need to do to reach it!`
  };

  const payload = {
    model: 'gpt-4o-mini',
    messages: [systemPrompt, ...messages],
    temperature: 0.7,
    max_tokens: 250,
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch response');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    console.error('AI Service Error:', error);
    throw new Error(error.message || 'Error connecting to the Money Mentor.');
  }
}
