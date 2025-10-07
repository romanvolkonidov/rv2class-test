"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Users, ChevronUp, ChevronDown } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface JoinRequest {
  id: string;
  studentName: string;
  roomName: string;
  status: string;
  createdAt: any;
}

export default function JoinRequestsPanel({ roomName }: { roomName: string }) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!roomName) return;

    const q = query(
      collection(db, "joinRequests"),
      where("roomName", "==", roomName),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newRequests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as JoinRequest[];

      setRequests(newRequests);

      // Auto-expand if there are new requests
      if (newRequests.length > 0) {
        setIsExpanded(true);
      }
      
      // Clear processing state for requests that are no longer pending
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        const currentIds = new Set(newRequests.map(r => r.id));
        prev.forEach(id => {
          if (!currentIds.has(id)) {
            newSet.delete(id);
          }
        });
        return newSet;
      });
    });

    return () => unsubscribe();
  }, [roomName]);

  const handleApprove = async (requestId: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));
    try {
      await fetch("/api/join-request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          status: "approved",
        }),
      });
    } catch (error) {
      console.error("Error approving request:", error);
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleDeny = async (requestId: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));
    try {
      await fetch("/api/join-request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          status: "denied",
        }),
      });
    } catch (error) {
      console.error("Error denying request:", error);
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-[60] w-80 md:w-96">
      {/* Glass morphism card with pulsing animation */}
      <div className="backdrop-blur-xl bg-black/30 border border-white/20 shadow-2xl rounded-xl overflow-hidden animate-pulse-border">
        <div className="p-4">
          {/* Header */}
          <div
            className="flex items-center justify-between cursor-pointer mb-3 group"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <Users className="h-5 w-5 text-blue-400" />
                {/* Notification badge */}
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  {requests.length}
                </span>
              </div>
              <h3 className="font-semibold text-white">
                Join Requests
              </h3>
            </div>
            <button className="text-gray-300 hover:text-white transition-colors">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Requests list */}
          {isExpanded && (
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {requests.map((request) => {
                const isProcessing = processingIds.has(request.id);
                
                return (
                  <div
                    key={request.id}
                    className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <p className="text-white font-medium mb-3 flex items-center gap-2">
                      <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
                      {request.studentName}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={isProcessing}
                        className="flex-1 bg-green-500/80 hover:bg-green-600/80 backdrop-blur-sm text-white border border-green-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        onClick={() => handleApprove(request.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {isProcessing ? "..." : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        disabled={isProcessing}
                        className="flex-1 bg-red-500/80 hover:bg-red-600/80 backdrop-blur-sm text-white border border-red-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        onClick={() => handleDeny(request.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {isProcessing ? "..." : "Deny"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Add custom styles for scrollbar and animations */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
          }
        }
        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
