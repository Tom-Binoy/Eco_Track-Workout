import { v } from "convex/values";
import { action } from "./_generated/server";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WORKOUT_PARSER_PROMPT } from './prompt';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY Not Set");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemma-3-4b-it' });

export const parseWorkout = action({
  args: {
    userInput: v.string(),
    context: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    try {
      const prompt = `${WORKOUT_PARSER_PROMPT}\n\nUser Message: "${args.userInput}"`;
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      console.log('AI response & details:', result);
      return response;
    } catch (error) {
      console.error("API error", error);
      return 'Sorry, I encountered an Error. Please try again!';
    }
  },
});
