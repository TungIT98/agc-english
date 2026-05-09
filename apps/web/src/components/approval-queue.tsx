"use client";

import { Approval } from "@/lib/api";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface ApprovalQueueProps {
  approvals: Approval[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export default function ApprovalQueue({ approvals, onApprove, onReject }: ApprovalQueueProps) {
  if (approvals.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle size={32} style={{ color: "var(--success)", margin: "0 auto" }} />
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          No pending approvals
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {approvals.map((approval) => (
        <div
          key={approval.id}
          className="flex flex-col gap-2 p-4 rounded-lg border"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-start gap-3">
            <Clock size={16} style={{ color: "var(--warning)", marginTop: 2 }} />
            <div className="flex flex-col flex-1">
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {approval.title}
              </span>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Requested by {approval.requestedBy}
              </span>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {new Date(approval.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            {onApprove && (
              <button
                onClick={() => onApprove(approval.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium"
                style={{ backgroundColor: "var(--success)", color: "white" }}
              >
                <CheckCircle size={12} />
                Approve
              </button>
            )}
            {onReject && (
              <button
                onClick={() => onReject(approval.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium"
                style={{ backgroundColor: "var(--error)", color: "white" }}
              >
                <XCircle size={12} />
                Reject
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
