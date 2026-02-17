import { Exercise } from '../../types';

export interface CardProps extends Exercise {
  index: number;
  total: number;
  isStack: boolean;
}

export const TILT_ANGLES = [0, 3, -3, 6, -6];

export function ExerciseCard(props: CardProps) {
  const rotation = TILT_ANGLES[props.index];
  const stackStyles = props.isStack ? {
    position: 'absolute' as const,
    zIndex: props.total - props.index,
    transform: `translateY(${props.index * 8}px) rotate(${rotation}deg)`,
    transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  } : {};

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200" style={stackStyles}>
      <span className="font-bold text-gray-800">Exercise Name: {props.exerciseName}</span>
      <div className="flex flex-row justify-left flex-wrap gap-2 mt-2">
        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
          <input 
            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm" 
            name='sets' 
            defaultValue={props.sets} 
            type="number" 
          />
          <span className="text-sm text-gray-600">Sets</span>
        </div>
        
        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
          <input 
            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm" 
            name='metricValue' 
            defaultValue={props.metricValue}
          />
          <select 
            name='metricType' 
            defaultValue={props.metricType}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value='reps'>Reps</option>
            <option value='distance'>Distance (km)</option>
            <option value='duration'>Duration (sec)</option>
          </select>
        </div>
        
        {props.weight && (
          <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
            <input 
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm" 
              name='weight' 
              defaultValue={props.weight} 
              type="number" 
            />
            <select 
              name='weightUnit' 
              defaultValue={props.weightUnit}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value='kg'>Kg</option>
              <option value='lbs'>lbs</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
