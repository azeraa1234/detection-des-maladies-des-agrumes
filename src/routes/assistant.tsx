import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendChatMessage } from "@/lib/api";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Assistant IA — Analysi M3ana" },
      { name: "description", content: "Discutez avec notre expert agronome virtuel pour analyser vos cultures." },
    ],
  }),
  component: AssistantChat,
});

type Message = {
  id: string;
  role: "user" | "bot";
  content: string;
};

function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "bot",
      content: "Salam! Kifach n9dr n3awnek f zira3a dyalek lyouma? Ana hna bach njaweb 3la ga3 tساؤلات dyalek 3la l'amrad w lfala7a.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const reply = await sendChatMessage(userMessage.content);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: reply,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: "Sme7 lia, w9e3 mouchkil m3a serveur. 3awd jereb men be3d.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-2xl border border-border bg-background shadow-sm glass">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary glow-green">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Khabir Zira3i (IA)</h2>
          <p className="text-sm text-muted-foreground">Propulsé par Google Gemini</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-4 text-base",
              msg.role === "user" ? "flex-row-reverse" : ""
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                msg.role === "user"
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary/20 text-primary"
              )}
            >
              {msg.role === "user" ? (
                <User className="h-5 w-5" />
              ) : (
                <Bot className="h-5 w-5" />
              )}
            </div>
            <div
              className={cn(
                "max-w-[80%] rounded-3xl px-6 py-4 shadow-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm whitespace-pre-wrap leading-relaxed"
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 text-base">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex items-center rounded-3xl px-6 py-4 bg-muted text-foreground rounded-tl-sm">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background p-4 sm:p-6 rounded-b-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Kteb sou2al dyalek hna (matalan: Kifach n7mi nebti mn l7acharat?)..."
            className="w-full rounded-full border border-input bg-muted/50 py-4 pl-6 pr-16 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50"
          >
            <Send className="h-5 w-5 ml-1" />
          </button>
        </form>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          L'IA peut faire des erreurs. Vérifiez toujours les recommandations agricoles critiques.
        </p>
      </div>
    </div>
  );
}
