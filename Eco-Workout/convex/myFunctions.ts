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
    weightUnit: v.optional(v.union(v.literal('kg'),v.literal('lbs')))
  },))},

  // Mutation implementation.
  handler: async (ctx, args) => {

    const workoutId = await ctx.db.insert("workouts", { userId:fakeId, timestamp: Date.now() });  // Don't forget to add 'notes' filed later.
    for (const ex of args.data) {
      await ctx.db.insert("exercises",{workoutId:workoutId,...ex})
    }

    console.log("Added new document with id:", workoutId);
    // Optionally, return a value from your mutation.
    return workoutId;
  },
});

//AI Feedback Mutation
export const aiFeedback= mutation({
  args:{
    corrections:v.array(v.any())
  },
  handler: async (ctx, args) =>{
    const feedbackId = await ctx.db.insert('aiFeedback',{userId:fakeId, systemPrompt:WORKOUT_PARSER_PROMPT, corrections:args.corrections, timestamp: Date.now()})
    return feedbackId;
  }
})

//Chat Session Mutation
export const updateSession= mutation({
  args:{
    turns:v.array(v.object({
      id: v.string(),
      timestamp: v.number(),
      user: v.string(),
      response: v.string(),
      workoutData: v.optional(v.any())
    })),
    chatId:v.optional(v.id('chats'))
  },
  handler: async (ctx, args) =>{
    if(!args.chatId){
      const chatId= await ctx.db.insert('chats',{userId:fakeId, chatStart: Date.now(),chatLast: Date.now(), turns: args.turns})
      return chatId;
    }else{
      await ctx.db.patch('chats', args.chatId,{userId:fakeId, chatLast: Date.now(), turns: args.turns}) //use chat ID to update the chat doc.
    }
  }
})

// You can fetch data from and send data to third-party APIs via an action:
export const callGemniniAPI = action({
  // Validators for arguments.
  args: {
    userInput: v.string()
  },

  // Action implementation.
  handler: async (ctx, args) => {
    try {
      const result = await model.generateContent('System Prompt: ' + systemPrompt + '/n user: ' + args.userInput);
      console.log('AI response & details:', result);
      return result.response.text();
    } catch (error) {
      console.error("API error", error);
      return 'Sorry, I encountered an Error. Please Try again!';
    }
  },
});

// Export the new functions for backward compatibility
export { getRecent, create } from './workouts';
export { parseWorkout } from './ai';
