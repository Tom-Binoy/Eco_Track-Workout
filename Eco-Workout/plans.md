# Eco Track - Development Plan

**Current Date:** Feb 12, 2026  
**Target:** Beta-ready for 2 friends by March 15, 2026 (31 days)  
**Weekly Time:** 5-7 hours (Sat/Sun only)

---

## Current Status

### ✅ Completed
- Basic chat UI (rough)
- AI workout parser (Gemini API)
- Database setup (Convex)
- Review wizard (some kind of confirmation flow?)

### ❌ Missing (Blockers for Beta)
- **Good UI** - Currently looks rough, needs polish
- **Context memory** - AI doesn't remember previous workouts
- **History view** - Can't see past workouts
- **Auth** - No user accounts yet

### 🤔 Unknown/Messy
- Code organization (needs cleanup)
- Error handling (probably missing)
- Mobile responsiveness (likely broken)

---

## The Plan: 5 Weeks to Beta

### **Week 1: UI Foundation** (Feb 15-16)
**Goal:** App looks legitimate, not a prototype

**Tasks:**
- [ ] Install shadcn/ui components
- [ ] Design chat interface in v0.dev
- [ ] Implement new chat UI (message bubbles, input area)
- [ ] Add loading states (skeleton, spinner)
- [ ] Make mobile-responsive
- [ ] Test on actual phone

