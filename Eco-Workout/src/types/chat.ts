import { Exercise } from './workout';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  workoutData?: Exercise[];
  workoutId?: string;
}

export interface ChatSession {
  _id: string;
  userId: string;
  chatStart?: number;
  chatLast: number;
  messages: ChatMessage[];
  summary?: string;
}
