import { useEffect, useState } from "react";
import type { Message } from "./types/message";
import { fetchHistory, sendMessage } from "./services/chatApi";

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory()
      .then(setMessages)
      .catch(() => setError("Unable to load conversation history."));
  }, []);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const reply = await sendMessage(trimmed);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
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
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-white border-b px-6 py-4 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-800">AI Chatbot</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-4 max-w-2xl w-full mx-auto">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-4 py-2 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-800 border"
              }`}
            >
              <p className="text-xs font-medium mb-1 opacity-70">
                {msg.role === "user" ? "You" : "Assistant"}
              </p>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-lg px-4 py-2 bg-white text-gray-500 border italic">
              AI is thinking...
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {error}
          </div>
        )}
      </main>

      <footer className="bg-white border-t px-6 py-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask something..."
            rows={1}
            className="flex-1 resize-none border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
