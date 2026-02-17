import { useState } from 'react';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ChatMessage } from '../types';
import { parseGeminiJSON, formatAiOutput } from '../lib/ai/parser';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  
  const callGeminiAction = useAction(api.myFunctions.callGemniniAPI);
  const updateSession = useMutation(api.myFunctions.updateSession);

  const sendMessage = async (userInput: string): Promise<void> => {
    if (userInput.trim() === '') return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: Date.now()
    };

    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'Eco is thinking...',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await callGeminiAction({ userInput });
      const parsedResponse = parseGeminiJSON(response);
      
      let assistantMessage: ChatMessage;

      if (parsedResponse.action === 'log_workouts') {
        const workoutData = formatAiOutput(parsedResponse);
        assistantMessage = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: parsedResponse.message,
          timestamp: Date.now(),
          workoutData
        };
      } else {
        assistantMessage = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: parsedResponse.message,
          timestamp: Date.now()
        };
      }

      setMessages(prev => [...prev.slice(0, -1), assistantMessage]);
      
      // Update chat session in Convex
      await updateSession({ messages: [...messages, userMessage, assistantMessage] });
      
    } catch (error) {
      console.error("Convex Action Error:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = (): void => {
    setMessages([]);
  };

  return {
    messages,
    isLoading,
    input,
    setInput,
    sendMessage,
    clearMessages
  };
}
