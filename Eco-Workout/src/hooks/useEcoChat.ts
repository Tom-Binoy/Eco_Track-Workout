import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MsgGroup, Branch, Card, AIResponse, Exercise } from "../types";

// ── Auth placeholder (Week 3: replace with real user ID) ───────
const FAKE_USER_ID = "user_01";

// ── Helpers ────────────────────────────────────────────────────

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function parseGeminiJSON(text: string): AIResponse {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { action: "chat_response", message: text, data: null };
  }
}

// Build the visible linear chain from the full tree of groups.
//
// The chain is determined by each group's activeBranch:
//   root → child with parentBranchIndex === root.activeBranch
//        → grandchild with parentBranchIndex === child.activeBranch
//        → …
//
// Switching a group's activeBranch automatically changes which
// children (and grandchildren) appear — giving us Claude-style
// branch navigation for free.
function buildChain(groups: MsgGroup[]): MsgGroup[] {
  if (!groups.length) return [];

  // Index children by "parentId:parentBranchIndex"
  const byParentKey = new Map<string, MsgGroup[]>();
  for (const g of groups) {
    if (g.parentGroupId != null) {
      const key = `${g.parentGroupId}:${g.parentBranchIndex}`;
      if (!byParentKey.has(key)) byParentKey.set(key, []);
      byParentKey.get(key)!.push(g);
    }
  }

  // Start from the root (no parent), walk following activeBranch
  const roots = groups
    .filter(g => g.parentGroupId == null)
    .sort((a, b) => a.timestamp - b.timestamp);

  const chain: MsgGroup[] = [];
  let cur: MsgGroup | null = roots[0] ?? null;
  while (cur) {
    chain.push(cur);
    const key = `${cur.id}:${cur.activeBranch}`;
    const children = (byParentKey.get(key) ?? []).sort((a, b) => a.timestamp - b.timestamp);
    cur = children[0] ?? null;
  }
  return chain;
}

// Build compact context string for Gemini (summaries + last 5 raw turns)
function buildContext(
  summaries: Array<{ content: string }>,
  chain: MsgGroup[]
): string {
  let ctx = "";
  if (summaries.length) {
    ctx += "Previous session summaries:\n";
    ctx += summaries.map(s => s.content).join("\n---\n");
    ctx += "\n\n";
  }
  const last5 = chain.slice(-5);
  if (last5.length) {
    ctx += "Recent conversation:\n";
    ctx += last5
      .map(g => {
        const b = g.branches[g.activeBranch];
        return `User: ${b.userText}\nEco: ${b.ecoText ?? ""}`;
      })
      .join("\n\n");
  }
  return ctx;
}

// ══════════════════════════════════════════════════════════════
// THE HOOK
// ══════════════════════════════════════════════════════════════

