// ─── Core exercise/card types ──────────────────────────────────
export type MetricType = 'reps' | 'duration' | 'distance';
export type WeightUnit = 'kg' | 'lbs';

export interface Exercise {
  exerciseName: string;
  sets: number;
  metricType: MetricType;
  metricValue: number;
  weight?: number;
  weightUnit?: WeightUnit;
}

// A Card is an Exercise that lives inside a chat message
// before (and after) it's saved to the workouts table.
// id is a local number assigned when the AI parses exercises.
export interface Card extends Exercise {
  id: number;
  state: 'pending' | 'confirmed' | 'discarded';
}

// ─── Message type ──────────────────────────────────────────────
// One Message = one full round trip (user says something, Eco replies).
export interface Message {
  id: string;       // Convex _id once saved; temp string before save
  user: string;     // What the user said
  eco: string;      // What Eco replied
  cards?: Card[];   // Parsed exercises — only present if action === 'log_workouts'
  state: 'pending' | 'confirmed' | 'editing';
}

// ─── AI response shape (what Gemini returns as JSON) ───────────
export interface AIResponse {
  action: 'log_workouts' | 'chat_response';
  message: string;
  data: Exercise[] | null;
}
