import { ChatMessage } from '../../types';
import { ChatMessageComponent } from './ChatMessage';

interface ChatContainerProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

export function ChatContainer({ messages, isLoading }: ChatContainerProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-lg">
      {messages.map((message, index) => (
        <ChatMessageComponent
          key={message.id}
          message={message}
          isLatest={index === messages.length - 1}
          isLoading={isLoading && index === messages.length - 1}
        />
      ))}
      {messages.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          <p className="text-lg mb-2">Welcome to Eco Track! 💪</p>
          <p>Tell me about your workout and I'll help you log it.</p>
        </div>
      )}
    </div>
  );
}
