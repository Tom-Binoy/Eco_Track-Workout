import { useState, useEffect, useMemo } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Message, Card, AIResponse, Exercise } from '../types';

// ── Auth placeholder (Week 3: replace with real user ID) ───────
const FAKE_USER_ID = 'user_01';

// ── Helpers ────────────────────────────────────────────────────

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]; // "2026-02-28"
}

function parseGeminiJSON(text: string): AIResponse {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { action: 'chat_response', message: text, data: null };
  }
}

// Builds the context string sent to Gemini alongside the user's message.
// Format: all summaries (oldest first) + last 5 raw message pairs.
function buildContext(
  summaries: Array<{ content: string }>,
  recentMessages: Message[]
): string {
  let context = '';

  if (summaries.length > 0) {
    context += 'Session summaries (oldest first):\n';
    context += summaries.map(s => s.content).join('\n---\n');
    context += '\n\n';
  }

  const last5 = recentMessages.slice(-5);
  if (last5.length > 0) {
    context += 'Recent conversation:\n';
    context += last5
      .map(m => `User: ${m.user}\nEco: ${m.eco}`)
      .join('\n\n');
  }

  return context;
}

// ══════════════════════════════════════════════════════════════
// THE HOOK
// ══════════════════════════════════════════════════════════════

export function useEcoChat() {
  // ── Local state ──────────────────────────────────────────────
  const [chatId, setChatId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // ── Convex mutations & actions ───────────────────────────────
  const getOrCreateChat  = useMutation(api.myFunctions.getOrCreateTodayChat);
  const saveMessageMut   = useMutation(api.myFunctions.saveMessage);
  const updateMessageMut = useMutation(api.myFunctions.updateMessage);
  const addWorkoutMut    = useMutation(api.myFunctions.addWorkout);
  const callGemini       = useAction(api.myFunctions.callGemniniAPI);
  const generateSummary  = useAction(api.myFunctions.generateSummary);

  // ── Convex queries (reactive — auto-update when DB changes) ──
  const rawMessages  = useQuery(
    api.myFunctions.getMessages,
    chatId ? { chatId: chatId as any } : 'skip'
  );
  const rawSummaries = useQuery(
    api.myFunctions.getSummaries,
    chatId ? { chatId: chatId as any } : 'skip'
  );

  // ── On mount: get or create today's chat ─────────────────────
  useEffect(() => {
    getOrCreateChat({ userId: FAKE_USER_ID, date: getTodayDate() })
      .then(id => setChatId(id as string));
  }, []);

  // ── Transform raw Convex docs → our Message type ─────────────
  const messages: Message[] = useMemo(() => {
    if (!rawMessages) return [];
    return rawMessages.map(m => ({
      id: m._id as string,
      user: m.userText,
      eco: m.ecoText,
      cards: m.cards as Card[] | undefined,
      state: m.state as Message['state'],
    }));
  }, [rawMessages]);

  // ── Summary trigger ──────────────────────────────────────────
  // Every time the message count hits a multiple of 10,
  // summarise the oldest 5 messages from that batch.
  // Fire-and-forget: runs in the background, doesn't block the user.
  useEffect(() => {
    if (!rawMessages || !chatId) return;
    const count = rawMessages.length;
    if (count > 0 && count % 10 === 0) {
      const toSummarise = rawMessages
        .slice(count - 10, count - 5) // oldest 5 from the last batch
        .map(m => ({ userText: m.userText, ecoText: m.ecoText }));

      generateSummary({
        chatId: chatId as any,
        userId: FAKE_USER_ID,
        messagesToSummarise: toSummarise,
      }).catch(err => console.error('Summary generation failed:', err));
    }
  }, [rawMessages?.length]);

  // ════════════════════════════════════════════════════════════
  // sendMessage — called by ChatUI when user submits text
  // ════════════════════════════════════════════════════════════
  const sendMessage = async (userText: string): Promise<void> => {
    if (!chatId || !userText.trim()) return;

    setIsTyping(true);

    try {
      // 1. Build context from summaries + last 5 messages
      const context = buildContext(rawSummaries ?? [], messages);

      // 2. Call Gemini
      const raw = await callGemini({ userInput: userText, context });
      const parsed = parseGeminiJSON(raw);

      // 3. Build cards if the AI parsed exercises
      let cards: Card[] | undefined;
      if (parsed.action === 'log_workouts' && parsed.data) {
        cards = parsed.data.map((ex: Exercise, i: number) => ({
          ...ex,
          id: Date.now() + i,
          state: 'pending' as const,
        }));
      }

      // 4. Save message to DB
      await saveMessageMut({
        chatId: chatId as any,
        userId: FAKE_USER_ID,
        userText,
        ecoText: parsed.message,
        cards: cards ?? [],
        state: 'pending',
        timestamp: Date.now(),
      });

      // rawMessages query auto-updates via Convex real-time subscription.
      // No need to manually update local state.

    } catch (error) {
      console.error('sendMessage error:', error);
      // Save an error message so the user sees something
      await saveMessageMut({
        chatId: chatId as any,
        userId: FAKE_USER_ID,
        userText,
        ecoText: "Sorry, something went wrong. Try again?",
        state: 'pending',
        timestamp: Date.now(),
      });
    } finally {
      setIsTyping(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // confirmCard — user taps "Confirm ✓" on a card
  // Saves the exercise to DB immediately, marks card confirmed.
  // ════════════════════════════════════════════════════════════
  const confirmCard = async (
    messageId: string,
    cardId: number,
    data: Partial<Card>  // may include edits the user made in the modal
  ): Promise<void> => {
    // Find the message in the raw Convex docs (need the _id for patch)
    const rawMsg = rawMessages?.find(m => m._id === messageId);
    if (!rawMsg) return;

    // 1. Update card state in the messages table
    const updatedCards = (rawMsg.cards as Card[] ?? []).map(c =>
      c.id === cardId ? { ...c, ...data, state: 'confirmed' as const } : c
    );
    const allDone = updatedCards.every(c => c.state !== 'pending');

    await updateMessageMut({
      messageId: messageId as any,
      cards: updatedCards,
      state: allDone ? 'confirmed' : 'pending',
    });

    // 2. Save the confirmed exercise to the workouts table
    const confirmedCard = updatedCards.find(c => c.id === cardId);
    if (confirmedCard) {
      const { id: _id, state: _state, ...exercise } = confirmedCard;
      await addWorkoutMut({ data: [exercise] });
    }
  };

  // ════════════════════════════════════════════════════════════
  // discardCard — user taps "Discard" on a card
  // Marks as discarded. Does NOT save to workouts table.
  // ════════════════════════════════════════════════════════════
  const discardCard = async (
    messageId: string,
    cardId: number
  ): Promise<void> => {
    const rawMsg = rawMessages?.find(m => m._id === messageId);
    if (!rawMsg) return;

    const updatedCards = (rawMsg.cards as Card[] ?? []).map(c =>
      c.id === cardId ? { ...c, state: 'discarded' as const } : c
    );
    const allDone = updatedCards.every(c => c.state !== 'pending');

    await updateMessageMut({
      messageId: messageId as any,
      cards: updatedCards,
      state: allDone ? 'confirmed' : 'pending',
    });
  };

  // ── Return everything ChatUI needs ───────────────────────────
  return {
    messages,
    isTyping,
    isLoading: rawMessages === undefined, // true while Convex loads
    sendMessage,
    confirmCard,
    discardCard,
  };
}
