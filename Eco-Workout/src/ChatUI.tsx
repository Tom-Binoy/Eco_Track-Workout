import { useState, useRef, useEffect } from "react";
import { Message, Card } from "./types";

// ─── Props interface ───────────────────────────────────────────
// ChatUI knows nothing about Convex, Gemini, or any backend.
// It just renders what it's given and calls callbacks.
// NEW
interface EcoChatProps {
  chain: MsgGroup[];
  isTyping: boolean;
  isLoading: boolean;
  onSend: (text: string) => Promise<void>;
  onEdit: (groupId: string, userText: string) => Promise<void>;
  onRegenerate: (groupId: string, userText: string) => Promise<void>;
  onStop: () => Promise<void>;
  onSetActiveBranch: (groupId: string, branchIndex: number) => Promise<void>;
  onLike: (groupId: string, likes: 'liked'|'disliked'|null) => void;
  onConfirmCard: (groupId: string, cardId: number, data: Partial<Card>) => void;
  onDiscardCard: (groupId: string, cardId: number) => void;
}

// ─── Claude.ai exact color tokens ─────────────────────────────
const THEMES = {
  light: {
    bg:            "#F5F5F0",
    composer:      "#FFFFFF",
    composerShadow:"0 0.25rem 1.25rem rgba(0,0,0,0.055)",
    text:          "#1a1a18",
    textMuted:     "#6b6a68",
    textFaint:     "#a8a5a0",
    userBubble:    "#DDD9CE",
    userText:      "#1a1a18",
    border:        "rgba(0,0,0,0.08)",
    borderSubtle:  "rgba(0,0,0,0.04)",
    cardBg:        "#FFFFFF",
    cardShadow:    "0 0.25rem 1.25rem rgba(0,0,0,0.055), 0 1px 3px rgba(0,0,0,0.04)",
    subBg:         "#F5F5F0",
    accent:        "#16a34a",
    accentHover:   "#15803d",
    accentGlow:    "rgba(22,163,74,0.18)",
    toggleBg:      "#e8e5dd",
    confirmBg:     "#f0fdf4",
    confirmBorder: "#d1fae5",
    confirmText:   "#166534",
    confirmMuted:  "#4ade80",
    headerBg:      "rgba(245,245,240,0.85)",
    headerBorder:  "rgba(0,0,0,0.06)",
  },
  dark: {
    bg:            "#2b2a27",
    composer:      "#1f1e1b",
    composerShadow:"0 0.25rem 1.25rem rgba(0,0,0,0.28)",
    text:          "#eeeeee",
    textMuted:     "#9a9893",
    textFaint:     "#5a5855",
    userBubble:    "#393937",
    userText:      "#eeeeee",
    border:        "rgba(255,255,255,0.08)",
    borderSubtle:  "rgba(255,255,255,0.04)",
    cardBg:        "#302f2c",
    cardShadow:    "0 0.25rem 1.25rem rgba(0,0,0,0.32), 0 1px 3px rgba(0,0,0,0.2)",
    subBg:         "#252420",
    accent:        "#22c55e",
    accentHover:   "#16a34a",
    accentGlow:    "rgba(34,197,94,0.2)",
    toggleBg:      "#3a3936",
    confirmBg:     "#0d1f13",
    confirmBorder: "#14532d",
    confirmText:   "#4ade80",
    confirmMuted:  "#166534",
    headerBg:      "rgba(43,42,39,0.85)",
    headerBorder:  "rgba(255,255,255,0.06)",
  },
};

// ─── Guardrails ────────────────────────────────────────────────
const clampInt = (v: any, min = 1) => { const n = parseInt(v, 10); return isNaN(n) ? min : Math.max(min, n); };
const clampDec = (v: any, min = 0, dp = 2) => { const n = parseFloat(v); if (isNaN(n)) return min; return Math.max(min, Math.round(n * 10 ** dp) / 10 ** dp); };
const parseMetric = (v: any, type: string) => type === "distance" ? clampDec(v, 0.01, 2) : clampInt(v, 1);

// ─── Confirmed history row ─────────────────────────────────────
function HistoryRow({ card, T }: { card: Card; T: typeof THEMES.light }) {
  const wt = parseFloat(String(card.weight));
  const sfx = card.metricType === "distance" ? "km" : card.metricType === "duration" ? "s" : "";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: T.confirmBg, border: `1px solid ${T.confirmBorder}`, borderRadius: "10px", gap: "12px", minHeight: "44px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
        <span style={{ color: T.accent, fontSize: "12px", flexShrink: 0 }}>✓</span>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "14px", fontWeight: 600, color: T.confirmText, textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {card.exerciseName}
        </span>
      </div>
      <span style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: T.confirmMuted, flexShrink: 0 }}>
        {card.sets}×{card.metricValue}{sfx}{wt > 0 ? ` · ${card.weight}${card.weightUnit}` : " · bw"}
      </span>
    </div>
  );
}

