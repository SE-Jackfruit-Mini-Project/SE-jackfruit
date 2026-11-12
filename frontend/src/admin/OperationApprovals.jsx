import { useEffect, useState } from "react";

const ACTION_LABELS = {
  CREATE_SLOT: "Create appointment slot",
  DELETE_SLOT: "Delete appointment slot",
  ADD_STOCK: "Add blood units",
  ADJUST_STOCK: "Adjust inventory",
};

function describeProposal(proposal) {
  const data = proposal.payload || {};
  if (proposal.action === "CREATE_SLOT") {
    return `${data.date}, ${data.startTime}–${data.endTime}, capacity ${data.maxCapacity}`;
  }
  if (proposal.action === "DELETE_SLOT") {
    return `${data.date}, ${data.startTime}–${data.endTime} (${data.bookedCount}/${data.maxCapacity} booked)`;
  }
  const group = String(data.bloodGroup || "").replace("_POSITIVE", "+").replace("_NEGATIVE", "-");
  if (proposal.action === "ADD_STOCK") return `${data.units} units of ${group} · ${data.type}${data.reason ? ` · ${data.reason}` : ""}`;
  const sign = Number(data.delta) > 0 ? "+" : "";
  return `${sign}${data.delta} units of ${group} · ${data.reason || "No reason provided"}`;
}

/** Admin review queue and staff view of their submitted operational proposals. */
export function OperationApprovals({ userRole, onDecision }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  async function loadApprovals() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/operation-approvals", { credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not load approval requests.");
      setApprovals(result.approvals || []);
    } catch (loadError) {
      setError(loadError.message || "Could not load approval requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApprovals();
    const refresh = () => void loadApprovals();
    window.addEventListener("operation-approval-changed", refresh);
    return () => window.removeEventListener("operation-approval-changed", refresh);
  }, []);

  async function review(approvalId, decision) {
    setBusyId(approvalId);
    setError("");
    try {
      const response = await fetch(`/api/v1/operation-approvals/${approvalId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ decision }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not review this request.");
      await loadApprovals();
      if (decision === "APPROVE") onDecision?.(result.approval);
    } catch (reviewError) {
      setError(reviewError.message || "Could not review this request.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section style={{ background: "#fff", padding: "24px", borderRadius: "16px", border: "1px solid #e7dcd3" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
        <div>
          <h3 style={{ margin: "0 0 4px", fontFamily: "Manrope, sans-serif", fontSize: "20px" }}>
            {userRole === "ADMIN" ? "Staff Change Approvals" : "My Change Proposals"}
          </h3>
          <p style={{ margin: 0, color: "#81716a", fontSize: "13px" }}>
            {userRole === "ADMIN" ? "Review staff proposals before they change slots or inventory." : "Slot and inventory changes take effect after an admin approves them."}
          </p>
        </div>
        <button type="button" onClick={() => void loadApprovals()} style={{ padding: "8px 16px", minHeight: "auto" }}>Refresh</button>
      </div>

      {error && <div className="form-message error" role="alert" style={{ marginTop: "16px" }}>{error}</div>}
      {loading ? <p style={{ color: "#81716a", marginTop: "16px" }}>Loading proposals…</p> : approvals.length === 0 ? (
        <p style={{ color: "#81716a", marginTop: "16px" }}>
          {userRole === "ADMIN" ? "There are no staff proposals awaiting approval." : "You have not submitted any change proposals."}
        </p>
      ) : (
        <div style={{ display: "grid", gap: "12px", marginTop: "18px" }}>
          {approvals.map((proposal) => (
            <article key={proposal.id} style={{ border: "1px solid #f0e6de", borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div>
                <strong>{ACTION_LABELS[proposal.action] || proposal.action}</strong>
                <p style={{ margin: "5px 0", color: "#51413b" }}>{describeProposal(proposal)}</p>
                <small style={{ color: "#81716a" }}>
                  Requested by {proposal.requester?.fullName || "Staff"} · {new Date(proposal.createdAt).toLocaleString()}
                  {proposal.status !== "PENDING" ? ` · ${proposal.status}${proposal.decisionNote ? `: ${proposal.decisionNote}` : ""}` : ""}
                </small>
              </div>
              {userRole === "ADMIN" && proposal.status === "PENDING" && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" disabled={busyId === proposal.id} onClick={() => void review(proposal.id, "APPROVE")}>
                    {busyId === proposal.id ? "Saving…" : "Approve"}
                  </button>
                  <button type="button" disabled={busyId === proposal.id} onClick={() => void review(proposal.id, "REJECT")} style={{ background: "#f3ebe4", color: "#862f2b" }}>
                    Reject
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