**Success Criteria:**
- Chat looks professional (you'd screenshot it)
- Works smoothly on mobile
- Loading states feel natural

**Time:** 5-6 hours

---

### **Week 2: History + Memory** (Feb 22-23)
**Goal:** AI remembers context, users can view past workouts

**Tasks:**
- [ ] Build history sidebar (shadcn Sheet)
- [ ] Fetch last 30 workouts from Convex
- [ ] Display workouts by date
- [ ] Implement context loading (last 3 workouts)
- [ ] Update AI prompt to include context
- [ ] Show "Last workout: X days ago" chip

**Success Criteria:**
- Can view all past workouts
- AI says "Same weight as last time?"
- Context feels natural, not forced

**Time:** 6-7 hours

---

### **Week 3: Auth + Onboarding** (Mar 1-2)
**Goal:** Users can create accounts, data is private

**Tasks:**
- [ ] Set up Convex auth (Google OAuth)
- [ ] Build login/signup modal
- [ ] Create onboarding flow (first-time users)
- [ ] Add user profile (name, optional)
- [ ] Test multi-user data isolation

**Success Criteria:**
- Can log in with Google
- Each user sees only their workouts
- Onboarding is clear, not confusing

**Time:** 5-6 hours

---

### **Week 4: Polish + Testing** (Mar 8-9)
**Goal:** Fix all bugs, make it bulletproof

**Tasks:**
- [ ] Error handling (network failures, AI errors)
- [ ] Empty states ("No workouts yet")
- [ ] Success feedback (toasts, animations)
- [ ] Full QA pass (try to break it)
- [ ] Fix any UX friction
- [ ] Test with 1 friend (dogfooding)

**Success Criteria:**
- No crashes or blank screens
- Errors have helpful messages
- First-time user can complete a workout without confusion

**Time:** 6-7 hours

---

### **Week 5: Ship Beta** (Mar 15-16)
**Goal:** Deploy, share with 2 friends, get feedback

**Tasks:**
- [ ] Final bug fixes from Week 4 testing
- [ ] Write quick user guide (3 sentences)
- [ ] Deploy to Vercel
- [ ] Send link to 2 friends
- [ ] Schedule check-in for 3 days later

**Success Criteria:**
- Both friends log at least 1 workout
- They can use it without asking you questions
- You get real feedback (positive or negative)

**Time:** 3-4 hours

---

## Feature Backlog (Post-Beta)

**Nice-to-Haves (If Time):**
- [ ] Voice input (browser speech-to-text)
- [ ] Workout streaks ("5 days in a row!")
- [ ] Export data (CSV download)
- [ ] Dark mode
- [ ] Workout suggestions ("Try adding bicep curls?")

**Post-Launch (After Friend Testing):**
- [ ] Analytics dashboard (volume over time)
- [ ] Premium tier (GPT-4, unlimited history)
- [ ] Social features (share workouts?)
- [ ] Progressive Web App (install on phone)

---

## Decision Log

### Architecture Decisions

**Feb 12:** Using Convex instead of Supabase  
*Why:* Real-time updates, simpler than Supabase + React Query

**Feb 12:** Gemini API instead of OpenAI  
*Why:* [Your reason - cheaper? Better for your use case?]

**Feb 12:** shadcn/ui for components  
*Why:* Copy-paste, full control, looks modern

### Design Decisions

**Feb 12:** Chat interface (not forms)  
*Why:* Core product differentiator - conversational logging

**Feb 12:** Mobile-first design  
*Why:* Users log workouts at gym (on phone)

---

## Questions to Answer

**Before Week 1:**
- [ ] Is existing code salvageable or start fresh?
- [ ] What's the minimum context AI needs (3 workouts? 7 days?)

**Before Week 3:**
- [ ] Google OAuth only or also email/password?
- [ ] Do we need user profiles (name, goals) or just auth?

**Before Week 5:**
- [ ] What's the onboarding message? (First thing AI says)
- [ ] How do we explain what Eco does in 1 sentence?

---

## Risk Management

### High Risk
**"Friends don't use it after Day 3"**  
→ Fix: Week 4 dogfooding with 1 friend, iterate before sharing with 2nd

**"AI costs too much (Gemini API)"**  
→ Fix: Monitor costs Week 2-3, cap at £20/month for testing

**"Code is too messy to add features"**  
→ Fix: Refactor in Week 1 (before building on top)

### Medium Risk
**"Mobile experience is clunky"**  
→ Fix: Test on real phone every week (not just DevTools)

**"Auth doesn't work (Convex issues)"**  
→ Fix: Set up auth in Week 3 early (Monday if needed)

---

## Weekly Workflow

**Saturday Morning:**
1. Review `plans.md` (this file)
2. Open Windsurf with `rules.md` loaded
3. Work on 1-2 tasks (don't spread too thin)

**Saturday Afternoon:**
4. Test what you built
5. Fix immediate bugs
6. Commit to Git

**Sunday Morning:**
7. Continue from Saturday (finish tasks)
8. Test full user flow

**Sunday Afternoon:**
9. Update `plans.md` with progress
10. Screenshot/record demo
11. Share on YouTube/Twitter (optional)

---

## Current Sprint (Feb 15-16)

**This Weekend's Goal:** Legitimate-looking chat UI

**Tasks (In Order):**
1. ✅ **Setup:** Install shadcn/ui, configure
2. ✅ **Design:** Generate chat UI in v0.dev (2-3 variants)
3. 🏗️ **Build:** Implement chosen design
4. 🏗️ **Polish:** Loading states, error handling
5. 🏗️ **Test:** Mobile responsive, actual phone test

**Blockers:**
- None yet (clean slate)

**Notes:**
- Don't get stuck on design perfection (pick one in v0, ship it)
- Focus on mobile first (desktop is bonus)

---

## Metrics to Track

**Weekly:**
- Hours worked (target: 5-7)
- Tasks completed vs planned
- Git commits

**Monthly:**
- Friends actively using (target: 2 by Mar 15)
- Workouts logged (target: 20+ across both friends)
- Retention (do they use it 3+ days in a row?)

**API Costs:**
- Gemini API spend (budget: £20/month max for testing)

---

## When to Pivot

**Stop building if:**
- Week 4 testing: Friend says "this is more annoying than pen & paper"
- Week 5: Neither friend uses it past Day 2
- Costs exceed £50/month with <5 users

**Double down if:**
- Friends say "this is actually easier than [current method]"
- They tell their friends about it unprompted
- They ask for features (= invested)

---

## Next Review

**Date:** Feb 16, 2026 (end of Week 1)  
**Questions:**
1. Is chat UI production-quality?
2. Does it work on mobile?
3. What broke? What surprised you?

Update this file with answers.

---

End of plans.md
