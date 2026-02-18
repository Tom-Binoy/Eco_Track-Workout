import { useState } from 'react';
import { ConversationTurn } from '../../types';
import { ExerciseCard } from '../workout/ExerciseCard';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ConversationTurnCardProps {
  turn: ConversationTurn;
  isLatest: boolean;
  isLoading?: boolean;
  onConfirm?: (exercises: any[]) => void;
  onRetry?: () => void;
}

export function ConversationTurnCard({ turn, isLatest, isLoading, onConfirm, onRetry }: ConversationTurnCardProps) {
  const [isSaving, setIsSaving] = useState(false);
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
          
          {/* Confirm/Cancel Buttons - Only show for latest turn with workout data */}
          {isLatest && (
            <div className="flex flex-col md:flex-row gap-3 mt-6">
              <button
                onClick={() => {
                  setIsSaving(true);
                  onConfirm?.(turn.workoutData || []);
                }}
                disabled={isSaving}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[48px]"
              >
                {isSaving ? (
                  <>
                    <LoadingSpinner />
                    Saving...
                  </>
                ) : (
                  <>
                    Looks Good 💪
                  </>
                )}
              </button>
              
              <button
                onClick={() => onRetry?.()}
                disabled={isSaving}
                className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-medium px-6 py-3 rounded-lg transition-colors min-h-[48px]"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
