# Eco Track — Sprint 1 Guide
**"A working chat"**

---

## What we built

A fully wired AI workout chat. User types → Gemini parses → exercises appear as cards → user confirms → saved to database.

---

## The 3-layer architecture

```
ChatUI.tsx          ← Layer 1: Pure visuals. No Convex, no Gemini.
    ↕ props
useEcoChat.ts       ← Layer 2: All logic. Connects everything.
    ↕ hooks
convex/myFunctions  ← Layer 3: Database + AI. Runs on Convex servers.
```

**Why this matters:** If Gemini changes their API tomorrow, you only touch `myFunctions.ts`. If you want to redesign the UI, you only touch `ChatUI.tsx`. Each layer has one job.

---

## File map — where everything lives

| File | What it does |
|---|---|
| `src/types.ts` | Shared TypeScript types. `Message`, `Card`, `Exercise`, `AIResponse`. |
| `src/App.tsx` | 10 lines. Wires hook → UI. Nothing else. |
| `src/ChatUI.tsx` | Every pixel. Accepts props, calls callbacks. No backend. |
| `src/hooks/useEcoChat.ts` | All the logic. Calls Gemini, saves messages, triggers summaries. |
| `convex/schema.ts` | Database tables. 7 tables total. |
| `convex/myFunctions.ts` | All Convex functions. Mutations, queries, actions. |
| `convex/prompt.ts` | Gemini system prompt. Unchanged. |

---

## The message type (important change)

Old: separate array of `{id, text, from}` — one entry per bubble.

New: paired object per round-trip.

```ts
interface Message {
  id: string;       // Convex _id
  user: string;     // What the user said
  eco: string;      // What Eco replied
  cards?: Card[];   // Parsed exercises (if any)
  state: 'pending' | 'confirmed' | 'editing';
}
```

One message = one user message + one Eco reply. This makes history, context, and summaries much cleaner.

---

## What happens when you send a message

1. `ChatUI` calls `onSend(text)` → `useEcoChat.sendMessage(text)`
2. Hook sets `isTyping = true` (dots appear in UI)
3. Hook builds context: summaries + last 5 messages (plain text)
4. Hook calls `callGemniniAPI({ userInput, context })` on Convex
5. Convex calls Gemini with the full prompt + context
6. Gemini returns JSON → hook parses it with `parseGeminiJSON()`
7. If `action === 'log_workouts'`: creates `Card[]` with `state: 'pending'`
8. Hook calls `saveMessage()` mutation → saves to `messages` table in DB
9. Convex real-time subscription fires → `getMessages` query updates
10. React re-renders with the new message (including cards if any)
11. `isTyping = false`

---

## What happens when you confirm a card

1. User opens modal (taps the green NotifCard)
2. User edits values if needed, taps "Confirm ✓"
3. `ChatUI` calls `onConfirmCard(messageId, cardId, data)`
4. `useEcoChat.confirmCard()` runs:
   - Calls `updateMessage()` mutation → updates card state to `'confirmed'` in DB
   - Calls `addWorkout()` mutation → saves exercise to `workouts` + `exercises` tables
5. Convex real-time fires → message updates → UI shows confirmed row

---

## The summary logic

Every 10 message pairs, the hook automatically:
1. Takes the oldest 5 messages from that batch
2. Calls `generateSummary` action (Gemini summarises them)
3. Saves the summary to the `summaries` table

When building context for the next message:
- AI sees: all summaries (compressed) + last 5 raw messages
- User sees: all raw messages forever (in `messages` table)

This means the AI never loses important context even in long conversations, without sending the entire history every time.

When summaries pile up (after very long conversations), the same logic applies — summaries get summarised. The key insight: **recent = detailed, old = compressed**.

---

## Database tables

| Table | What it stores |
|---|---|
| `workouts` | Workout session headers (userId, timestamp) |
| `exercises` | Individual exercises linked to a workout session |
| `chats` | One per day per user. Container for messages. |
| `messages` | Every conversation turn, raw and untouched. User-facing history. |
| `summaries` | AI-generated compressions. AI-facing context. |
| `aiFeedback` | Corrections users make to AI parsing. For future prompt tuning. |
| `users` | Placeholder until Week 3 auth. |

---

## After this sprint — what to do next

**Before running for the first time:**
1. `npx convex dev` — this regenerates `_generated/api.d.ts` with the new functions
2. Check Convex dashboard — new tables should appear
3. Test: type "20 pushups", card should appear

**Week 2 goal (History + Memory):**
- Build a history sidebar that reads from the `messages` table
- The data is already there — just need a UI component to show it
- Add "Last workout: X days ago" chip to the header

**Week 3 goal (Auth):**
- Replace `FAKE_USER_ID = 'user_01'` in two places:
  - `convex/myFunctions.ts` (line near top)
  - `src/hooks/useEcoChat.ts` (line near top)
- Set up Convex Auth (Google OAuth)

---

## Known limitations (intentional for v1)

**One workout entry per confirmed card.** If you log 3 exercises, you get 3 separate entries in `workouts`. Not ideal — they should be grouped. This is a v2 fix (needs a `workoutSessionId` to group them).

**No offline support.** Requires internet. Fine for now.

**Fake user ID.** All data goes to `user_01`. Week 3 fixes this.

---

## When something breaks

**"Gemini returned bad data"** → Check `convex/prompt.ts`. The prompt controls the JSON shape. Add another example if Gemini keeps misformatting.

**"Cards don't appear after AI responds"** → Check browser console for parse errors. The `parseGeminiJSON()` function in `useEcoChat.ts` logs failures.

**"Message saved but page doesn't update"** → Check Convex dashboard. If the mutation ran but UI didn't update, the `useQuery` subscription might have failed.

**"getOrCreateTodayChat fails"** → Check that `chats` table has the `by_user_date` index in `schema.ts`. Run `npx convex dev` to push schema changes.

---

## The one command you need

```bash
npx convex dev
```

Run this any time you change files in `convex/`. It pushes changes to the cloud and regenerates TypeScript types. Without it, your Convex functions won't update.
