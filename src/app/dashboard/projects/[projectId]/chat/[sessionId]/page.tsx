"use client";

import { use, useRef, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Building2,
  User,
  Loader2,
  ChevronDown,
  FileSearch,
  ClipboardList,
  Scale,
  HardHat,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChatMessageSkeleton } from "@/components/loading-skeletons";

interface Source {
  document_name: string;
  chunk_text: string;
  chunk_index: number;
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ projectId: string; sessionId: string }>;
}) {
  const { projectId, sessionId } = use(params);
  const [input, setInput] = useState("");
  const [expandedSources, setExpandedSources] = useState<
    Record<string, boolean>
  >({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();

  const sessionQuery = trpc.chat.getSession.useQuery({
    sessionId,
  });

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      utils.chat.getSession.invalidate({ sessionId });
      utils.chat.listSessions.invalidate({ projectId });
    },
    onError: (error) => {
      toast.error(error.message);
      utils.chat.getSession.invalidate({ sessionId });
    },
  });

  const messages = sessionQuery.data?.messages ?? [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sendMessage.isPending]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sendMessage.isPending) return;

    setInput("");
    sendMessage.mutate({
      sessionId,
      content: trimmed,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleSources = (messageId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const handleQuickPrompt = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  if (sessionQuery.isLoading) {
    return <ChatMessageSkeleton />;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="glass rounded-xl p-8 text-center max-w-md">
          <p className="text-destructive font-medium mb-2">
            Chat session not found
          </p>
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="text-sm text-primary hover:underline"
          >
            Back to Project
          </Link>
        </div>
      </div>
    );
  }

  const showZeroState = messages.length === 0;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b border-border/50 glass px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              {sessionQuery.data.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {sessionQuery.data.project.name}
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4">
        {showZeroState ? (
          <ZeroState
            onPromptClick={handleQuickPrompt}
            inputValue={input}
            onInputChange={setInput}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            isPending={sendMessage.isPending}
            textareaRef={textareaRef}
          />
        ) : (
          <>
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              const sources = msg.sources as Source[] | null;
              const isExpanded = !!expandedSources[msg.id];

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 max-w-[85%] animate-fade-in",
                    isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                      isUser
                        ? "bg-primary/10 border-primary/20 text-primary"
                        : "bg-muted/50 border-border text-muted-foreground"
                    )}
                  >
                    {isUser ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Building2 className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex flex-col space-y-1.5 min-w-0">
                    <div
                      className={cn(
                        "rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                        isUser
                          ? "bg-primary/10 border border-primary/20 text-foreground"
                          : "glass"
                      )}
                    >
                      {msg.content}
                    </div>

                    {!isUser && sources && sources.length > 0 && (
                      <div>
                        <button
                          onClick={() => toggleSources(msg.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                        >
                          <ChevronDown
                            className={cn(
                              "w-3 h-3 transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                          {isExpanded ? "Hide" : "Show"} sources (
                          {sources.length})
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-2 max-w-lg">
                            {sources.map((source, idx) => (
                              <div
                                key={idx}
                                className="bg-card/80 border border-border rounded-lg p-3 text-xs"
                              >
                                <div className="flex items-center justify-between text-muted-foreground font-medium mb-1.5 pb-1.5 border-b border-border/50">
                                  <span className="truncate">
                                    {source.document_name}
                                  </span>
                                  <span className="shrink-0 ml-2 font-mono">
                                    Chunk #{source.chunk_index}
                                  </span>
                                </div>
                                <p className="text-muted-foreground leading-relaxed">
                                  {source.chunk_text}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {sendMessage.isPending && (
              <div className="flex gap-3 max-w-[80%] mr-auto animate-fade-in">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/50 border border-border text-muted-foreground shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="glass rounded-xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-xs text-muted-foreground font-medium">
                    Searching documents and generating response...
                  </span>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Bottom Input (visible when messages exist) */}
      {!showZeroState && (
        <div className="border-t border-border/50 p-4 shrink-0 glass">
          <form
            onSubmit={handleSend}
            className="max-w-3xl mx-auto"
          >
            <div className="glass rounded-xl p-3 focus-within:ring-1 focus-within:ring-primary/30">
              <textarea
                ref={textareaRef}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sendMessage.isPending}
                placeholder="Ask about your project documents..."
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none resize-none disabled:opacity-50"
                aria-label="Chat message input"
              />
              <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-1">
                <span className="text-[10px] text-muted-foreground font-mono">
                  Enter to send · Shift+Enter for new line
                </span>
                <button
                  type="submit"
                  disabled={!input.trim() || sendMessage.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-1.5 flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-3 h-3" />
                  Send
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ZeroState({
  onPromptClick,
  inputValue,
  onInputChange,
  onSend,
  onKeyDown,
  isPending,
  textareaRef,
}: {
  onPromptClick: (text: string) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (e?: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isPending: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const quickPrompts = [
    {
      icon: FileSearch,
      label: "Find Building Code Requirements",
      prompt:
        "What are the key building code requirements mentioned in the project documents?",
    },
    {
      icon: ClipboardList,
      label: "Summarize Specifications",
      prompt:
        "Summarize the main specifications and standards referenced in the documents.",
    },
    {
      icon: Scale,
      label: "Check Compliance",
      prompt:
        "What compliance requirements and regulatory standards are referenced in these documents?",
    },
    {
      icon: HardHat,
      label: "Review Safety Protocols",
      prompt:
        "List all safety requirements, hazard warnings, and protective measures described in the documents.",
    },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-2xl mx-auto w-full">
      <h3 className="text-2xl font-semibold tracking-tight mb-2">
        How can I help today?
      </h3>
      <p className="text-sm text-muted-foreground mb-8">
        Ask questions about your project&apos;s AEC documents
      </p>

      {/* Central input box */}
      <div className="w-full glass rounded-2xl p-4 glow-amber mb-6">
        <textarea
          ref={textareaRef}
          rows={3}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={isPending}
          placeholder="Ask about building codes, specs, RFIs, submittals..."
          className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none resize-none leading-relaxed"
          aria-label="Chat message input"
        />
        <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-2">
          <span className="text-[10px] text-muted-foreground font-mono">
            Enter to send
          </span>
          <button
            type="button"
            onClick={() => onSend()}
            disabled={!inputValue.trim() || isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-1.5 flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3 h-3" />
            Send
          </button>
        </div>
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        {quickPrompts.map((qp) => (
          <button
            key={qp.label}
            type="button"
            onClick={() => onPromptClick(qp.prompt)}
            className="flex items-center gap-1.5 glass glass-hover rounded-full px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground font-medium"
          >
            <qp.icon className="w-3 h-3" />
            {qp.label}
          </button>
        ))}
      </div>
    </div>
  );
}
