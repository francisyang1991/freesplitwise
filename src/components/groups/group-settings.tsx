"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GroupMembersPanel } from "@/components/groups/group-members-panel";
import type { GroupMemberInfo } from "@/lib/group-serializers";

type GroupSettingsProps = {
  groupId: string;
  members: GroupMemberInfo[];
  isAdmin: boolean;
  canDelete: boolean;
  canLeave: boolean;
  inviteLink: string;
};

export function GroupSettings({
  groupId,
  members,
  isAdmin,
  canDelete,
  canLeave,
  inviteLink,
}: GroupSettingsProps) {
  const [open, setOpen] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<"idle" | "deleting" | "leaving">("idle");
  const router = useRouter();

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setActionError(null);
    } catch {
      setActionError("Unable to copy invite link. Copy manually instead.");
    }
  };

  const deleteGroup = async () => {
    if (!canDelete) return;
    if (!window.confirm("Delete this group? This cannot be undone.")) {
      return;
    }
    setActionStatus("deleting");
    setActionError(null);
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to delete group");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete group");
      setActionStatus("idle");
    }
  };

  const leaveGroup = async () => {
    if (!canLeave) return;
    if (!window.confirm("Leave this group?")) {
      return;
    }
    setActionStatus("leaving");
    setActionError(null);
    try {
      const response = await fetch(`/api/groups/${groupId}/leave`, {
        method: "POST",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to leave group");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to leave group");
      setActionStatus("idle");
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white p-2 text-zinc-500 shadow-sm transition hover:bg-zinc-100"
        aria-label="Group settings"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.89 3.31.876 2.42 2.42a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.89 1.543-.876 3.31-2.42 2.42a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.89-3.31-.876-2.42-2.42a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.89-1.543.876-3.31 2.42-2.42.97.56 2.187.025 2.572-1.065Z"
          />
          <circle cx="12" cy="12" r="3.25" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/30">
          <div className="m-0 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Group settings</h2>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setShowAddMember(false);
                  setActionError(null);
                  setActionStatus("idle");
                }}
                className="text-sm font-semibold text-zinc-500 transition hover:text-zinc-700"
              >
                Close
              </button>
            </div>

            <section className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Invite link
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={copyInviteLink}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowAddMember((prev) => !prev)}
                  className="w-full rounded-md border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  {showAddMember ? "Hide add member" : "Add member"}
                </button>
              ) : null}
              <GroupMembersPanel
                groupId={groupId}
                members={members}
                isAdmin={isAdmin}
                showForm={showAddMember}
              />

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Danger zone
                </p>
                <div className="grid gap-2">
                  {canLeave ? (
                    <button
                      type="button"
                      onClick={leaveGroup}
                      className="rounded-md border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-70"
                      disabled={actionStatus === "leaving"}
                    >
                      {actionStatus === "leaving" ? "Leaving..." : "Leave group"}
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={deleteGroup}
                      className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-70"
                      disabled={actionStatus === "deleting"}
                    >
                      {actionStatus === "deleting" ? "Deleting..." : "Delete group"}
                    </button>
                  ) : null}
                </div>
              </div>

              {actionError ? (
                <p className="text-sm text-red-600">{actionError}</p>
              ) : null}
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
