# Eco Track - Development Workflow

**Your step-by-step guide to building features efficiently**

---

## Daily Workflow (Saturday/Sunday)

### Morning Setup (5 mins)
```bash
# 1. Start backend
cd eco-track
npm run convex:dev

# 2. Start frontend (new terminal)
npm run dev

# 3. Open Windsurf
# - Load rules.md in context
# - Open plans.md to see current tasks
```

### During Coding (Continuous)
**Use Windsurf for:**
- Creating new files
- Refactoring multiple files
- Structural changes

**Use Copilot for:**
- Inline autocomplete while typing
- Quick function implementations

**Switch between them as needed - they complement each other**

---

## The 3-Step Feature Development Process

### **Step 1: Design (v0.dev)** ⏱️ 15-30 mins

**When:** Building new UI components

**How:**
1. Go to v0.dev
2. Describe component: "Modern chat input with send button, Tailwind CSS"
3. Generate 2-3 variants
4. Pick one, copy JSX code

**Example Prompt:**
```
Create a mobile-first chat interface with:
- Message bubbles (user: right, blue; AI: left, gray)
- Fixed input area at bottom
- Rounded corners, clean spacing
- Using Tailwind CSS and shadcn/ui style
```

**Output:** React component code (copy to clipboard)

---

### **Step 2: Scaffold (Windsurf)** ⏱️ 30-60 mins

**When:** Integrating design with backend logic

**How:**
1. Open Windsurf
2. Paste v0 code
3. Ask: "Integrate this chat UI with my Convex backend"
4. Windsurf creates files, connects state

**Example Prompt to Windsurf:**
```
Using this v0 design [paste code], create:
1. ChatContainer.tsx in src/components/chat/
2. Connect to Convex workouts mutation
3. Add loading state while AI processes
4. Follow rules.md for TypeScript types

Also update App.tsx to use the new component.
```

**Windsurf will:**
- Create files in correct locations
- Add TypeScript types
- Import dependencies
- Connect to Convex queries/mutations

---

### **Step 3: Refine (Copilot + Manual)** ⏱️ 30-90 mins

**When:** Adding final touches and bug fixes

**How:**
1. Open the generated files
2. Let Copilot autocomplete as you type
3. Test in browser
4. Manually fix edge cases

**Copilot shines here:**
- Type `const handleSend =` → Copilot suggests full function
- Type `// validate input` → Copilot suggests validation logic
- Type `try {` → Copilot suggests error handling

**Manual fixes:**
- Edge cases Copilot missed
- Styling tweaks
- Mobile-specific adjustments

---

## Tool Decision Matrix

| Task | Tool | Why |
|------|------|-----|
| Design chat bubbles | v0.dev | Visual iteration fast |
| Create 5 new component files | Windsurf | Multi-file operations |
| Write a single function | Copilot | Inline autocomplete |
| Refactor folder structure | Windsurf | Bulk file moves/renames |
| Fix a bug | Manual + Copilot | You know the fix, Copilot speeds it up |
| Add TypeScript types | Windsurf | Understands full codebase |
| Style adjustments | Manual | Quickest to just do it |
| Integrate API | Windsurf | Complex, multi-file change |

---

## Windsurf Best Practices

### Loading Context
**Before asking Windsurf to do anything:**
```
# In Windsurf chat, reference:
@rules.md
@plans.md
@architecture.md

Then ask your question.
```

**Why:** Windsurf follows your standards automatically

### Asking for Changes
**❌ Vague:**
"Make the chat UI better"

**✅ Specific:**
"Following rules.md, redesign ChatContainer.tsx to:
1. Use shadcn Card component
2. Add ScrollArea for messages
3. Fix input area at bottom with shadow
4. Make mobile-responsive (max-width: 640px)"

### Iterating
**Pattern:**
1. Ask Windsurf to build feature
2. Test in browser
3. Tell Windsurf what broke
4. Repeat until working

**Example:**
```
[After testing]
You: "The send button doesn't work on mobile"

Windsurf: [suggests fix]

You: "That worked, but now the input is too small on desktop"

Windsurf: [adjusts responsive breakpoints]
```

---

## Git Workflow

### Before Starting Work
```bash
git pull origin main
git checkout -b feat/chat-ui-redesign
```

### During Work (Every Hour)
```bash
git add .
git commit -m "feat: redesign chat container

- Added shadcn Card wrapper
- Implemented ScrollArea for messages
- Fixed input area positioning"
```

### After Feature Complete
```bash
# Test everything works
npm run build

# Push to GitHub
git push origin feat/chat-ui-redesign

# Merge to main (if all good)
git checkout main
git merge feat/chat-ui-redesign
git push origin main
```

**Auto-deploys to Vercel after push to main**

---

## Testing Workflow

### Quick Test (Every 30 mins)
1. Save files
2. Check browser (auto-refreshes)
3. Try the feature you just built
4. Fix obvious bugs immediately

### Full Test (Before Committing)
1. **Desktop:**
   - Chrome DevTools → Responsive mode
   - Try full user flow (log workout, view history)
2. **Mobile:**
   - Open localhost on phone (use same WiFi)
   - Test touch interactions
3. **Edge Cases:**
   - Empty states (no workouts yet)
   - Network offline (disconnect WiFi)
   - Long text inputs (100+ characters)

