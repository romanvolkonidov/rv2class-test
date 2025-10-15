"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function TestBBB() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bbb-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: 'test-room',
          participantName: 'Test User',
          isTutor: true,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">BBB API Test</h1>
      
      <Button onClick={testAPI} disabled={loading}>
        {loading ? "Testing..." : "Test BBB API"}
      </Button>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Result:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
          
          {result.joinUrl && (
            <div className="mt-4">
              <a 
                href={result.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Open BBB Meeting
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
