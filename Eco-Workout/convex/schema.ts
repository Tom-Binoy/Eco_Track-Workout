import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  //1. User Profile and Preferences
  users: defineTable({
    tokenId: v.string(),  //Unique ID from Clerk/Auth
    name: v.string(),
    preferredUnit: v.string() //"kg" or "lbs"
  }).index("by_token",["tokenId"]),
  
  //2. The Session "Header"
  workouts: defineTable({
    userId: v.string(),  //Links to the user table | change back to v.id('users)
    timestamp: v.number(),
    location: v.optional(v.string()),
    notes: v.optional(v.string())
  }).index("by_user",["userId"]),

  //3. The Actual Data
  exercises: defineTable({
    workoutId: v.id("workouts"),  //links to the specific session
    exerciseName: v.string(),
    sets: v.number(),
    metricType: v.union(
      v.literal('reps'),
      v.literal('distance'),
      v.literal('duration')),
    metricValue: v.number(),
    weight: v.optional(v.number()),
    weightUnit: v.optional(v.union( v.literal('kg'), v.literal('lbs')))
  }).index('by_workout',["workoutId"]),
  
  //4. The AI Corrections Log
  aiFeedback: defineTable({
    feedbackId: v.string(),//v.id("userId"),
    corrections: v.array(v.any()),
    systemPrompt: v.string(),
    timestamp: v.number()
  })
});
