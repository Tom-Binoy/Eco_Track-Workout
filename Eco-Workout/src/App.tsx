import ChatUI from './ChatUI';
import { useEcoChat } from './hooks/useEcoChat';

export default function App() {
  const chat = useEcoChat();

  return (
    <ChatUI
      chain={chat.chain}
      isTyping={chat.isTyping}
      isLoading={chat.isLoading}
      onSend={chat.sendMessage}
      onEdit={chat.editMessage}
      onRegenerate={chat.regenerateMessage}
      onStop={chat.stop}
      onSetActiveBranch={chat.setActiveBranch}
      onLike={chat.updateLikes}
      onConfirmCard={chat.confirmCard}
      onDiscardCard={chat.discardCard}
    />
  );
}
