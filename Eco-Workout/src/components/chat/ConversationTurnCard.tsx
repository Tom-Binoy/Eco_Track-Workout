import { ConversationTurn } from '../../types';
import { ExerciseCard } from '../workout/ExerciseCard';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ConversationTurnCardProps {
  turn: ConversationTurn;
  isLatest: boolean;
  isLoading?: boolean;
}

export function ConversationTurnCard({ turn, isLatest, isLoading }: ConversationTurnCardProps) {
  const userName = 'user';
  const aiName = 'Eco';

  return (
    <div className="mb-8">
      {/* User Message */}
      <div className="flex flex-col gap-2 mb-4">
        <p className="font-medium text-gray-600">
          <span className="text-blue-600">{userName}:</span> {turn.user}
        </p>
      </div>
      
      {/* AI Response */}
      <div className="flex flex-col gap-2">
        <p className="font-medium text-gray-600">
          <span className="text-green-600">{aiName}:</span>{' '}
          {isLoading && isLatest ? <LoadingSpinner /> : turn.response}
        </p>
      </div>
      
      {/* Exercise Cards */}
      {turn.workoutData && turn.workoutData.length > 0 && (
        <div className={`mt-4 ${isLatest ? 'relative h-40' : 'flex flex-col gap-2'}`}>
          {turn.workoutData.map((workout, index) => {
            const isStack = isLatest;
            return (
              <ExerciseCard
                key={index}
                {...workout}
                index={index}
                total={turn.workoutData?.length ?? 0}
                isStack={isStack}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
