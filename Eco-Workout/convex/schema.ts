import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // ── 1. Users ────────────────────────────────────────────────
  // Placeholder until Week 3 auth.
  users: defineTable({
    tokenId: v.string(),
    name: v.string(),
    preferredUnit: v.string(), // "kg" or "lbs"
  }).index("by_token", ["tokenId"]),

  // ── 2. Workout sessions (the saved header) ──────────────────
  workouts: defineTable({
    userId: v.string(),
    timestamp: v.number(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // ── 3. Exercises (the actual saved data) ────────────────────
  exercises: defineTable({
    workoutId: v.id("workouts"),
    exerciseName: v.string(),
    sets: v.number(),
    metricType: v.union(
      v.literal('reps'),
      v.literal('distance'),
      v.literal('duration')
    ),
    metricValue: v.number(),
    weight: v.optional(v.number()),
    weightUnit: v.optional(v.union(v.literal('kg'), v.literal('lbs'))),
  }).index('by_workout', ["workoutId"]),

  // ── 4. AI feedback log ──────────────────────────────────────
  aiFeedback: defineTable({
    feedbackId: v.string(),
    corrections: v.array(v.any()),
    systemPrompt: v.string(),
    timestamp: v.number(),
  }),

  // ── 5. Chat sessions (one per day per user) ─────────────────
  // One chat = one day's conversation.
  chats: defineTable({
    userId: v.string(),
    date: v.string(),      // "2026-02-28"
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // ── 6. Messages (raw, full history) ─────────────────────────
  // What the USER sees. Every round-trip stored untouched.
  messages: defineTable({
    chatId: v.id("chats"),
    userId: v.string(),
    userText: v.string(),
    ecoText: v.string(),
    cards: v.optional(v.array(v.any())),
    state: v.union(
      v.literal('pending'),
      v.literal('confirmed'),
      v.literal('editing')
    ),
    timestamp: v.number(),
  })
    .index("by_chat", ["chatId"])
    .index("by_user", ["userId"]),

  // ── 7. Summaries (compressed context for the AI) ────────────
  // What the AI sees. NOT the full raw history.
  // Every 10 message pairs → summarise oldest 5.
  // AI context = summaries + last 5 raw messages.
  summaries: defineTable({
    chatId: v.id("chats"),
    userId: v.string(),
    content: v.string(),       // The AI-generated summary text
    messageCount: v.number(),  // How many messages this covers
    createdAt: v.number(),
  }).index("by_chat", ["chatId"]),

});