### Before Sharing with Friends
1. Clear all data (Convex dashboard → delete all workouts)
2. Go through onboarding as new user
3. Try intentionally breaking it (spam inputs, rapid clicks)
4. Fix critical bugs only (not polish)

---

## Debugging Workflow

### When Something Breaks

**Step 1: Check Console**
```
F12 → Console tab
Look for red errors
```

**Common Errors:**
- `Cannot read property 'map' of undefined` → Data not loaded yet
- `401 Unauthorized` → Auth issue
- `Network request failed` → Convex/API down

**Step 2: Check Network Tab**
```
F12 → Network tab
Look for failed requests (red)
Click → Preview → See error message
```

**Step 3: Add Logs**
```typescript
console.log('workout:', workout)
console.log('AI response:', response)
```

**Step 4: Ask Windsurf**
```
"Getting error: [paste error]. Here's my code: [paste code]"
```

---

## Prompt Templates for Windsurf

### Create New Feature
```
Following @rules.md and @architecture.md, create:

Feature: [Name]
Location: src/components/[folder]/[Component.tsx]

Requirements:
1. [Requirement 1]
2. [Requirement 2]
3. [Requirement 3]

Integration:
- Connect to Convex query: [query name]
- Add to [Parent component]

TypeScript types: [paste type if relevant]
```

### Refactor Existing Code
```
Refactor [file name] to:
1. [Change 1]
2. [Change 2]

Follow these rules from @rules.md:
- [Specific rule 1]
- [Specific rule 2]

Keep existing functionality working.
```

### Fix Bug
```
Bug: [Description of issue]
Expected: [What should happen]
Actual: [What's happening]

Error message: [paste error]

File: [file name]
Code: [paste relevant code]

Fix this following @rules.md patterns.
```

### Add Tests (Later)
```
Add manual test checklist to [Component.tsx]:

Test cases:
1. [Case 1]
2. [Case 2]
3. [Case 3]

Expected behavior for each case: [describe]
```

---

## Weekly Review Process

### Sunday Evening (15 mins)

**Update plans.md:**
```markdown
## Week 1 Review (Feb 16)

### Completed ✅
- [x] Task 1
- [x] Task 2

### Incomplete ❌
- [ ] Task 3 (reason: underestimated time)

### Unexpected Issues
- [Issue 1 and how you fixed it]

### Next Week Priority
- [Top 3 tasks for next weekend]

### Learnings
- [One thing that went well]
- [One thing to improve]
```

**Git Summary:**
```bash
git log --oneline --since="1 week ago"
# Copy output to plans.md
```

**Screenshots:**
- Take 2-3 screenshots of progress
- Save to `progress/` folder
- Optional: share on YouTube/Twitter

---

## Emergency Procedures

### "Everything is broken"
1. **Check Git history:**
   ```bash
   git log --oneline
   git checkout [last working commit]
   ```

2. **Test if that works**
   
3. **If yes, cherry-pick good changes:**
   ```bash
   git cherry-pick [commit hash]
   ```

4. **If no, restore from backup:**
   ```bash
   # If you have Convex backup
   # Redeploy from Convex dashboard
   ```

### "Windsurf made wrong changes"
1. **Undo (if just happened):**
   ```bash
   git checkout -- [file name]
   ```

2. **Or revert commit:**
   ```bash
   git revert [commit hash]
   ```

3. **Tell Windsurf what went wrong:**
   ```
   "Your previous change broke [feature]. 
   Here's the error: [paste]
   Revert to working version and try this instead: [describe]"
   ```

### "Can't figure out why it's not working"
1. Take a break (seriously, walk away for 30 mins)
2. Come back and read error message carefully
3. Google the error message
4. Ask on Discord/Reddit (Convex/React communities)
5. Ask Windsurf to explain the code

---

## Time Management

### If Running Over Time

**Ask yourself:**
1. Is this critical for beta? (No → skip)
2. Am I overthinking? (Yes → ship simpler version)
3. Can I get 80% value in 20% time? (Yes → do that)

**Examples:**
- **Overthinking:** Perfect animations → **Ship:** Basic fade-in
- **Not critical:** Dark mode → **Skip:** Do after beta
- **80/20:** Complex form validation → **Ship:** Basic required checks

### If Ahead of Schedule

**Don't:**
- Add random features (scope creep)
- Over-polish (diminishing returns)

**Do:**
- Test more thoroughly
- Improve error handling
- Start next week's tasks early

---

## Motivation Hacks

### When Stuck
- Record a quick video explaining the problem (often you solve it while explaining)
- Sketch the solution on paper first
- Build the simplest version that could work

### When Tired
- Focus on easy tasks (styling, typos)
- Or take a real break (don't code tired)

### When Excited
- Ship something small TODAY
- Don't start 5 new features at once
- Finish what you started first

---

## Quick Reference

**Start coding:**
```bash
npm run convex:dev  # Terminal 1
npm run dev         # Terminal 2
```

**Open phone preview:**
```
http://[your-computer-ip]:5173
```

**Deploy:**
```bash
git push origin main  # Auto-deploys
```

**Check costs:**
- Gemini: console.cloud.google.com
- Convex: dashboard.convex.dev
- Vercel: vercel.com/dashboard

**Get help:**
- Convex Discord: convex.dev/community
- Windsurf Docs: codeium.com/windsurf
- Your documentation: rules.md, architecture.md

---

End of workflow.md
