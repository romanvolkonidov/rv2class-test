"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Users } from "lucide-react";
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
    });

    return () => unsubscribe();
  }, [roomName]);

  const handleApprove = async (requestId: string) => {
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
    }
  };

  const handleDeny = async (requestId: string) => {
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
    }
  };

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 w-80">
      <Card className="bg-gray-800/95 border-gray-700 shadow-xl">
        <CardContent className="p-4">
          <div
            className="flex items-center justify-between cursor-pointer mb-3"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold text-white">
                Join Requests ({requests.length})
              </h3>
            </div>
            <button className="text-gray-400 hover:text-white">
              {isExpanded ? "−" : "+"}
            </button>
          </div>

          {isExpanded && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="bg-gray-700/50 rounded-lg p-3 border border-gray-600"
                >
                  <p className="text-white font-medium mb-2">
                    {request.studentName}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(request.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDeny(request.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
