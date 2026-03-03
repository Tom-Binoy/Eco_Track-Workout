// ─── Core exercise/card types ──────────────────────────────────
export type MetricType = "reps" | "duration" | "distance";
export type WeightUnit = "kg" | "lbs";

export interface Exercise {
  exerciseName: string;
  sets: number;
  metricType: MetricType;
  metricValue: number;
  weight?: number;
  weightUnit?: WeightUnit;
}

export interface Card extends Exercise {
  id: number;
  state: "pending" | "confirmed" | "discarded";
}

// ─── Branch ────────────────────────────────────────────────────
// One branch = one version of a conversation turn.
// A group starts with branch[0]; each user edit adds branch[n].
export interface Branch {
  userText: string;
  ecoText?: string;        // undefined = still loading; "" = loading; string = done
  stopped?: boolean;       // true if user hit Stop during this branch's generation
  cards?: Card[];
  workoutId?: string;
  state: "pending" | "confirmed" | "editing";
  timestamp: number;
}

// ─── Message Group ─────────────────────────────────────────────
// One group = one position in the conversation (one user turn).
// branches[] holds all versions (original + edits/regenerations).
// The tree is formed by parentGroupId + parentBranchIndex.
export interface MsgGroup {
  id: string;                    // Convex _id
  parentGroupId?: string;        // undefined = root (first message)
  parentBranchIndex?: number;    // which branch of parent this group follows from
  activeBranch: number;          // currently viewed branch index
  branches: Branch[];
  cards?: Card[];                // convenience — mirrors activeBranch's cards
  likes?: "liked" | "disliked" | null;
  responseMs?: number | null;
  timestamp: number;
}

// ─── AI response shape ─────────────────────────────────────────
export interface AIResponse {
  action: "log_workouts" | "chat_response";
  message: string;
  data: Exercise[] | null;
}