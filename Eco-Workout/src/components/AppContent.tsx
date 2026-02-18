import { useChat } from '../hooks/useChat';
import { ChatContainer } from './chat/ChatContainer';
import { ChatInput } from './chat/ChatInput';

export function AppContent() {
  const { turns, isLoading, sendMessage } = useChat();

  const handleSendMessage = async (message: string) => {
    await sendMessage(message);
  };

  const handleWorkoutConfirm = (exercises: any[]) => {
    // TODO: Save to Convex when API is available
    console.log('AppContent: Confirming workout', exercises);
    // This will eventually call the Convex mutation to save the workout
  };

  const handleWorkoutRetry = () => {
    // TODO: Clear the latest workout data and reset input
    console.log('AppContent: Retrying workout');
    // This will eventually clear the latest turn and reset the chat input
  };

  return (
    <div className="flex flex-col h-screen max-h-[800px]">
      <ChatContainer 
        turns={turns} 
        isLoading={isLoading}
        onWorkoutConfirm={handleWorkoutConfirm}
        onWorkoutRetry={handleWorkoutRetry}
      />
      <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