export function useEcoChat() {
  // ── Local state ──────────────────────────────────────────────
  const [chatId, setChatId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Abort controller for in-flight AI call
  const abortCtrlRef = useRef<AbortController | null>(null);

  // ── Convex mutations & actions ───────────────────────────────
  const getOrCreateChat        = useMutation(api.myFunctions.getOrCreateTodayChat);
  const createMessageGroupMut  = useMutation(api.myFunctions.createMessageGroup);
  const addBranchToGroupMut    = useMutation(api.myFunctions.addBranchToGroup);
  const updateBranchResponseMut= useMutation(api.myFunctions.updateBranchResponse);
  const setActiveBranchMut     = useMutation(api.myFunctions.setActiveBranch);
  const updateBranchCardsMut   = useMutation(api.myFunctions.updateBranchCards);
  const updateGroupLikesMut    = useMutation(api.myFunctions.updateGroupLikes);
  const createWorkoutSession   = useMutation(api.myFunctions.createWorkoutSession);
  const addExerciseToWorkout   = useMutation(api.myFunctions.addExerciseToWorkout);
  const callGemini             = useAction(api.myFunctions.callGeminiAPI);
  const generateSummaryAction  = useAction(api.myFunctions.generateSummary);

  // ── Convex queries ───────────────────────────────────────────
  const rawGroups = useQuery(
    api.myFunctions.getMessageGroups,
    chatId ? { chatId: chatId as any } : "skip"
  );
  const rawSummaries = useQuery(
    api.myFunctions.getSummaries,
    chatId ? { chatId: chatId as any } : "skip"
  );

  // ── On mount: get or create today's chat ─────────────────────
  useEffect(() => {
    getOrCreateChat({ userId: FAKE_USER_ID, date: getTodayDate() })
      .then(id => setChatId(id as string));
  }, []);

  // ── Transform raw DB docs → typed MsgGroup objects ───────────
  const groups: MsgGroup[] = useMemo(() => {
    if (!rawGroups) return [];
    return rawGroups.map(g => ({
      id: g._id as string,
      parentGroupId: g.parentGroupId as string | undefined,
      parentBranchIndex: g.parentBranchIndex,
      activeBranch: g.activeBranch,
      branches: g.branches as Branch[],
      likes: g.likes as MsgGroup["likes"],
      responseMs: g.responseMs,
      timestamp: g.timestamp,
    }));
  }, [rawGroups]);

  // ── Visible chain ─────────────────────────────────────────────
  const chain = useMemo(() => buildChain(groups), [groups]);

  // ── Summary trigger ──────────────────────────────────────────
  useEffect(() => {
    if (!rawGroups || !chatId) return;
    const count = rawGroups.length;
    if (count > 0 && count % 10 === 0) {
      const toSummarise = rawGroups
        .slice(count - 10, count - 5)
        .map(g => {
          const b = g.branches[g.activeBranch];
          return { userText: b.userText, ecoText: b.ecoText ?? "" };
        });
      generateSummaryAction({
        chatId: chatId as any,
        userId: FAKE_USER_ID,
        messagesToSummarise: toSummarise,
      }).catch(err => console.error("Summary failed:", err));
    }
  }, [rawGroups?.length]);

  // ════════════════════════════════════════════════════════════
  // CORE AI RUNNER
  // Separated so sendMessage and editMessage can share it.
  // targetGroupId + branchIndex tell us exactly where to write
  // the response back.
  // ════════════════════════════════════════════════════════════
  const runAI = useCallback(async (
    userText: string,
    targetGroupId: string,
    branchIndex: number
  ) => {
    abortCtrlRef.current = new AbortController();
    setIsTyping(true);
    const t0 = Date.now();

    try {
      // Build context from summaries + visible chain (not including the new message yet)
      const context = buildContext(rawSummaries ?? [], chain);

      // Call Gemini (non-abortable at the Convex layer — abort is handled client-side below)
      const raw = await callGemini({ userInput: userText, context });

      // If aborted, bail without writing anything
      if (abortCtrlRef.current?.signal.aborted) return;

      const parsed = parseGeminiJSON(raw);
      const rms = Date.now() - t0;

      // Build cards if workout data was returned
      let cards: Card[] | undefined;
      if (parsed.action === "log_workouts" && parsed.data) {
        cards = parsed.data.map((ex: Exercise, i: number) => ({
          ...ex,
          id: Date.now() + i,
          state: "pending" as const,
        }));
      }

      // Persist the response
      await updateBranchResponseMut({
        groupId: targetGroupId as any,
        branchIndex,
        ecoText: parsed.message,
        stopped: false,
        responseMs: rms,
      });

      // If there are cards, write them too
      if (cards?.length) {
        await updateBranchCardsMut({
          groupId: targetGroupId as any,
          branchIndex,
          cards,
        });
      }

    } catch (error: any) {
      // Don't write an error if the user stopped generation
      if (abortCtrlRef.current?.signal.aborted) return;
      console.error("runAI error:", error);
      await updateBranchResponseMut({
        groupId: targetGroupId as any,
        branchIndex,
        ecoText: "Sorry, something went wrong. Try again?",
        stopped: false,
      });
    } finally {
      setIsTyping(false);
    }
  }, [callGemini, updateBranchResponseMut, updateBranchCardsMut, rawSummaries, chain]);

  // ════════════════════════════════════════════════════════════
  // sendMessage — creates a new group as child of the last group
  //              in the current chain.
  // ════════════════════════════════════════════════════════════
  const sendMessage = async (userText: string): Promise<void> => {
    if (!chatId || !userText.trim()) return;

    const lastGroup = chain[chain.length - 1] ?? null;
    const ts = Date.now();

    const groupId = await createMessageGroupMut({
      chatId: chatId as any,
      userId: FAKE_USER_ID,
      parentGroupId: lastGroup?.id as any ?? undefined,
      parentBranchIndex: lastGroup?.activeBranch ?? undefined,
      userText,
      timestamp: ts,
    });

    await runAI(userText, groupId as string, 0);
  };

  // ════════════════════════════════════════════════════════════
  // editMessage — adds a new branch to an existing group.
  //   - The new branch gets the edited userText.
  //   - Existing children that follow the old branch are untouched
  //     in the DB. They simply fall out of the chain because
  //     activeBranch now points to the new branch.
  //   - When the user navigates back via < 1/2 >, activeBranch
  //     changes back and the old children reappear. ✓
  // ════════════════════════════════════════════════════════════
  const editMessage = async (groupId: string, userText: string): Promise<void> => {
    if (!chatId || !userText.trim()) return;

    const ts = Date.now();
    const newBranchIdx = await addBranchToGroupMut({
      groupId: groupId as any,
      userText,
      timestamp: ts,
    });

    await runAI(userText, groupId, newBranchIdx as number);
  };

  // ════════════════════════════════════════════════════════════
  // regenerateMessage — same as editMessage but with same userText.
  // ════════════════════════════════════════════════════════════
  const regenerateMessage = async (groupId: string, userText: string): Promise<void> => {
    await editMessage(groupId, userText);
  };

  // ════════════════════════════════════════════════════════════
  // stop — abort in-flight AI call, mark branch as stopped.
  //   Does NOT delete the user message. Shows "Generation stopped"
  //   with a Retry button.
  // ════════════════════════════════════════════════════════════
  const stop = async (): Promise<void> => {
    abortCtrlRef.current?.abort();
    setIsTyping(false);

    // Find the group + branch that is currently awaiting a response
    // (ecoText is undefined/empty and stopped is false)
    for (const g of groups) {
      const b = g.branches[g.activeBranch];
      if (b && !b.ecoText && !b.stopped) {
        await updateBranchResponseMut({
          groupId: g.id as any,
          branchIndex: g.activeBranch,
          stopped: true,
        });
        break;
      }
    }
  };

  // ════════════════════════════════════════════════════════════
  // setActiveBranch — called from the branch navigator < 1/2 >
  // ════════════════════════════════════════════════════════════
  const setActiveBranch = async (groupId: string, branchIndex: number): Promise<void> => {
    await setActiveBranchMut({ groupId: groupId as any, branchIndex });
  };

  // ════════════════════════════════════════════════════════════
  // updateLikes
  // ════════════════════════════════════════════════════════════
  const updateLikes = async (
    groupId: string,
    likes: "liked" | "disliked" | null
  ): Promise<void> => {
    await updateGroupLikesMut({ groupId: groupId as any, likes: likes ?? undefined });
  };

  // ════════════════════════════════════════════════════════════
  // confirmCard
  // ════════════════════════════════════════════════════════════
  const confirmCard = async (
    groupId: string,
    cardId: number,
    data: Partial<Card>
  ): Promise<void> => {
    const rawGroup = rawGroups?.find(g => g._id === groupId);
    if (!rawGroup) return;

    const branchIndex = rawGroup.activeBranch;
    const branch = rawGroup.branches[branchIndex];
    if (!branch) return;

    const updatedCards = ((branch.cards ?? []) as Card[]).map(c =>
      c.id === cardId ? { ...c, ...data, state: "confirmed" as const } : c
    );
    const allDone = updatedCards.every(c => c.state !== "pending");

    // Get or create workout session (shared across all cards in this branch)
    let workoutId = branch.workoutId as string | undefined;
    if (!workoutId) {
      workoutId = await createWorkoutSession({ userId: FAKE_USER_ID }) as string;
    }

    await updateBranchCardsMut({
      groupId: groupId as any,
      branchIndex,
      cards: updatedCards,
      state: allDone ? "confirmed" : "pending",
      workoutId: workoutId as any,
    });

    const confirmedCard = updatedCards.find(c => c.id === cardId);
    if (confirmedCard) {
      const { id: _id, state: _state, ...exercise } = confirmedCard;
      await addExerciseToWorkout({ workoutId: workoutId as any, exercise });
    }
  };

  // ════════════════════════════════════════════════════════════
  // discardCard
  // ════════════════════════════════════════════════════════════
  const discardCard = async (groupId: string, cardId: number): Promise<void> => {
    const rawGroup = rawGroups?.find(g => g._id === groupId);
    if (!rawGroup) return;

    const branchIndex = rawGroup.activeBranch;
    const branch = rawGroup.branches[branchIndex];
    if (!branch) return;

    const updatedCards = ((branch.cards ?? []) as Card[]).map(c =>
      c.id === cardId ? { ...c, state: "discarded" as const } : c
    );
    const allDone = updatedCards.every(c => c.state !== "pending");

    await updateBranchCardsMut({
      groupId: groupId as any,
      branchIndex,
      cards: updatedCards,
      state: allDone ? "confirmed" : "pending",
    });
  };

  // ── Return ───────────────────────────────────────────────────
  return {
    chain,                // visible conversation — use this to render
    isTyping,
    isLoading: rawGroups === undefined,
    sendMessage,
    editMessage,
    regenerateMessage,
    stop,
    setActiveBranch,
    updateLikes,
    confirmCard,
    discardCard,
  };
}