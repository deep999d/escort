"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, Send } from "lucide-react";

interface Message {
  id: string;
  sender_type: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function ChatPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const res = await fetch(`/api/v1/messages/conversations/${conversationId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    setInput("");
    const res = await fetch(`/api/v1/messages/conversations/${conversationId}/messages?sender_type=user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((m) => [...m, data]);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <div className="animate-pulse h-8 w-48 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col max-w-2xl mx-auto">
      <div className="flex items-center gap-2 p-4 border-b">
        <Link href="/" className="p-1 -ml-1 text-zinc-600 dark:text-zinc-400">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <span className="font-medium">Conversation</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender_type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2 ${
                m.sender_type === "user"
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              }`}
            >
              <p className="text-sm">{m.content}</p>
              <p className="text-xs opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString()}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2"
        />
        <button type="submit" className="p-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
          <Send className="w-5 h-5" />
        </button>
      </form>
    </main>
  );
}