// ─── Notification card ─────────────────────────────────────────
function NotifCard({ pending, confirmed, onOpen, T }: {
  pending: Card[];
  confirmed: Card[];
  onOpen: () => void;
  T: typeof THEMES.light;
}) {
  return (
    <button onClick={onOpen}
      style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: "12px 16px", textAlign: "left", cursor: "pointer", background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: "12px", boxShadow: T.cardShadow, transition: "all 0.2s cubic-bezier(0.165,0.85,0.45,1)", fontFamily: "Georgia, serif", minHeight: "52px" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `${T.cardShadow}, 0 0 0 2px ${T.accentGlow}`; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = T.cardShadow; e.currentTarget.style.transform = ""; }}>
      <div style={{ position: "relative", width: "10px", height: "10px", flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: "-5px", borderRadius: "50%", background: T.accent, opacity: 0.2, animation: "ripple 2.2s infinite" }} />
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: T.accent }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: T.text }}>
          {pending.length} exercise{pending.length !== 1 ? "s" : ""} ready to confirm
        </p>
        {confirmed.length > 0 && (
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: T.textMuted }}>
            {confirmed.length} already logged
          </p>
        )}
      </div>
      <span style={{ fontSize: "18px", color: T.textFaint }}>›</span>
    </button>
  );
}

