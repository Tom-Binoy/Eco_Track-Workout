import ChatUI from './ChatUI';
import { useEcoChat } from './hooks/useEcoChat';

// App.tsx is intentionally tiny.
// All logic lives in useEcoChat.
// All visuals live in ChatUI.
export default function App() {
  const chat = useEcoChat();

  return (
    <ChatUI
      messages={chat.messages}
      isTyping={chat.isTyping}
      isLoading={chat.isLoading}
      onSend={chat.sendMessage}
      onConfirmCard={chat.confirmCard}
      onDiscardCard={chat.discardCard}
    />
  );
}
