# Eco Track - Development Rules

## Project Context
- **App:** AI workout tracker (conversational logging)
- **Tech Stack:** React + TypeScript + Convex + Gemini API
- **Target:** Beta for 2 friends by mid-March 2026
- **Style:** shadcn/ui + Tailwind CSS

---

## Code Style

### TypeScript
- **Always use TypeScript** (no `.js` files)
- Strict mode enabled
- Explicit return types for functions
- No `any` types (use `unknown` if needed)

### React
- Functional components only (no class components)
- Custom hooks for shared logic (prefix with `use`)
- Props: destructure at function parameter level
```tsx
// ✅ Good
export function ChatMessage({ text, isUser }: ChatMessageProps) {
  return <div>{text}</div>
}

// ❌ Bad
export function ChatMessage(props) {
  return <div>{props.text}</div>
}
```

### File Organization
```
src/
├── components/
│   ├── chat/          # Chat-specific components
│   ├── workout/       # Workout-related components
│   └── ui/            # shadcn components
├── lib/
│   ├── ai/            # AI parsing logic
│   ├── utils/         # Helper functions
│   └── convex/        # Convex client setup
├── hooks/             # Custom React hooks
└── types/             # TypeScript types
```

### Naming Conventions
- **Components:** PascalCase (`ChatContainer.tsx`)
- **Hooks:** camelCase with `use` prefix (`useWorkoutHistory.ts`)
- **Utils:** camelCase (`parseWorkout.ts`)
- **Types:** PascalCase with descriptive names (`WorkoutEntry`, `ChatMessage`)

---

## Component Rules

### Structure
```tsx
// 1. Imports (React, then libraries, then local)
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { parseWorkout } from '@/lib/ai/parser'

// 2. Types
interface ChatInputProps {
  onSend: (message: string) => void
  isLoading: boolean
}

// 3. Component
export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  // 3a. Hooks
  const [input, setInput] = useState('')
  
  // 3b. Handlers
  const handleSend = () => {
    onSend(input)
    setInput('')
  }
  
  // 3c. Render
  return (
    <div className="flex gap-2">
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <Button onClick={handleSend} disabled={isLoading}>Send</Button>
    </div>
  )
}
```

### Props
- Max 5 props per component (if more, refactor or use context)
- Prefer composition over prop drilling
- Use `children` for layout components

### State
- Keep state close to where it's used
- Lift state only when necessary
- Use Convex for server state (not React state for DB data)

---

## Styling (Tailwind)

### Principles
- Use Tailwind utility classes (no custom CSS unless absolutely necessary)
- Mobile-first responsive design
- Consistent spacing scale: `p-2`, `p-4`, `p-6`, `p-8`

### Patterns
```tsx
// Container
<div className="max-w-2xl mx-auto px-4">

// Card
<div className="bg-white rounded-lg shadow-sm p-4">

// Button (use shadcn, but if custom:)
<button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">

// Input
<input className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
```

### Responsive
- Default: Mobile (no prefix)
- Tablet: `md:` (768px+)
- Desktop: `lg:` (1024px+)

---

## AI Integration

### Gemini API Calls
- Always handle errors gracefully
- Show loading states to user
- Timeout after 10 seconds max
- Log all AI interactions (for debugging)

```tsx
// Pattern
async function getAIResponse(message: string): Promise<string> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
    
    if (!response.ok) throw new Error('AI request failed')
    
    const data = await response.json()
    return data.response
  } catch (error) {
    console.error('AI Error:', error)
    return 'Sorry, I had trouble processing that. Try again?'
  }
}
```

### Prompt Engineering
- Keep prompts under 1000 tokens when possible
- Include context (last 3 workouts max)
- Clear instructions for response format
- Always validate AI output before saving to DB

---

## Convex (Backend)

### Queries
- Use `useQuery` for read operations
- Handle `undefined` state (data loading)

### Mutations
- Use `useMutation` for write operations
- Optimistic UI updates where appropriate
- Show error toasts on failure

### Schema
- Keep schema simple (don't over-engineer)
- Use proper types from Convex (`v.string()`, `v.number()`, etc.)

---

## Error Handling

### User-Facing Errors
```tsx
// ✅ Good
toast.error('Could not save workout. Try again?')

// ❌ Bad
alert('Error: workout.save is not a function')
```

### Dev Errors
- `console.error()` for debugging (remove before commit)
- Use Error Boundaries for React errors
- Log critical errors to Convex (for monitoring)

---

## Performance

### Optimize Later
- Don't premature optimize
- First: make it work
- Then: make it fast (if needed)

### Quick Wins
- Lazy load routes with `React.lazy()`
- Memoize expensive computations with `useMemo`
- Debounce input handlers (search, autocomplete)

---

## Testing (Manual for Now)

### Before Each Commit
1. Test on desktop browser
2. Test on mobile (Chrome DevTools responsive mode)
3. Try a full user flow (log workout, view history)

### Before Sharing with Friends
1. Clear all data, go through onboarding
2. Test with intentionally bad inputs
3. Test on actual phone

---

## Git Commits

### Format
```
type: short description

- Detail 1
- Detail 2
```

### Types
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code restructure (no behavior change)
- `style:` UI/styling changes
- `docs:` Documentation

### Examples
```
feat: add workout history sidebar

- Created Sheet component for history
- Fetches last 30 workouts from Convex
- Mobile-responsive design

fix: chat input not clearing after send

refactor: extract AI parsing into separate hook
```

---

## Security (Basic)

- Never commit API keys (use `.env.local`)
- Sanitize user input before AI prompts
- Use Convex auth for user data isolation
- HTTPS only (Vercel default)

---

## When to Ask for Help

**Ask Windsurf/AI:**
- "How do I implement X?"
- "Refactor this to be cleaner"
- "Add error handling to this function"

**Ask a Human:**
- "Is this architectural decision right?"
- "Should I use library X or Y?"
- "This feels over-engineered, is it?"

---

## Remember

- **Shipping > Perfection**
- **User feedback > Your assumptions**
- **Simple code > Clever code**
- **Working features > Unfinished polish**

End of rules.md
