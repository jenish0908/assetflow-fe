import { Check, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { useAgentChat } from "../api/hooks";
import type { ToolTrace } from "../api/types";
import { useSession } from "../auth";
import { Notice, PageHead } from "../components/ui";

interface Turn {
  id: number;
  question: string;
  reply?: string;
  error?: string;
  tools: ToolTrace[];
}

const toolNames: Record<string, string> = {
  getAssetInfo: "Looked up",
  createAsset: "Created asset",
  updateAsset: "Updated asset",
  allocateAsset: "Allocated",
  updateAssetStatus: "Changed status",
  addUser: "Added person",
};

/** A short, readable summary of the arguments the model sent. */
function summarize(t: ToolTrace): string {
  try {
    const args = JSON.parse(t.arguments) as Record<string, unknown>;
    return Object.values(args)
      .filter((v) => typeof v === "string" || typeof v === "number")
      .join(", ");
  } catch {
    return t.arguments;
  }
}

const suggestions = [
  "show L-102",
  "allocate laptop L-102 to Priya",
  "create laptop L-500 named Dell XPS 13; allocate L-500 to Priya then show L-500",
  "mark M-7 as maintenance",
];

let nextId = 1;

export function AssistantPage() {
  const { features, user } = useSession();
  const chat = useAgentChat();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" }), [turns, chat.isPending]);

  function ask(question: string) {
    const q = question.trim();
    if (!q || chat.isPending) return;
    const id = nextId++;
    setTurns((t) => [...t, { id, question: q, tools: [] }]);
    setText("");
    chat.mutate(q, {
      onSuccess: (r) => setTurns((t) => t.map((x) => (x.id === id ? { ...x, reply: r.reply, tools: r.tool_calls } : x))),
      onError: (e) => setTurns((t) => t.map((x) => (x.id === id ? { ...x, error: e.message } : x))),
    });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    ask(text);
  }

  return (
    <div className="chat">
      <div>
        <PageHead
          title="Assistant"
          intro="Ask for what you want done. Every action is checked against your role before it runs, whatever the assistant decides."
        />
        {features?.agent === "fake" && (
          <div style={{ marginBottom: 20 }}>
            <Notice>
              Running the built-in rule-based model (no OpenAI key on this server). It understands short commands like the examples below.
            </Notice>
          </div>
        )}

        <div className="chat-log" aria-live="polite">
          {turns.length === 0 && (
            <div>
              <p className="muted">Try one of these{user?.role === "viewer" ? " (as a viewer you can only look things up)" : ""}:</p>
              <div className="suggestions">
                {suggestions.map((s) => (
                  <button key={s} type="button" className="suggestion" onClick={() => ask(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((t) => (
            <div key={t.id} style={{ display: "contents" }}>
              <div className="msg msg-user">{t.question}</div>
              {t.reply !== undefined || t.error !== undefined ? (
                <div className="msg msg-bot" data-error={t.error !== undefined}>
                  <div className="msg-bot-text">{t.reply ?? t.error}</div>
                  {t.tools.length > 0 && (
                    <ul className="trace" aria-label="What the assistant did">
                      {t.tools.map((tool, i) => (
                        <li key={i}>
                          {tool.ok ? <Check size={14} className="trace-ok" aria-label="succeeded" /> : <X size={14} className="trace-fail" aria-label="failed" />}
                          <span className="trace-name">{toolNames[tool.name] ?? tool.name}</span>
                          <span>{summarize(tool)}</span>
                          <span className="num">{tool.duration_ms.toFixed(1)} ms</span>
                          {tool.error && <span className="trace-fail">{tool.error}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="msg msg-bot" aria-label="Assistant is working">
                  <div className="msg-bot-text typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      <div className="composer">
        <form onSubmit={submit}>
          <label className="visually-hidden" htmlFor="ask">
            Message the assistant
          </label>
          <input
            id="ask"
            className="input"
            placeholder="For example: allocate laptop L-102 to Priya"
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary" disabled={!text.trim() || chat.isPending}>
            <SendHorizontal size={17} aria-hidden="true" /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
