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
  workouts: defineTable({
    userId: v.string(),
    timestamp: v.number(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // ── 3. Exercises ─────────────────────────────────────────────
  exercises: defineTable({
    workoutId: v.id("workouts"),
    exerciseName: v.string(),
    sets: v.number(),
    metricType: v.union(
      v.literal("reps"),
      v.literal("distance"),
      v.literal("duration")
    ),
    metricValue: v.number(),
    weight: v.optional(v.number()),
    weightUnit: v.optional(v.union(v.literal("kg"), v.literal("lbs"))),
  }).index("by_workout", ["workoutId"]),

  // ── 4. Chat sessions (one per day per user) ──────────────────
  chats: defineTable({
    userId: v.string(),
    date: v.string(), // "2026-02-28"
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // ── 5. Message Groups (replaces flat `messages` table) ───────
  //
  // Each group = one conversation "turn" (one user prompt + one AI reply).
  // A group can have MULTIPLE branches when the user edits the message.
  //
  // Tree structure:
  //   parentGroupId + parentBranchIndex tell us which branch of the parent
  //   this group follows from. The visible chain is constructed by walking
  //   from root groups, always following the group whose parentBranchIndex
  //   matches the parent's current activeBranch.
  //
  // Branch shape (stored inline as array):
  //   { userText, ecoText, stopped, cards, workoutId, state, timestamp }
  //
  messageGroups: defineTable({
    chatId: v.id("chats"),
    userId: v.string(),

    // Tree linkage
    parentGroupId: v.optional(v.id("messageGroups")),
    parentBranchIndex: v.optional(v.number()), // follows from which branch of parent

    // Branching state
    activeBranch: v.number(), // index into branches[] — what the user is currently viewing
    branches: v.array(v.object({
      userText: v.string(),
      ecoText: v.optional(v.string()),    // undefined while pending, filled when AI responds
      stopped: v.optional(v.boolean()),   // true if user stopped generation on this branch
      cards: v.optional(v.array(v.any())),
      workoutId: v.optional(v.id("workouts")),
      state: v.union(
        v.literal("pending"),
        v.literal("confirmed"),
        v.literal("editing")
      ),
      timestamp: v.number(),
    })),

    // Metadata
    likes: v.optional(v.union(v.literal("liked"), v.literal("disliked"))),
    responseMs: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index("by_chat", ["chatId"])
    .index("by_parent", ["parentGroupId"]),

  // ── 6. Summaries (AI context compression) ───────────────────
  summaries: defineTable({
    chatId: v.id("chats"),
    userId: v.string(),
    content: v.string(),
    messageCount: v.number(),
    createdAt: v.number(),
  }).index("by_chat", ["chatId"]),

  // ── 7. AI feedback log ───────────────────────────────────────
  aiFeedback: defineTable({
    feedbackId: v.string(),
    corrections: v.array(v.any()),
    systemPrompt: v.string(),
    timestamp: v.number(),
  }),
});