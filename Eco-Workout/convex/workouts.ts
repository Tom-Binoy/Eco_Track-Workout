import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Query to get recent workouts for a user
export const getRecent = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 30;
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
    
    return workouts;
  },
});

// Mutation to create a new workout
export const create = mutation({
  args: {
    userId: v.string(),
    exercises: v.array(v.object({
      exerciseName: v.string(),
      sets: v.number(),
      metricType: v.union(
        v.literal('reps'),
        v.literal('duration'),
        v.literal('distance')
      ),
      metricValue: v.number(),
      weight: v.optional(v.number()),
      weightUnit: v.optional(v.union(v.literal('kg'), v.literal('lbs')))
    })),
    rawInput: v.string(),
    aiResponse: v.string()
  },
  handler: async (ctx, args) => {
    const workoutId = await ctx.db.insert("workouts", {
      userId: args.userId,
      timestamp: Date.now(),
      notes: args.aiResponse
    });

    // Insert all exercises
    for (const exercise of args.exercises) {
      await ctx.db.insert("exercises", {
        workoutId: workoutId,
        ...exercise
      });
    }

    return workoutId;
  },
});
