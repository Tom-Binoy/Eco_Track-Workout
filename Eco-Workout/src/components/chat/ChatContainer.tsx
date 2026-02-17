import { ConversationTurn } from '../../types';
import { ConversationTurnCard } from './ConversationTurnCard';

interface ChatContainerProps {
  turns: ConversationTurn[];
  isLoading?: boolean;
}

export function ChatContainer({ turns, isLoading }: ChatContainerProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-lg">
      {turns.map((turn, index) => (
        <ConversationTurnCard
          key={turn.id}
          turn={turn}
          isLatest={index === turns.length - 1}
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
