import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenerativeAI } from '@google/generative-ai'
import { WORKOUT_PARSER_PROMPT } from './prompt'

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

//user auth
const fakeId='user_01'
//API stuff
const apiKey=process.env.GEMINI_API_KEY
if(!apiKey){throw Error("GEMINI_API_KEY Not Set")}
const genAi=new GoogleGenerativeAI(apiKey);
const model = genAi.getGenerativeModel({model: 'gemma-3-4b-it'});
//const model = genAi.getGenerativeModel({model: 'gemini-2.5-flash'});

//system prompt stuff
const systemPrompt=WORKOUT_PARSER_PROMPT

// You can read data from the database via a query:
export const listNumbers = query({
  // Validators for arguments.
  args: {
    count: v.number(),
  },

  // Query implementation.
  handler: async (ctx, args) => {
    //// Read the database as many times as you need here.
    //// See https://docs.convex.dev/database/reading-data.
    const workouts = await ctx.db
      .query("workouts")
      // Ordered by _creationTime, return most recent
      .order("desc")
      .take(args.count);
    return {
      viewer: (await ctx.auth.getUserIdentity())?.name ?? null,
      workouts: workouts.reverse().map((workout) => workout),
    };
  },
});

// You can write data to the database via a mutation:
export const addWorkout = mutation({
  // Validators for arguments.
  args: {
    exercises: v.array(v.object({
    exerciseName: v.string(),
    sets: v.number(),
    reps: v.optional(v.number()),
    weight: v.optional(v.number()),
    unit: v.string(),
    duration: v.optional(v.number()),
    distance: v.optional(v.number())}))
  },

  // Mutation implementation.
  handler: async (ctx, args) => {

    const workoutId = await ctx.db.insert("workouts", { userId:fakeId, timestamp: Date.now() });  // Don't forget to add 'notes' filed later.
    for (const ex of args.exercises) {
      await ctx.db.insert("exercises",{workoutId:workoutId,...ex})
    }

    console.log("Added new document with id:", workoutId);
    // Optionally, return a value from your mutation.
    return workoutId;
  },
});

// You can fetch data from and send data to third-party APIs via an action:
export const callGemniniAPI = action({
  // Validators for arguments.
  args: {
    userInput: v.string()
  },

  // Action implementation.
  handler: async (ctx, args) => {
  try{
    const result= await model.generateContent('System Prompt: '+systemPrompt+'/n user: '+args.userInput)
    //console.log('AI response & details:',result)
    return result.response.text();
  }
  catch(error){
    console.error("API error",error)
    return 'Sorry, I encountered an Error. Please Try again!'
}
  },
});
