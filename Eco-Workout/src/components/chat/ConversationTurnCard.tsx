import { useState } from 'react';
import { ConversationTurn } from '../../types';
import { ExerciseCard } from '../workout/ExerciseCard';

interface ConversationTurnCardProps {
  turn: ConversationTurn;
  isLatest: boolean;
  isLoading?: boolean;
  onConfirm?: (exercises: any[]) => void;
  onRetry?: () => void;
}

export function ConversationTurnCard({ turn, isLatest, isLoading, onConfirm, onRetry }: ConversationTurnCardProps) {
  const [animatingCardIndex, setAnimatingCardIndex] = useState<number | null>(null);
  const [animationType, setAnimationType] = useState<'save' | 'delete'>('save');
  const userName = 'user';
  const aiName = 'Eco';

  const handleConfirm = () => {
    // Start save animation for topmost card only
    setAnimatingCardIndex(0);
    setAnimationType('save');
    
    // After animation, call parent callback
    setTimeout(() => {
      onConfirm?.(turn.workoutData || []);
      setAnimatingCardIndex(null); // Reset animation state
    }, 600);
  };

  const handleDelete = () => {
    // Start delete animation for topmost card only
    setAnimatingCardIndex(0);
    setAnimationType('delete');
    
    // After animation, call parent callback
    setTimeout(() => {
      onRetry?.();
      setAnimatingCardIndex(null); // Reset animation state
    }, 600);
  };

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
          {isLoading && isLatest ? 'Thinking...' : turn.response}
        </p>
      </div>
      
      {/* Exercise Cards */}
      {turn.workoutData && turn.workoutData.length > 0 && (
        <div className={`mt-4 ${isLatest ? 'relative h-40' : 'flex flex-col gap-2'}`}>
          {turn.workoutData.map((workout, index) => {
            const isStack = isLatest;
            const isAnimating = animatingCardIndex !== null && index === 0;
            
            return (
              <ExerciseCard
                key={index}
                {...workout}
                index={index}
                total={turn.workoutData?.length ?? 0}
                isStack={isStack}
                isLatest={isLatest}
                onConfirm={handleConfirm}
                onDelete={handleDelete}
                isAnimating={isAnimating}
                animationType={animationType}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
