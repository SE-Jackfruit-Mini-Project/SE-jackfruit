import { useState, useEffect } from "react";

export function ReviewRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  async function fetchRequests() {
    try {
      const url = filter === "ALL" ? "/api/v1/requests" : `/api/v1/requests?status=${filter}`;
      const response = await fetch(url, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch {
      console.error("Could not fetch blood requests.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(requestId, decision) {
    setProcessingId(requestId);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/requests/${requestId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: decision }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: result.message || "Failed to process blood request.",
        });
        return;
      }

      setMessage({ type: "success", text: result.message });
      await fetchRequests();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <section
      style={{
        background: "#fff",
        padding: "24px",
        borderRadius: "16px",
        border: "1px solid #e7dcd3",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: "20px" }}>
            Review Blood Requests
          </h3>
          <p style={{ margin: "4px 0 0", color: "#81716a", fontSize: "13px" }}>
            Review and approve or reject hospital blood requests requiring operational processing.
          </p>
        </div>

        {/* Status Filters */}
        <div style={{ display: "flex", gap: "6px" }}>
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              style={{
                padding: "6px 12px",
                minHeight: "auto",
                fontSize: "12px",
                borderRadius: "8px",
                border: "1px solid #e7dcd3",
                background: filter === status ? "#862f2b" : "#fdfaf7",
                color: filter === status ? "#fff" : "#51413b",
                fontWeight: filter === status ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {status}
            </button>
          ))}
          <button
            type="button"
            onClick={fetchRequests}
            style={{
              padding: "6px 12px",
              minHeight: "auto",
              fontSize: "12px",
              borderRadius: "8px",
              border: "1px solid #e7dcd3",
              background: "#f3ebe4",
              color: "#51413b",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`form-message ${message.type}`}
          role="status"
          style={{ marginBottom: "16px" }}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#81716a", fontSize: "14px" }}>Loading requests…</p>
      ) : requests.length === 0 ? (
        <p style={{ color: "#81716a", fontSize: "14px" }}>No blood requests found for this filter.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #f0e7df", color: "#81716a" }}>
                <th style={{ padding: "8px" }}>Request ID</th>
                <th style={{ padding: "8px" }}>Hospital</th>
                <th style={{ padding: "8px" }}>Requester</th>
                <th style={{ padding: "8px" }}>Group</th>
                <th style={{ padding: "8px" }}>Units</th>
                <th style={{ padding: "8px" }}>Urgency</th>
                <th style={{ padding: "8px" }}>Status</th>
                <th style={{ padding: "8px" }}>Date</th>
                <th style={{ padding: "8px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} style={{ borderBottom: "1px solid #f5ede6" }}>
                  <td
                    style={{
                      padding: "10px 8px",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      color: "#6e2522",
                    }}
                  >
                    {req.id}
                  </td>
                  <td style={{ padding: "10px 8px", fontWeight: 600 }}>{req.hospitalName}</td>
                  <td style={{ padding: "10px 8px", fontSize: "13px", color: "#6b5c56" }}>
                    {req.requester?.fullName || "—"}
                  </td>
                  <td style={{ padding: "10px 8px", fontWeight: "bold" }}>
                    {req.bloodGroup.replace("_POSITIVE", "+").replace("_NEGATIVE", "-")}
                  </td>
                  <td style={{ padding: "10px 8px" }}>{req.units}</td>
                  <td style={{ padding: "10px 8px" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        background:
                          req.urgency === "EMERGENCY"
                            ? "#fee2e2"
                            : req.urgency === "URGENT"
                            ? "#fef3c7"
                            : "#e0e7ff",
                        color:
                          req.urgency === "EMERGENCY"
                            ? "#991b1b"
                            : req.urgency === "URGENT"
                            ? "#92400e"
                            : "#3730a3",
                      }}
                    >
                      {req.urgency}
                    </span>
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        background:
                          req.status === "PENDING"
                            ? "#fef3c7"
                            : req.status === "APPROVED"
                            ? "#d1fae5"
                            : req.status === "REJECTED"
                            ? "#fee2e2"
                            : "#e0e7ff",
                        color:
                          req.status === "PENDING"
                            ? "#92400e"
                            : req.status === "APPROVED"
                            ? "#065f46"
                            : req.status === "REJECTED"
                            ? "#991b1b"
                            : "#3730a3",
                      }}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 8px", color: "#81716a", fontSize: "13px" }}>
                    {new Date(req.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    {req.status === "PENDING" ? (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          disabled={processingId === req.id}
                          onClick={() => handleReview(req.id, "APPROVED")}
                          style={{
                            padding: "5px 12px",
                            minHeight: "auto",
                            fontSize: "12px",
                            fontWeight: 700,
                            borderRadius: "6px",
                            border: "1px solid #16a34a",
                            background: "#22c55e",
                            color: "#fff",
                            cursor: processingId === req.id ? "wait" : "pointer",
                          }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={processingId === req.id}
                          onClick={() => handleReview(req.id, "REJECTED")}
                          style={{
                            padding: "5px 12px",
                            minHeight: "auto",
                            fontSize: "12px",
                            fontWeight: 700,
                            borderRadius: "6px",
                            border: "1px solid #dc2626",
                            background: "#ef4444",
                            color: "#fff",
                            cursor: processingId === req.id ? "wait" : "pointer",
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: "12px", color: "#a89993" }}>Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
