import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // ── 1. Users ────────────────────────────────────────────────
  users: defineTable({
    tokenId: v.string(),
    name: v.string(),
    preferredUnit: v.string(),
  }).index("by_token", ["tokenId"]),

  // ── 2. Workout session header ────────────────────────────────
  // One row per AI message that had exercises.
  // All exercises confirmed from that message share this workoutId.
  workouts: defineTable({
    userId: v.string(),
    timestamp: v.number(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // ── 3. Exercises ─────────────────────────────────────────────
  // Many exercises → one workoutId.
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

  // ── 4. AI feedback log ───────────────────────────────────────
  aiFeedback: defineTable({
    feedbackId: v.string(),
    corrections: v.array(v.any()),
    systemPrompt: v.string(),
    timestamp: v.number(),
  }),

  // ── 5. Chat sessions (one per day per user) ──────────────────
  chats: defineTable({
    userId: v.string(),
    date: v.string(),      // "2026-02-28"
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // ── 6. Messages (raw — the USER's view) ─────────────────────
  // Every round-trip stored untouched. Never compressed.
  // workoutId: set after first card confirmed. All cards in this
  // message reuse the same workoutId → exercises grouped per session.
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
    workoutId: v.optional(v.id("workouts")), // ← groups exercises together
    timestamp: v.number(),
  })
    .index("by_chat", ["chatId"])
    .index("by_user", ["userId"]),

  // ── 7. Summaries (compressed — the AI's view) ───────────────
  // Completely separate from messages. Never mixed in.
  // AI context = all summaries + last 5 raw messages.
  summaries: defineTable({
    chatId: v.id("chats"),
    userId: v.string(),
    content: v.string(),
    messageCount: v.number(),
    createdAt: v.number(),
  }).index("by_chat", ["chatId"]),

});