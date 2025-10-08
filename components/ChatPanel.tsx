"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useChat, useRoomContext, useParticipants } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { X, Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadChatHistory, saveChatMessage, ChatMessage } from "@/lib/firebase";

interface ChatPanelProps {
  onClose?: () => void;
  isClosing?: boolean;
  roomName: string;
  isTutor: boolean; // Whether current user is teacher or student
}

export default function ChatPanel({ onClose, isClosing: externalIsClosing = false, roomName, isTutor }: ChatPanelProps) {
  const room = useRoomContext();
  const { chatMessages: livekitMessages, send } = useChat();
  const participants = useParticipants(); // Get current room participants
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalIsClosing, setInternalIsClosing] = useState(false);
  const [firebaseMessages, setFirebaseMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const savedMessageIdsRef = useRef<Set<string>>(new Set());

  const localParticipantName = room.localParticipant?.identity || "You";
  
  // Use external or internal closing state
  const isClosing = externalIsClosing || internalIsClosing;

  // Get set of current participant identities for filtering
  const activeParticipantIdentities = useMemo(() => {
    const identities = new Set<string>();
    participants.forEach(p => {
      identities.add(p.identity);
    });
    console.log("👥 Active participants in chat:", Array.from(identities));
    return identities;
  }, [participants]);

  // Load chat history from Firebase on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!roomName || !localParticipantName) {
        setIsLoadingHistory(false);
        return;
      }
      
      try {
        console.log("📚 Loading chat history for room:", roomName, "User:", localParticipantName, "IsTutor:", isTutor);
        const history = await loadChatHistory(roomName, localParticipantName, isTutor);
        setFirebaseMessages(history);
        console.log(`✅ Loaded ${history.length} messages from history`);
      } catch (error) {
        console.error("❌ Failed to load chat history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [roomName, localParticipantName, isTutor]);

  // Save LiveKit messages to Firebase when they arrive
  useEffect(() => {
    const saveNewMessages = async () => {
      if (!roomName || livekitMessages.length === 0) return;

      // Get current recipient list (all active participants)
      const recipients = Array.from(activeParticipantIdentities);
      
      // Save new messages that haven't been saved yet
      for (const msg of livekitMessages) {
        const messageId = `${msg.from?.identity}-${msg.timestamp}`;
        
        if (!savedMessageIdsRef.current.has(messageId)) {
          try {
            await saveChatMessage(
              roomName,
              msg.from?.identity || msg.from?.name || "Unknown",
              msg.message,
              msg.timestamp,
              recipients // Pass all current participants as recipients
            );
            savedMessageIdsRef.current.add(messageId);
            console.log(`💾 Saved message to ${recipients.length} recipients:`, recipients);
          } catch (error) {
            console.error("❌ Failed to save message to Firebase:", error);
          }
        }
      }
    };

    saveNewMessages();
  }, [livekitMessages, roomName, activeParticipantIdentities]);

  // Merge Firebase history with LiveKit messages, remove duplicates
  // Filter to only show messages where all participants are currently present
  const allMessages = useMemo(() => {
    const messagesMap = new Map();

    // Add Firebase messages first, but only if all recipients are currently active
    firebaseMessages.forEach((msg) => {
      // Check if all recipients from this message are currently in the room
      const allRecipientsPresent = msg.recipients?.every(recipient => 
        activeParticipantIdentities.has(recipient)
      ) ?? false;

      // Also check if the sender is present (unless it's the teacher)
      const senderPresent = activeParticipantIdentities.has(msg.from);

      // Only show message if all involved parties are currently present
      if (allRecipientsPresent && senderPresent) {
        const key = `${msg.from}-${msg.timestamp}`;
        messagesMap.set(key, {
          id: msg.id || key,
          message: msg.message,
          timestamp: msg.timestamp,
          from: {
            identity: msg.from,
            name: msg.from
          },
          isGroupMessage: msg.isGroupMessage
        });
      }
    });

    // Add LiveKit messages (real-time messages) - all participants see real-time
    livekitMessages.forEach((msg) => {
      const key = `${msg.from?.identity}-${msg.timestamp}`;
      // Only add if not already in map (prevents duplicates)
      if (!messagesMap.has(key)) {
        messagesMap.set(key, msg);
      }
    });

    // Convert to array and sort by timestamp
    const merged = Array.from(messagesMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`💬 Displaying ${merged.length} messages (filtered by active participants)`);
    return merged;
  }, [firebaseMessages, livekitMessages, activeParticipantIdentities]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  // Focus input when chat opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleClose = () => {
    setInternalIsClosing(true);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      onClose?.();
    }, 300); // Match animation duration
  };

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
    <div 
      className={cn(
        "fixed right-2 md:right-4 bottom-20 md:bottom-24 z-50 w-[calc(100vw-16px)] max-w-sm md:w-96 transition-all duration-300",
        isClosing ? "animate-slide-down-out" : "animate-slide-up"
      )}
    >
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
                onClick={handleClose}
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
            {isLoadingHistory ? (
              <div className="text-center text-gray-300/60 py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50 animate-pulse" />
                <p className="text-sm">Loading chat history...</p>
              </div>
            ) : allMessages.length === 0 ? (
              <div className="text-center text-gray-300/60 py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Start the conversation!</p>
              </div>
            ) : (
              allMessages.map((msg) => {
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
      
      {/* Add animation styles */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideDownOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(20px);
          }
        }
        
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
        
        .animate-slide-down-out {
          animation: slideDownOut 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