// ─── Modal editable card ───────────────────────────────────────
function ModalCard({ card, isTop, stackIndex, total, onConfirm, onDiscard, T }: {
  card: Card;
  isTop: boolean;
  stackIndex: number;
  total: number;
  onConfirm: (id: number, data: Partial<Card>) => void;
  onDiscard: (id: number) => void;
  T: typeof THEMES.light;
}) {
  const [data, setData] = useState({ ...card });
  const wt = parseFloat(String(data.weight));
  const metricLabel = data.metricType === "reps" ? "REPS" : data.metricType === "duration" ? "SECS" : "KM";
  const TILT = [0, 2.2, -1.8, 3.5, -2.5];
  const tilt = isTop ? 0 : TILT[Math.min(stackIndex, TILT.length - 1)];

  const upd = (f: string, v: any) => setData(d => ({ ...d, [f]: v }));
  const commit = (f: string, v: any) => {
    const val = f === "sets" ? clampInt(v, 1) : f === "weight" ? clampDec(v, 0, 2) : f === "metricValue" ? parseMetric(v, data.metricType) : v;
    setData(d => ({ ...d, [f]: val }));
  };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: total - stackIndex, transform: isTop ? "none" : `translateY(${stackIndex * 9}px) rotate(${tilt}deg)`, transition: "transform 0.4s cubic-bezier(0.34,1.2,0.64,1)" }}>
      <div style={{ background: T.cardBg, borderRadius: "20px", border: `1px solid ${T.border}`, padding: "22px", boxShadow: isTop ? T.cardShadow : "none", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "14px", fontFamily: "Georgia, serif" }}>

        <div>
          <p style={{ margin: "0 0 3px", fontSize: "10px", fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.12em" }}>Exercise</p>
          <input value={data.exerciseName} disabled={!isTop} onChange={e => upd("exerciseName", e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", letterSpacing: "0.04em", color: isTop ? T.text : T.textFaint, width: "100%", padding: 0 }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          {[
            { label: "SETS",      field: "sets",        value: data.sets,        step: 1,    min: 1 },
            { label: metricLabel, field: "metricValue", value: data.metricValue, step: data.metricType === "distance" ? 0.01 : 1, min: data.metricType === "distance" ? 0.01 : 1 },
            { label: wt > 0 ? `WT · ${data.weightUnit}` : "WEIGHT", field: "weight", value: data.weight, step: 0.01, min: 0 },
          ].map(({ label, field, value, step, min }) => (
            <div key={field} style={{ background: T.subBg, borderRadius: "10px", padding: "10px 12px" }}>
              <p style={{ margin: "0 0 2px", fontSize: "8px", fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</p>
              <input type="number" value={value as number} step={step} min={min} disabled={!isTop}
                onChange={e => upd(field, e.target.value)} onBlur={e => commit(field, e.target.value)}
                style={{ border: "none", outline: "none", background: "transparent", fontFamily: "'Bebas Neue', sans-serif", fontSize: "26px", letterSpacing: "0.03em", color: field === "weight" && wt === 0 ? T.textFaint : (isTop ? T.text : T.textFaint), padding: 0, width: "100%" }} />
              {field === "weight" && wt === 0 && isTop && (
                <p style={{ margin: "-4px 0 0", fontSize: "9px", color: T.textFaint }}>bodyweight</p>
              )}
            </div>
          ))}
        </div>

        {isTop && (
          <div style={{ display: "flex", gap: "6px" }}>
            {(["reps", "duration", "distance"] as const).map(t => (
              <button key={t} onClick={() => upd("metricType", t)}
                style={{ flex: 1, padding: "8px 6px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", transition: "all 0.15s cubic-bezier(0.165,0.85,0.45,1)", minHeight: "36px",
                  background: data.metricType === t ? T.accent : T.subBg,
                  color:      data.metricType === t ? "#fff"    : T.textMuted }}>
                {t === "duration" ? "Time" : t}
              </button>
            ))}
          </div>
        )}

        {isTop ? (
          <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
            <button onClick={() => onDiscard(card.id)}
              style={{ padding: "12px 18px", borderRadius: "10px", border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, fontFamily: "Georgia, serif", fontWeight: 600, fontSize: "14px", cursor: "pointer", minHeight: "48px", transition: "all 0.15s cubic-bezier(0.165,0.85,0.45,1)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#fca5a5"; e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMuted; e.currentTarget.style.background = "transparent"; }}>
              Discard
            </button>
            <button onClick={() => onConfirm(card.id, data)}
              style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: T.accent, color: "#fff", fontFamily: "Georgia, serif", fontWeight: 700, fontSize: "15px", cursor: "pointer", minHeight: "48px", boxShadow: `0 3px 14px ${T.accentGlow}`, transition: "all 0.2s cubic-bezier(0.165,0.85,0.45,1)" }}
              onMouseEnter={e => { e.currentTarget.style.background = T.accentHover; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 6px 20px ${T.accentGlow}`; }}
              onMouseLeave={e => { e.currentTarget.style.background = T.accent; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 3px 14px ${T.accentGlow}`; }}>
              Confirm ✓
            </button>
          </div>
        ) : (
          <p style={{ textAlign: "center", fontSize: "12px", color: T.textFaint, marginTop: "auto" }}>
            {stackIndex} more in stack
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Card stack modal ──────────────────────────────────────────
function CardModal({ cards, onClose, onConfirm, onDiscard, T }: {
  cards: Card[];
  onClose: () => void;
  onConfirm: (id: number, data: Partial<Card>) => void;
  onDiscard: (id: number) => void;
  T: typeof THEMES.light;
}) {
  const pending = cards.filter(c => c.state === "pending");
  const [exitId, setExitId] = useState<number | null>(null);
  const [exitDir, setExitDir] = useState("up");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const triggerExit = (id: number, dir: string, cb: (id: number) => void) => {
    setExitDir(dir); setExitId(id);
    setTimeout(() => { setExitId(null); cb(id); }, 420);
  };

  const visible = pending.slice(0, 4);

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        background: T.bg === "#F5F5F0" ? "rgba(245,245,240,0.82)" : "rgba(43,42,39,0.88)",
        animation: "fadeIn 0.22s ease" }}>

      <button onClick={onClose}
        style={{ position: "absolute", top: "20px", right: "20px", width: "40px", height: "40px", borderRadius: "50%", border: `1px solid ${T.border}`, background: T.cardBg, color: T.textMuted, fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", boxShadow: T.cardShadow, transition: "all 0.15s cubic-bezier(0.165,0.85,0.45,1)", zIndex: 10 }}
        onMouseEnter={e => { e.currentTarget.style.background = T.subBg; e.currentTarget.style.color = T.text; }}
        onMouseLeave={e => { e.currentTarget.style.background = T.cardBg; e.currentTarget.style.color = T.textMuted; }}>
        ✕
      </button>

      {pending.length > 0 && (
        <div style={{ position: "absolute", top: "26px", left: 0, right: 0, textAlign: "center", pointerEvents: "none" }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: T.textFaint, letterSpacing: "0.04em" }}>
            {pending.length} to confirm · Esc to close
          </span>
        </div>
      )}

      {pending.length > 0 ? (
        <div style={{ position: "relative", width: "100%", maxWidth: "360px", height: "420px" }}>
          {[...visible].reverse().map((card, ri) => {
            const si = visible.length - 1 - ri;
            const isTop = si === 0;
            const isExiting = card.id === exitId;
            return (
              <div key={card.id} style={{ position: "absolute", inset: 0, zIndex: visible.length - si,
                transform: isExiting ? (exitDir === "up" ? "translateY(-130%) rotate(-6deg) scale(0.9)" : "translateX(130%) rotate(12deg) scale(0.88)") : "none",
                opacity: isExiting ? 0 : 1,
                transition: isExiting ? "all 0.42s cubic-bezier(0.22,1,0.36,1)" : "none" }}>
                <ModalCard card={card} isTop={isTop && !exitId} stackIndex={si} total={visible.length} T={T}
                  onConfirm={(id, data) => triggerExit(id, "up",   cb => onConfirm(cb, data))}
                  onDiscard={id         => triggerExit(id, "right", cb => onDiscard(cb))} />
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: "center", animation: "fadeIn 0.3s ease" }}>
          <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "40px", letterSpacing: "0.08em", color: T.accent, margin: "0 0 8px" }}>All Done</p>
          <p style={{ fontFamily: "Georgia, serif", fontSize: "15px", color: T.textMuted, margin: "0 0 24px" }}>Session logged. Go recover.</p>
          <button onClick={onClose}
            style={{ padding: "12px 32px", borderRadius: "10px", border: "none", background: T.accent, color: "#fff", fontFamily: "Georgia, serif", fontWeight: 700, fontSize: "15px", cursor: "pointer", boxShadow: `0 3px 14px ${T.accentGlow}`, minHeight: "48px" }}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────────
export default function ChatUI({
  messages,
  isTyping,
  isLoading,
  onSend,
  onConfirmCard,
  onDiscardCard,
  onRegenerateMessage,
}: EcoChatProps) {
  const [darkMode, setDarkMode] = useState(false);
  const T = THEMES[darkMode ? "dark" : "light"];
  const [ecoTimer, setEcoTimer]       = useState(0);
  const [responseMs, setResponseMs]   = useState<Record<string, number>>({});
  const timerRef                       = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingStartRef                 = useRef<number>(0);
  const [hoveredId, setHoveredId]     = useState<string | null>(null);
  const [likes, setLikes]             = useState<Record<string, boolean>>({});
  const [dislikes, setDislikes]       = useState<Record<string, boolean>>({});
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editVal, setEditVal]         = useState('');

  useEffect(() => {
    if (isTyping) {
      typingStartRef.current = Date.now();
      setEcoTimer(0);
      timerRef.current = setInterval(() => {
        setEcoTimer(Math.floor((Date.now() - typingStartRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      // stamp the last AI message with how long it took
      if (messages.length > 0) {
        const last = messages[messages.length - 1];
        if (last.eco) {
          const elapsed = Date.now() - typingStartRef.current;
          setResponseMs(prev => ({ ...prev, [last.id]: elapsed }));
        }
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTyping]);

  // Which message's modal is open (null = closed)
  const [modalMessageId, setModalMessageId] = useState<string | null>(null);

  const [val, setVal]         = useState("");
  const bottomRef             = useRef<HTMLDivElement>(null);
  const textareaRef           = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages update or typing indicator changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  };

  const send = () => {
    if (!val.trim() || isTyping) return;
    const text = val.trim();
    setVal("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    onSend(text);
  };

  // Cards for the currently open modal
  const modalMessage = modalMessageId
    ? messages.find(m => m.id === modalMessageId)
    : null;
  const modalCards = modalMessage?.cards ?? [];

  function MessageActions({ isUser, onEdit, onRegenerate, onCopy, onLike, onDislike, liked, disliked, T }: {
    isUser: boolean; onEdit?: () => void; onRegenerate?: () => void;
    onCopy?: () => void; onLike?: () => void; onDislike?: () => void;
    liked?: boolean; disliked?: boolean; T: typeof THEMES.light;
  }) {
    const btn: React.CSSProperties = {
      background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
      borderRadius: '6px', color: T.textFaint, fontSize: '13px',
      transition: 'color 0.15s, background 0.15s', minWidth: '24px', minHeight: '24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    };
    return (
      <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
        {isUser && onEdit && (
          <button style={btn} title="Edit" onClick={onEdit}
            onMouseEnter={e => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.textFaint; e.currentTarget.style.background = 'none'; }}>✏️</button>
        )}
        {!isUser && onRegenerate && (
          <button style={btn} title="Regenerate" onClick={onRegenerate}
            onMouseEnter={e => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.textFaint; e.currentTarget.style.background = 'none'; }}>↺</button>
        )}
        {!isUser && onCopy && (
          <button style={btn} title="Copy" onClick={onCopy}
            onMouseEnter={e => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.textFaint; e.currentTarget.style.background = 'none'; }}>⎘</button>
        )}
        {!isUser && onLike && (
          <button style={btn} title="Good response" onClick={onLike}
            onMouseEnter={e => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.textFaint; e.currentTarget.style.background = 'none'; }}
            data-active={liked}>
            {liked ? '👍' : '👍'}
          </button>
        )}
        {!isUser && onDislike && (
          <button style={btn} title="Bad response" onClick={onDislike}
            onMouseEnter={e => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.textFaint; e.currentTarget.style.background = 'none'; }}>
            {disliked ? '👎' : '👎'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: T.bg, display: "flex", flexDirection: "column", transition: "background 0.3s ease" }}>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-4px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:none} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes ripple { 0%,100%{opacity:0.2;transform:scale(1)} 50%{opacity:0.07;transform:scale(1.8)} }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        background: T.headerBg,
        borderBottom: `1px solid ${T.headerBorder}`,
        height: "52px",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 56px",
      }}>
        <p style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: "14px", fontWeight: 600, color: T.text, letterSpacing: "0.01em", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {isLoading ? "Loading..." : "Today's Session"}
        </p>
        <button onClick={() => setDarkMode(d => !d)}
          style={{ position: "absolute", right: "12px", width: "36px", height: "36px", borderRadius: "50%", border: `1px solid ${T.border}`, background: T.toggleBg, fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s cubic-bezier(0.165,0.85,0.45,1)" }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
          onMouseLeave={e => e.currentTarget.style.transform = ""}>
          {darkMode ? "☀️" : "🌙"}
        </button>
      </div>

      {/* ── Feed ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, paddingBottom: "170px", paddingTop: "52px" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto", padding: "32px 16px 0" }}>

          {/* Empty state */}
          {messages.length === 0 && !isLoading && (
            <p style={{ fontFamily: "Georgia, serif", fontSize: "15px", color: T.textMuted, textAlign: "center", marginTop: "48px" }}>
              What did you train today?
            </p>
          )}

          {/* Message pairs */}
          {messages.map(msg => {
            const msgPending   = (msg.cards ?? []).filter(c => c.state === 'pending');
            const msgConfirmed = (msg.cards ?? []).filter(c => c.state === 'confirmed');
            const isHovered    = hoveredId === msg.id;
            const isOptimistic = msg.id === 'optimistic';

            const formatTime = (ts?: number) => {
              if (!ts) return '';
              return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            };

            return (
              <div key={msg.id} style={{ marginBottom: '24px', animation: 'fadeUp 0.28s ease' }}
                onMouseEnter={() => setHoveredId(msg.id)}
                onMouseLeave={() => setHoveredId(null)}>

                {/* User bubble */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  {editingId === msg.id ? (
                    <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <textarea value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus
                        style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '11px 16px', background: T.userBubble, color: T.userText, fontFamily: 'Georgia, serif', fontSize: '15px', resize: 'none', outline: 'none', minHeight: '60px', lineHeight: 1.7 }} />
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingId(null)} style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${T.border}`, background: 'transparent', color: T.textMuted, cursor: 'pointer', fontSize: '13px', fontFamily: 'Georgia, serif' }}>Cancel</button>
                        <button onClick={() => { onRegenerateMessage(msg.id, editVal); setEditingId(null); }}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: T.accent, color: '#fff', cursor: 'pointer', fontSize: '13px', fontFamily: 'Georgia, serif', fontWeight: 700 }}>Send ↑</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ maxWidth: '78%', padding: '11px 16px', borderRadius: '18px 18px 4px 18px', background: T.userBubble, boxShadow: `0 1px 3px ${T.borderSubtle}`, opacity: isOptimistic ? 0.6 : 1 }}>
                      <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '15px', fontWeight: 400, color: T.userText, lineHeight: 1.7 }}>
                        {msg.user}
                      </p>
                    </div>
                  )}
                  {/* User message actions + time */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', opacity: (isHovered || window.matchMedia('(hover: none)').matches) ? 1 : 0, transition: 'opacity 0.15s' }}>
                    {msg.timestamp && <span style={{ fontSize: '11px', color: T.textFaint, fontFamily: 'Georgia, serif' }}>{formatTime(msg.timestamp)}</span>}
                    {!isOptimistic && editingId !== msg.id && (
                      <MessageActions isUser T={T} onEdit={() => { setEditingId(msg.id); setEditVal(msg.user); }} />
                    )}
                  </div>
                </div>

                {/* Eco reply */}
                {msg.eco && (
                  <div>
                    <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '15px', fontWeight: 400, color: T.text, lineHeight: 1.75, marginBottom: msg.cards && msg.cards.length > 0 ? '12px' : 0 }}>
                      {msg.eco}
                    </p>
                  {msg.cards && msg.cards.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '6px' }}>
                      {msgConfirmed.map(c => <HistoryRow key={c.id} card={c} T={T} />)}
                      {msgPending.length > 0 && (
                        <NotifCard pending={msgPending} confirmed={msgConfirmed} onOpen={() => setModalMessageId(msg.id)} T={T} />
                      )}
                    </div>
                  )}
                  {/* AI message actions + response time */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', opacity: (isHovered || window.matchMedia('(hover: none)').matches) ? 1 : 0, transition: 'opacity 0.15s' }}>
                    {responseMs[msg.id] && (
                      <span style={{ fontSize: '11px', color: T.textFaint, fontFamily: 'Georgia, serif' }}>
                        {(responseMs[msg.id] / 1000).toFixed(1)}s
                      </span>
                    )}
                    <MessageActions isUser={false} T={T}
                      onRegenerate={() => onRegenerateMessage(msg.id, msg.user)}
                      onCopy={() => navigator.clipboard.writeText(msg.eco)}
                      onLike={() => setLikes(p => ({ ...p, [msg.id]: !p[msg.id] }))}
                      onDislike={() => setDislikes(p => ({ ...p, [msg.id]: !p[msg.id] }))}
                      liked={likes[msg.id]} disliked={dislikes[msg.id]}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

          {isTyping && (
            <div style={{ marginBottom: '24px', animation: 'fadeUp 0.28s ease' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '24px' }}>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: T.textFaint, animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: '11px', color: T.textFaint }}>
                  {ecoTimer}s
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Composer ──────────────────────────────────────────── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50 }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "150px", background: `linear-gradient(to top, ${T.bg} 50%, transparent)`, pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: "680px", margin: "0 auto", padding: `0 16px calc(20px + env(safe-area-inset-bottom))` }}>
          <div style={{ background: T.composer, borderRadius: "16px", border: `1px solid ${T.border}`, boxShadow: T.composerShadow, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px 0" }}>
              <textarea
                ref={textareaRef}
                value={val}
                rows={1}
                onChange={e => { setVal(e.target.value); resizeTextarea(); }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder="What did you train today?"
                disabled={isTyping || isLoading}
                style={{ border: "none", outline: "none", background: "transparent", width: "100%", resize: "none", overflow: "hidden", fontFamily: "Georgia, serif", fontSize: "15px", fontWeight: 400, color: T.text, lineHeight: 1.65, display: "block" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px 10px" }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: "11px", color: T.textFaint }}>
                Enter to send · Shift+Enter for new line
              </span>
              <button onClick={send} disabled={!val.trim() || isTyping}
                style={{ width: "36px", height: "36px", borderRadius: "10px", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: val.trim() && !isTyping ? "pointer" : "default", background: val.trim() && !isTyping ? T.accent : T.subBg, color: val.trim() && !isTyping ? "#fff" : T.textFaint, transition: "all 0.2s cubic-bezier(0.165,0.85,0.45,1)", boxShadow: val.trim() ? `0 2px 8px ${T.accentGlow}` : "none", fontSize: "16px", flexShrink: 0 }}
                onMouseEnter={e => { if (val.trim()) { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.background = T.accentHover; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.background = val.trim() && !isTyping ? T.accent : T.subBg; }}>
                ↑
              </button>
            </div>
          </div>
          <p style={{ textAlign: "center", marginTop: "6px", fontSize: "11px", color: T.textFaint, fontFamily: "Georgia, serif" }}>
            Eco Track · Session active
          </p>
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────── */}
      {modalMessageId && (
        <CardModal
          cards={modalCards}
          onClose={() => setModalMessageId(null)}
          onConfirm={(cardId, data) => onConfirmCard(modalMessageId, cardId, data)}
          onDiscard={(cardId) => onDiscardCard(modalMessageId, cardId)}
          T={T}
        />
      )}
    </div>
  );
}
