"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  code: string;
  userId: string;
};

type JoinResult = {
  success: boolean;
  groupId?: string;
  joined?: boolean;
  error?: string;
};

export function InviteHandler({ code, userId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const joinGroup = async () => {
      try {
        console.log(`[invite] Processing invite code: ${code}`);
        console.log(`[invite] User ${userId} attempting to join with code: ${code}`);

        const response = await fetch(`/api/invite/${code}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const result: JoinResult = await response.json();
        console.log(`[invite] API response:`, result);

        if (!response.ok) {
          throw new Error(result.error || "Failed to join group");
        }

        if (!result.groupId) {
          throw new Error("Group ID not returned from server");
        }

        console.log(`[invite] Successfully joined group ${result.groupId}, joined: ${result.joined}`);
        
        setStatus("success");
        setMessage("Successfully joined the group! Redirecting...");
        
        // Use client-side navigation instead of server-side redirect
        setTimeout(() => {
          router.push(`/dashboard/groups/${result.groupId}`);
        }, 1000);

      } catch (error) {
        console.error(`[invite] Failed to join group with code ${code}:`, error);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Failed to join group");
      }
    };

    joinGroup();
  }, [code, userId, router]);

  if (status === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Joining Group...
          </h1>
          <p className="text-sm text-zinc-600">
            Please wait while we add you to the group.
          </p>
        </div>
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-600"></div>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-emerald-600">
            Success!
          </h1>
          <p className="text-sm text-zinc-600">
            {message}
          </p>
        </div>
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-red-600">
          Error
        </h1>
        <p className="text-sm text-zinc-600">
          {message}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-500"
        >
          Go to Dashboard
        </button>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-4 py-2 text-base font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
