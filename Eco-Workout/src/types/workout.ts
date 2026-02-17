export interface Exercise {
  exerciseName: string;
  sets: number;
  metricType: 'reps' | 'duration' | 'distance';
  metricValue: number;
  weight?: number;
  weightUnit?: 'kg' | 'lbs';
  status: 'pending' | 'editing' | 'confirmed';
}

export interface WorkoutEntry {
  _id: string;
  userId: string;
  createdAt: number;
  exercises: Exercise[];
  rawInput: string;
  aiResponse: string;
}
