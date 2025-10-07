"use client";

import { useState, useEffect, useRef } from "react";
import { useChat, useRoomContext } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { X, Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChatPanel({ onClose }: { onClose?: () => void }) {
  const room = useRoomContext();
  const { chatMessages, send } = useChat();
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const localParticipantName = room.localParticipant?.identity || "You";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Focus input when chat opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    try {
      await send(inputMessage.trim());
      setInputMessage("");
    } catch (error) {
      console.error("Error sending chat message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed right-2 md:right-4 bottom-20 md:bottom-24 z-50 w-[calc(100vw-16px)] max-w-sm md:w-96">
      {/* Glass morphism card */}
      <div className="backdrop-blur-xl bg-black/20 shadow-2xl border border-white/15 rounded-xl overflow-hidden touch-manipulation">
        {/* Header with glass effect */}
        <div className="bg-gradient-to-r from-blue-500/30 to-indigo-600/30 backdrop-blur-sm text-white border-b border-white/10 py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="text-lg font-bold">Chat</h3>
            </div>
            {onClose && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="h-8 w-8 rounded-lg hover:bg-white/20 text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex flex-col h-[50vh] md:h-96 max-h-[600px]">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 overscroll-contain">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-300/60 py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Start the conversation!</p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isLocal = msg.from?.identity === room.localParticipant?.identity;
                const senderName = msg.from?.identity || msg.from?.name || "Unknown";
                
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col",
                      isLocal ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 break-words backdrop-blur-sm",
                        isLocal
                          ? "bg-blue-500/80 text-white border border-blue-400/30"
                          : "bg-white/10 text-white border border-white/15"
                      )}
                    >
                      {!isLocal && (
                        <p className="text-xs font-semibold mb-1 opacity-75">
                          {senderName}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                    <span className="text-xs text-gray-300/60 mt-1 px-1">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area with glass effect */}
          <div className="border-t border-white/10 p-3 bg-black/10 backdrop-blur-sm">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2.5 md:py-2 rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm touch-manipulation"
                maxLength={500}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim()}
                className="bg-blue-500/80 hover:bg-blue-600/80 backdrop-blur-sm text-white px-4 min-w-[44px] min-h-[44px] touch-manipulation border border-blue-400/30 disabled:opacity-50"
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-300/60 mt-1 text-right">
              Press Enter to send
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
