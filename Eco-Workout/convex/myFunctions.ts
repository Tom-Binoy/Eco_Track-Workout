import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WORKOUT_PARSER_PROMPT } from './prompt';

// ── Auth placeholder (Week 3: replace with real Convex Auth) ───
const FAKE_USER_ID = 'user_01';

// ── Gemini setup ────────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY not set");
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// ════════════════════════════════════════════════════════════════
// CHAT SESSION
// ════════════════════════════════════════════════════════════════

// Gets today's chat, or creates one if it doesn't exist yet.
// Called once on app mount. Returns the chatId.
export const getOrCreateTodayChat = mutation({
  args: {
    userId: v.string(),
    date: v.string(), // "2026-02-28"
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chats")
      .withIndex("by_user_date", q =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("chats", {
      userId: args.userId,
      date: args.date,
      createdAt: Date.now(),
    });
  },
});

// ════════════════════════════════════════════════════════════════
// MESSAGES
// ════════════════════════════════════════════════════════════════

// Saves one message pair (user + eco) to the messages table.
export const saveMessage = mutation({
  args: {
    chatId: v.id("chats"),
    userId: v.string(),
    userText: v.string(),
    ecoText: v.string(),
    cards: v.optional(v.array(v.any())),
    state: v.union(v.literal('pending'), v.literal('confirmed'), v.literal('editing')),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", args);
  },
});

// Updates a message's cards and/or state.
// Called when a card is confirmed or discarded.
export const updateMessage = mutation({
  args: {
    messageId: v.id("messages"),
    cards: v.optional(v.array(v.any())),
    state: v.optional(v.union(
      v.literal('pending'),
      v.literal('confirmed'),
      v.literal('editing')
    )),
  },
  handler: async (ctx, args) => {
    const { messageId, ...fields } = args;
    const patch: Record<string, unknown> = {};
    if (fields.cards !== undefined) patch.cards = fields.cards;
    if (fields.state !== undefined) patch.state = fields.state;
    await ctx.db.patch(messageId, patch);
  },
});

// Returns all messages for a chat, oldest first.
export const getMessages = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_chat", q => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
  },
});

// ════════════════════════════════════════════════════════════════
// SUMMARIES
// ════════════════════════════════════════════════════════════════

// Returns all summaries for a chat, oldest first.
export const getSummaries = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("summaries")
      .withIndex("by_chat", q => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
  },
});

// Saves a summary. Called by generateSummary action after Gemini responds.
export const saveSummary = mutation({
  args: {
    chatId: v.id("chats"),
    userId: v.string(),
    content: v.string(),
    messageCount: v.number(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("summaries", args);
  },
});

// Calls Gemini to summarise a batch of messages, then saves the result.
// Triggered automatically by useEcoChat when message count hits a multiple of 10.
export const generateSummary = action({
  args: {
    chatId: v.id("chats"),
    userId: v.string(),
    // The messages to summarise — passed in from the hook
    messagesToSummarise: v.array(v.object({
      userText: v.string(),
      ecoText: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const conversation = args.messagesToSummarise
      .map(m => `User: ${m.userText}\nEco: ${m.ecoText}`)
      .join('\n\n');

    const prompt = `Summarise this workout conversation for future AI context.
Focus on: exercises performed, weights used, any personal records hit, and important user context (mood, injuries, goals mentioned).
Be concise but complete. Return only the summary text, no preamble.

Conversation:
${conversation}`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    await ctx.runMutation(api.myFunctions.saveSummary, {
      chatId: args.chatId,
      userId: args.userId,
      content: summary,
      messageCount: args.messagesToSummarise.length,
      createdAt: Date.now(),
    });

    return summary;
  },
});

// ════════════════════════════════════════════════════════════════
// AI — WORKOUT PARSING
// ════════════════════════════════════════════════════════════════

// Main AI call. Takes user input + optional context string.
// Context = summaries + last 5 messages (built in useEcoChat).
export const callGemniniAPI = action({
  args: {
    userInput: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const contextBlock = args.context
        ? `\n\nConversation context:\n${args.context}\n`
        : '';

      const fullPrompt =
        'System Prompt: ' + WORKOUT_PARSER_PROMPT +
        contextBlock +
        '\nUser: ' + args.userInput;

      const result = await model.generateContent(fullPrompt);
      return result.response.text();
    } catch (error) {
      console.error("Gemini API error:", error);
      // Return valid JSON so the frontend parser never crashes
      return JSON.stringify({
        action: 'chat_response',
        message: "Sorry, I had trouble with that. Try again?",
        data: null,
      });
    }
  },
});

// ════════════════════════════════════════════════════════════════
// WORKOUTS — SAVING CONFIRMED EXERCISES
// ════════════════════════════════════════════════════════════════

// Saves confirmed exercises to the workouts + exercises tables.
// Called once per confirmed card.
export const addWorkout = mutation({
  args: {
    data: v.array(v.object({
      exerciseName: v.string(),
      sets: v.number(),
      metricType: v.union(
        v.literal('reps'),
        v.literal('duration'),
        v.literal('distance')
      ),
      metricValue: v.number(),
      weight: v.optional(v.number()),
      weightUnit: v.optional(v.union(v.literal('kg'), v.literal('lbs'))),
    })),
  },
  handler: async (ctx, args) => {
    const workoutId = await ctx.db.insert("workouts", {
      userId: FAKE_USER_ID,
      timestamp: Date.now(),
    });
    for (const ex of args.data) {
      await ctx.db.insert("exercises", { workoutId, ...ex });
    }
    return workoutId;
  },
});

// Fetches recent workouts (used for context memory in future).
export const listNumbers = query({
  args: { count: v.number() },
  handler: async (ctx, args) => {
    const workouts = await ctx.db
      .query("workouts")
      .order("desc")
      .take(args.count);
    return {
      viewer: (await ctx.auth.getUserIdentity())?.name ?? null,
      workouts: workouts.reverse(),
    };
  },
});

// ════════════════════════════════════════════════════════════════
// AI FEEDBACK
// ════════════════════════════════════════════════════════════════

// Logs corrections the user makes to AI-parsed exercises.
// Useful for future prompt tuning.
export const aiFeedback = mutation({
  args: { corrections: v.array(v.any()) },
  handler: async (ctx, args) => {
    await ctx.db.insert('aiFeedback', {
      feedbackId: FAKE_USER_ID,
      systemPrompt: WORKOUT_PARSER_PROMPT,
      corrections: args.corrections,
      timestamp: Date.now(),
    });
  },
});
