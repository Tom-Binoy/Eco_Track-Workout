import { useState } from 'react';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ConversationTurn } from '../types';
import { parseGeminiJSON, formatAiOutput } from '../lib/ai/parser';

export function useChat() {
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [chatId, setChatId] = useState<string | undefined>();
  
  const callGeminiAction = useAction(api.myFunctions.callGemniniAPI);
  const updateSession = useMutation(api.myFunctions.updateSession);

  const sendMessage = async (userInput: string): Promise<void> => {
    if (userInput.trim() === '') return;

    setIsLoading(true);
    setInput('');

    try {
      const response = await callGeminiAction({ userInput });
      const parsedResponse = parseGeminiJSON(response);
      
      const newTurn: ConversationTurn = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        user: userInput,
        response: parsedResponse.message,
        workoutData: parsedResponse.action === 'log_workouts' ? formatAiOutput(parsedResponse) : undefined
      };

      const updatedTurns = [...turns, newTurn];
      setTurns(updatedTurns);
      
      // Update chat session in Convex
      if (!chatId) {
        const newChatId = await updateSession({ turns: updatedTurns });
        setChatId(newChatId || undefined);
      } else {
        await updateSession({ chatId: chatId as any, turns: updatedTurns });
      }
      
    } catch (error) {
      console.error("Convex Action Error:", error);
      const errorTurn: ConversationTurn = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        user: userInput,
        response: 'Sorry, I encountered an error. Please try again.',
      };
      
      setTurns(prev => [...prev, errorTurn]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearTurns = (): void => {
    setTurns([]);
    setChatId(undefined);
  };

  return {
    turns,
    isLoading,
    input,
    setInput,
    sendMessage,
    clearTurns
  };
}
