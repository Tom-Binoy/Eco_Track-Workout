import { ChatMessage } from '../../types';
import { ExerciseCard } from '../workout/ExerciseCard';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ChatMessageProps {
  message: ChatMessage;
  isLatest: boolean;
  isLoading?: boolean;
}

export function ChatMessageComponent({ message, isLatest, isLoading }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const userName = 'user';
  const aiName = 'Eco';

  return (
    <div className="mb-8">
      <div className="flex flex-col gap-2">
        <p className="font-medium text-gray-600">
          <span className="text-blue-600">{userName}:</span> {message.content}
        </p>
        {!isUser && (
          <div className="font-medium text-gray-600">
            <span className="text-green-600">{aiName}:</span>{' '}
            {isLoading ? <LoadingSpinner /> : message.content}
          </div>
        )}
      </div>
      
      {/* Exercise Cards */}
      {message.workoutData && message.workoutData.length > 0 && (
        <div className={`mt-4 ${isLatest ? 'relative h-40' : 'flex flex-col gap-2'}`}>
          {message.workoutData.map((workout, index) => {
            const isStack = isLatest;
            return (
              <ExerciseCard
                key={index}
                {...workout}
                index={index}
                total={message.workoutData?.length ?? 0}
                isStack={isStack}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
