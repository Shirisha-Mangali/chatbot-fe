import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Attachment, Conversation, Message } from "./types/message";
import {
  createConversation,
  fetchHistory,
  listConversations,
  sendMessage,
} from "./services/chatApi";

function BotIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="8" width="16" height="12" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="3.5" r="1.5" fill="currentColor" />
      <circle cx="9" cy="14" r="1.4" fill="currentColor" />
      <circle cx="15" cy="14" r="1.4" fill="currentColor" />
      <path d="M2 13h2M20 13h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SidebarToggleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 4v16" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function SendIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AttachIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M17.5 8.5l-7 7a3 3 0 104.24 4.24l7.07-7.07a5 5 0 00-7.07-7.07l-7.07 7.07a7 7 0 009.9 9.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6 3h8l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function init() {
      try {
        const existing = await listConversations();
        if (existing.length === 0) {
          const created = await createConversation();
          setConversations([created]);
          setActiveConversationId(created.id);
          return;
        }
        setConversations(existing);
        setActiveConversationId(existing[0].id);
      } catch {
        setError("Unable to load conversations.");
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!activeConversationId) return;
    fetchHistory(activeConversationId)
      .then(setMessages)
      .catch(() => setError("Unable to load conversation history."));
  }, [activeConversationId]);

  async function handleNewChat() {
    try {
      const created = await createConversation();
      setConversations((prev) => [created, ...prev]);
      setActiveConversationId(created.id);
      setMessages([]);
    } catch {
      setError("Unable to create a new chat.");
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF attachments are supported right now.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("File is too large. Max size is 5MB.");
      return;
    }
    setError(null);
    setPendingFile(file);
  }

  async function handleSend() {
    const trimmed = input.trim();
    if ((!trimmed && !pendingFile) || loading || !activeConversationId) return;

    let attachment: Attachment | undefined;
    if (pendingFile) {
      attachment = {
        mime_type: pendingFile.type,
        filename: pendingFile.name,
        data_base64: await fileToBase64(pendingFile),
      };
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: trimmed,
        attachment_mime: attachment?.mime_type,
        attachment_filename: attachment?.filename,
        attachment_data: attachment?.data_base64,
      },
    ]);
    setInput("");
    setPendingFile(null);
    setLoading(true);
    setError(null);

    try {
      const reply = await sendMessage(activeConversationId, trimmed, attachment);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      const updated = await listConversations();
      setConversations(updated);
    } catch {
      setError("Unable to get a response. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="h-screen flex bg-black overflow-hidden">
      <aside
        className={`shrink-0 h-screen bg-black border-r border-white/10 flex flex-col overflow-hidden transition-all duration-200 ${
          sidebarCollapsed ? "w-0 border-r-0" : "w-72"
        }`}
      >
        <div className="w-72 flex flex-col h-full">
          <div className="px-5 py-6 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 via-violet-600 to-purple-800 flex items-center justify-center text-white shadow-[0_0_20px_rgba(192,38,211,0.5)]">
                <BotIcon />
              </div>
              <h1 className="font-brand text-lg font-bold text-white tracking-tight">
                Cognine<span className="text-fuchsia-400">Chat</span>
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="text-white/40 hover:text-white transition-colors"
              aria-label="Collapse sidebar"
            >
              <SidebarToggleIcon />
            </button>
          </div>

          <div className="px-4 pb-4">
            <button
              type="button"
              onClick={handleNewChat}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.06] border border-white/10 text-white/90 font-medium text-sm hover:bg-white/[0.1] hover:border-white/20 transition-all"
            >
              <span className="text-fuchsia-400 text-base leading-none">+</span> New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setActiveConversationId(conv.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm truncate transition-colors ${
                  conv.id === activeConversationId
                    ? "bg-fuchsia-500/10 text-white font-medium border border-fuchsia-500/30 shadow-[0_0_15px_rgba(192,38,211,0.15)]"
                    : "text-white/50 hover:bg-white/[0.05] hover:text-white/90"
                }`}
              >
                {conv.title || "Untitled chat"}
              </button>
            ))}
          </div>

          <div className="px-5 py-4 border-t border-white/10 text-xs text-white/30">
            Powered by Groq
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-black relative">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(168,85,247,0.15),transparent)]" />

        <header className="relative shrink-0 flex items-center gap-3 bg-black/60 backdrop-blur border-b border-white/10 px-8 py-5">
          {sidebarCollapsed && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="text-white/40 hover:text-white transition-colors"
              aria-label="Expand sidebar"
            >
              <SidebarToggleIcon />
            </button>
          )}
          <h2 className="font-brand text-xl font-bold text-white tracking-tight">
            {conversations.find((c) => c.id === activeConversationId)?.title || "New conversation"}
          </h2>
        </header>

        <main className="relative flex-1 min-h-0 overflow-y-auto px-8 py-6 space-y-5 max-w-3xl w-full mx-auto">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 pt-16">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-fuchsia-400 via-violet-600 to-purple-900 shadow-[0_0_60px_rgba(192,38,211,0.5)]" />
              <p className="font-brand text-2xl font-bold text-white mt-4">
                Ready to Create Something New?
              </p>
              <p className="text-sm text-white/40">Ask anything to get going.</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-fuchsia-500 via-violet-600 to-purple-800 flex items-center justify-center text-white shadow-[0_0_15px_rgba(192,38,211,0.4)]">
                  <BotIcon />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-fuchsia-600 to-violet-700 text-white rounded-br-sm shadow-[0_0_20px_rgba(192,38,211,0.25)]"
                    : "bg-white/[0.05] text-white/90 border border-white/10 rounded-bl-sm"
                }`}
              >
                {msg.attachment_data && msg.attachment_mime?.startsWith("image/") && (
                  <img
                    src={`data:${msg.attachment_mime};base64,${msg.attachment_data}`}
                    alt={msg.attachment_filename ?? "attachment"}
                    className="max-w-full max-h-64 rounded-lg mb-2 border border-white/10"
                  />
                )}
                {msg.attachment_data && msg.attachment_mime === "application/pdf" && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-xs">
                    <FileIcon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{msg.attachment_filename}</span>
                  </div>
                )}
                {msg.role === "assistant" ? (
                  <div className="markdown-body text-sm leading-relaxed">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content && (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                  )
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-fuchsia-500 via-violet-600 to-purple-800 flex items-center justify-center text-white shadow-[0_0_15px_rgba(192,38,211,0.4)]">
                <BotIcon />
              </div>
              <div className="max-w-[75%] rounded-2xl rounded-bl-sm px-4 py-3 bg-white/[0.05] border border-white/10 text-white/40 text-sm italic">
                Thinking...
              </div>
            </div>
          )}

          {error && (
            <div className="text-center text-sm text-rose-300 bg-rose-950/40 border border-rose-800/40 rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}
        </main>

        <footer className="relative shrink-0 bg-black/60 backdrop-blur px-8 py-6">
          <div className="max-w-3xl mx-auto">
            {pendingFile && (
              <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-white/80">
                <FileIcon className="w-3.5 h-3.5" />
                <span className="truncate max-w-[200px]">{pendingFile.name}</span>
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  className="text-white/40 hover:text-white"
                  aria-label="Remove attachment"
                >
                  ×
                </button>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-3xl bg-white/[0.05] border border-white/10 px-4 py-3 focus-within:border-fuchsia-500/50 focus-within:shadow-[0_0_25px_rgba(192,38,211,0.15)] transition-all">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-white/40 hover:text-white pb-2 transition-colors"
                aria-label="Attach file"
              >
                <AttachIcon />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Anything..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-white placeholder:text-white/30 py-2 text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || (!input.trim() && !pendingFile)}
                className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(192,38,211,0.4)] hover:from-fuchsia-400 hover:to-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
