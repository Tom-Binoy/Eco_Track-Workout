import { Exercise } from '../../types';

export interface AIResponse {
  action: 'log_workouts' | 'chat_response';
  data: Exercise[] | null;
  message: string;
}

export function parseGeminiJSON(text: string): AIResponse {
  try {
    let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Parse error. Raw text:", text);
    return {
      action: 'chat_response',
      data: null,
      message: text
    };
  }
}

export function formatAiOutput(rawAiOutput: any): Exercise[] {
  const rawData = rawAiOutput.data;
  const dataAsArray = Array.isArray(rawData) ? rawData : rawData ? [rawData] : [];
  
  return dataAsArray.map((item: any) => ({
    exerciseName: item.exerciseName,
    sets: item.sets,
    metricType: item.metricType,
    metricValue: item.metricValue,
    weight: item.weight,
    weightUnit: item.weightUnit,
    status: 'pending' as const
  }));
}
