import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Exercise } from '../types';

export function useWorkouts() {
  const workouts = useQuery(api.myFunctions.listNumbers, { count: 30 });
  const addWorkout = useMutation(api.myFunctions.addWorkout);

  const saveWorkout = async (exercises: Exercise[]): Promise<string> => {
    try {
      const workoutId = await addWorkout({ data: exercises });
      return workoutId;
    } catch (error) {
      console.error("Save failed:", error);
      throw error;
    }
  };

  const formatWorkoutData = (rawData: any): Exercise[] => {
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
  };

  return {
    workouts,
    saveWorkout,
    formatWorkoutData,
    isLoading: workouts === undefined
  };
}
