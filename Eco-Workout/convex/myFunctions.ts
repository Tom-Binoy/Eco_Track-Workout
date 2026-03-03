"use node";
import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { WORKOUT_PARSER_PROMPT } from "./prompt";

// ── Auth placeholder (Week 3: replace with real Convex Auth) ───
const FAKE_USER_ID = "user_01";

// ── Gemini setup ────────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY not set");
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemma-3-12b-it" });

// ════════════════════════════════════════════════════════════════
// CHAT SESSION
// ════════════════════════════════════════════════════════════════

export const getOrCreateTodayChat = mutation({
  args: { userId: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chats")
      .withIndex("by_user_date", q => q.eq("userId", args.userId).eq("date", args.date))
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
// MESSAGE GROUPS
// ════════════════════════════════════════════════════════════════

// Returns ALL groups for a chat (client does tree traversal).
export const getMessageGroups = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messageGroups")
      .withIndex("by_chat", q => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
  },
});

// Creates a new message group (new conversation turn).
// Called when user sends a brand-new message (not an edit).
export const createMessageGroup = mutation({
  args: {
    chatId: v.id("chats"),
    userId: v.string(),
    parentGroupId: v.optional(v.id("messageGroups")),
    parentBranchIndex: v.optional(v.number()),
    userText: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messageGroups", {
      chatId: args.chatId,
      userId: args.userId,
      parentGroupId: args.parentGroupId,
      parentBranchIndex: args.parentBranchIndex,
      activeBranch: 0,
      branches: [{
        userText: args.userText,
        ecoText: undefined,
        stopped: false,
        cards: [],
        state: "pending",
        timestamp: args.timestamp,
      }],
      likes: undefined,
      responseMs: undefined,
      timestamp: args.timestamp,
    });
  },
});

// Adds a new branch to an existing group (user edited their message).
// Returns the new branch index so the caller can target it.
export const addBranchToGroup = mutation({
  args: {
    groupId: v.id("messageGroups"),
    userText: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    const newBranchIdx = group.branches.length;
    await ctx.db.patch(args.groupId, {
      activeBranch: newBranchIdx,
      branches: [
        ...group.branches,
        {
          userText: args.userText,
          ecoText: undefined,
          stopped: false,
          cards: [],
          state: "pending",
          timestamp: args.timestamp,
        },
      ],
    });
    return newBranchIdx;
  },
});

// Fills in the AI response on a specific branch.
export const updateBranchResponse = mutation({
  args: {
    groupId: v.id("messageGroups"),
    branchIndex: v.number(),
    ecoText: v.optional(v.string()),
    stopped: v.optional(v.boolean()),
    responseMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    const branches = group.branches.map((b, i) =>
      i === args.branchIndex
        ? {
            ...b,
            ecoText: args.ecoText ?? b.ecoText,
            stopped: args.stopped ?? b.stopped ?? false,
          }
        : b
    );
    await ctx.db.patch(args.groupId, {
      branches,
      ...(args.responseMs !== undefined ? { responseMs: args.responseMs } : {}),
    });
  },
});

// Sets activeBranch (called from UI branch navigator < 1/2 >).
export const setActiveBranch = mutation({
  args: {
    groupId: v.id("messageGroups"),
    branchIndex: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.groupId, { activeBranch: args.branchIndex });
  },
});

// Update cards on a specific branch (confirm / discard).
export const updateBranchCards = mutation({
  args: {
    groupId: v.id("messageGroups"),
    branchIndex: v.number(),
    cards: v.array(v.any()),
    state: v.optional(v.union(v.literal("pending"), v.literal("confirmed"), v.literal("editing"))),
    workoutId: v.optional(v.id("workouts")),
  },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    const branches = group.branches.map((b, i) =>
      i === args.branchIndex
        ? {
            ...b,
            cards: args.cards,
            ...(args.state !== undefined ? { state: args.state } : {}),
            ...(args.workoutId !== undefined ? { workoutId: args.workoutId } : {}),
          }
        : b
    );
    await ctx.db.patch(args.groupId, { branches });
  },
});

// Update likes on a group.
export const updateGroupLikes = mutation({
  args: {
    groupId: v.id("messageGroups"),
    likes: v.optional(v.union(v.literal("liked"), v.literal("disliked"))),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.groupId, { likes: args.likes });
  },
});

// ════════════════════════════════════════════════════════════════
// SUMMARIES
// ════════════════════════════════════════════════════════════════

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

export const generateSummary = action({
  args: {
    chatId: v.id("chats"),
    userId: v.string(),
    messagesToSummarise: v.array(v.object({
      userText: v.string(),
      ecoText: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const conversation = args.messagesToSummarise
      .map(m => `User: ${m.userText}\nEco: ${m.ecoText}`)
      .join("\n\n");
    const prompt = `Summarise this workout conversation for future AI context.
Focus on: exercises performed, weights used, personal records, and important user context.
Be concise. Return only the summary text, no preamble.\n\nConversation:\n${conversation}`;
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

export const callGeminiAPI = action({
  args: {
    userInput: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const contextBlock = args.context
        ? `\n\nConversation context:\n${args.context}\n`
        : "";
      const fullPrompt =
        "System Prompt: " + WORKOUT_PARSER_PROMPT +
        contextBlock +
        "\nUser: " + args.userInput;
      const result = await model.generateContent(fullPrompt);
      return result.response.text();
    } catch (error) {
      console.error("Gemini API error:", error);
      return JSON.stringify({
        action: "chat_response",
        message: "Sorry, I had trouble with that. Try again?",
        data: null,
      });
    }
  },
});

// ════════════════════════════════════════════════════════════════
// WORKOUTS — GROUPED EXERCISE SAVING
// ════════════════════════════════════════════════════════════════

export const createWorkoutSession = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workouts", {
      userId: args.userId,
      timestamp: Date.now(),
    });
  },
});

export const addExerciseToWorkout = mutation({
  args: {
    workoutId: v.id("workouts"),
    exercise: v.object({
      exerciseName: v.string(),
      sets: v.number(),
      metricType: v.union(v.literal("reps"), v.literal("duration"), v.literal("distance")),
      metricValue: v.number(),
      weight: v.optional(v.number()),
      weightUnit: v.optional(v.union(v.literal("kg"), v.literal("lbs"))),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("exercises", {
      workoutId: args.workoutId,
      ...args.exercise,
    });
  },
});

// ════════════════════════════════════════════════════════════════
// AI FEEDBACK
// ════════════════════════════════════════════════════════════════

export const aiFeedback = mutation({
  args: { corrections: v.array(v.any()) },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiFeedback", {
      feedbackId: FAKE_USER_ID,
      systemPrompt: WORKOUT_PARSER_PROMPT,
      corrections: args.corrections,
      timestamp: Date.now(),
    });
  },
});