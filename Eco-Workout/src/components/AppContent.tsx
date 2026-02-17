import { useChat } from '../hooks/useChat';
import { ChatContainer } from './chat/ChatContainer';
import { ChatInput } from './chat/ChatInput';

export function AppContent() {
  const { turns, isLoading, sendMessage } = useChat();

  const handleSendMessage = async (message: string) => {
    await sendMessage(message);
  };

  return (
    <div className="flex flex-col h-screen max-h-[800px]">
      <ChatContainer turns={turns} isLoading={isLoading} />
      <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
