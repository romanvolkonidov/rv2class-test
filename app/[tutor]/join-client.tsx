"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TutorKey } from "./config";

export default function JoinTutorRoom({
  tutorKey,
  tutor,
}: {
  tutorKey: TutorKey;
  tutor: { name: string; room: string; accent: string };
}) {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("https://online.rv2class.com");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const { room, name, accent } = tutor;

  const shareLink = useMemo(() => `${origin}/${tutorKey}`, [origin, tutorKey]);

  const joinClass = () => {
    if (!studentName.trim()) {
      setError("Please enter your name to join the class.");
      return;
    }

    setError("");
    router.push(
      `/room?room=${encodeURIComponent(room)}&name=${encodeURIComponent(studentName.trim())}&isTutor=false`
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-xl w-full space-y-6">
        <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80">
          <CardHeader>
            <CardTitle className={`text-3xl font-semibold ${accent}`}>{`${name}’s Classroom`}</CardTitle>
            <CardDescription>
              Welcome! Enter your name below to join the live session with {name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Your Name</label>
              <Input
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                placeholder="Type your name"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    joinClass();
                  }
                }}
              />
              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            </div>
            <Button className="w-full" size="lg" onClick={joinClass}>
              {`Join ${name}’s Session`}
            </Button>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-white/70 dark:bg-gray-800/70">
          <CardHeader>
            <CardTitle className="text-lg">Need this link later?</CardTitle>
            <CardDescription>Save or share it with classmates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-mono text-sm break-all">{shareLink}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => navigator.clipboard.writeText(shareLink)}>
                Copy link
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/">Back to tutors</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
