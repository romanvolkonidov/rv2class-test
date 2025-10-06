"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";


function WaitingRoomContent() {
  const searchParams = useSearchParams();
  const waitingRoomId = searchParams?.get("waitingRoomId") || "";
  const studentName = searchParams?.get("name") || "";
  const sessionCode = searchParams?.get("code") || "";

  if (!waitingRoomId || !studentName || !sessionCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Invalid waiting room parameters</p>
        </div>
      </div>
    );
  }


}
export default function WaitingRoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <WaitingRoomContent />
    </Suspense>
  );
}
