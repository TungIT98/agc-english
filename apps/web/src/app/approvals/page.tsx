"use client";
import { useEffect, useState } from "react";
import { fetchApprovals, Approval, approveApproval, rejectApproval } from "@/lib/api";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  useEffect(() => { fetchApprovals().then(setApprovals); }, []);

  async function handleApprove(approvalId: string) {
    setLoadingId(approvalId);
    try {
      await approveApproval(approvalId);
      setApprovals((prev) => prev.map((a) => a.id === approvalId ? { ...a, status: "approved" as const } : a));
    } finally {
      setLoadingId(null);
    }
  }

  async function handleReject(approvalId: string) {
    setLoadingId(approvalId);
    try {
      await rejectApproval(approvalId);
      setApprovals((prev) => prev.map((a) => a.id === approvalId ? { ...a, status: "rejected" as const } : a));
    } finally {
      setLoadingId(null);
    }
  }

  const pending = approvals.filter((a) => a.status === "pending");
  return (
    <>
      <h1 className="text-2xl font-bold mb-6 text-text-primary">Approval Queue</h1>
      <div className="grid grid-cols-1 gap-4">
          {pending.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle size={40} style={{ color: "var(--success)", margin: "0 auto" }} />
              <p className="mt-3 text-text-secondary">No pending approvals</p>
            </div>
          ) : (
            pending.map((approval) => (
              <div key={approval.id} className="bg-surface border border-border rounded-lg p-5">
                <div className="flex items-start gap-3 mb-4">
                  <Clock size={18} style={{ color: "var(--warning)", marginTop: 2 }} />
                  <div>
                    <div className="font-medium text-text-primary text-lg">{approval.title}</div>
                    <div className="text-sm text-text-secondary mt-1">Requested by {approval.requestedBy}</div>
                    <div className="text-xs text-text-secondary mt-0.5">{new Date(approval.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(approval.id)}
                    disabled={loadingId === approval.id}
                    className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium"
                    style={{ backgroundColor: "var(--success)", color: "white" }}
                  >
                    <CheckCircle size={14} />{loadingId === approval.id ? "..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(approval.id)}
                    disabled={loadingId === approval.id}
                    className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium"
                    style={{ backgroundColor: "var(--error)", color: "white" }}
                  >
                    <XCircle size={14} />{loadingId === approval.id ? "..." : "Reject"}
                  </button>
                </div>
              </div>
            ))
          )}
      </div>
    </>
  );
}
