import { ConversationTurn } from '../../types';
import { ConversationTurnCard } from './ConversationTurnCard';

interface ChatContainerProps {
  turns: ConversationTurn[];
  isLoading?: boolean;
  onWorkoutConfirm?: (exercises: any[]) => void;
  onWorkoutRetry?: () => void;
}

export function ChatContainer({ turns, isLoading, onWorkoutConfirm, onWorkoutRetry }: ChatContainerProps) {
  const handleConfirm = (exercises: any[]) => {
    // TODO: Save to Convex when API is available
    console.log('Saving workout:', exercises);
    onWorkoutConfirm?.(exercises);
  };

  const handleRetry = () => {
    // TODO: Clear workout data and reset input
    console.log('Retrying workout input');
    onWorkoutRetry?.();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-lg">
      {turns.map((turn, index) => (
        <ConversationTurnCard
          key={turn.id}
          turn={turn}
          isLatest={index === turns.length - 1}
          isLoading={isLoading}
          onConfirm={handleConfirm}
          onRetry={handleRetry}
        />
      ))}
      {turns.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          <p className="text-lg mb-2">Welcome to Eco Track! 💪</p>
          <p>Tell me about your workout and I'll help you log it.</p>
        </div>
      )}
    </div>
  );
}
