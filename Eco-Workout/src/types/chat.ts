import { Exercise } from './workout';

export interface ConversationTurn {
  id: string;
  timestamp: number;
  user: string;           // User's message
  response: string;       // AI's response
  workoutData?: Exercise[];     // Parsed workout data (if applicable)
}

export interface ChatSession {
  _id: string;
  userId: string;
  chatStart?: number;
  chatLast: number;
  turns: ConversationTurn[];
  summary?: string;
}

// Keep for backward compatibility during transition
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  workoutData?: Exercise[];
  workoutId?: string;
}
