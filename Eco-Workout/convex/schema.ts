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
    name: v.string(),
    sets: v.number(),
    reps: v.optional(v.number()),
    weight: v.optional(v.number()),
    unit: v.string(),
    duration: v.optional(v.number()),
    distance: v.optional(v.number())
  }).index('by_workout',["workoutId"])
});
