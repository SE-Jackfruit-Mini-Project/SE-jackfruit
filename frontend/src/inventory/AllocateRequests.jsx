/**
 * @file AllocateRequests.jsx
 * @description Blood request allocation UI component for staff. Lists approved hospital blood requests
 * and allows staff to trigger inventory deductions and status transitions to ALLOCATED (US-007 / FR-027, FR-028, FR-037).
 */

import { useEffect, useState } from "react";

/**
 * Converts blood group enum to human-friendly shorthand notation.
 *
 * @param {string} bloodGroup - Blood group enum.
 * @returns {string} Formatted notation.
 */
function formatGroup(bloodGroup) {
  return bloodGroup.replace("_POSITIVE", "+").replace("_NEGATIVE", "-");
}

/**
 * AllocateRequests component for assigning inventory to approved requests.
 *
 * @component
 * @param {Object} props - Component properties.
 * @param {Function} [props.onAllocated] - Callback notifying parent views when an allocation succeeds.
 * @returns {JSX.Element} Rendered allocation interface.
 */
export function AllocateRequests({ onAllocated, refreshKey = 0 }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [allocatingId, setAllocatingId] = useState(null);
  const [message, setMessage] = useState(null);

  /**
   * Fetches approved blood requests awaiting inventory allocation.
   *
   * @async
   * @function fetchRequests
   */
  async function fetchRequests() {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/v1/allocations/pending", { credentials: "include" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setLoadError(result.message || "Approved requests could not be loaded.");
        return;
      }
      const data = await response.json();
      setRequests(data.requests || []);
    } catch {
      setLoadError("Approved requests could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchRequests();
  }, [refreshKey]);

  /**
   * Triggers atomic allocation for a specific request.
   *
   * @async
   * @function handleAllocate
   * @param {Object} item - The request record to allocate.
   */
  async function handleAllocate(item) {
    setAllocatingId(item.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/allocations/${item.id}`, {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: result.message || "Could not allocate blood units." });
        return;
      }

      setMessage({
        type: "success",
        text: `${result.message} ${formatGroup(result.allocation.bloodGroup)} now has ${result.allocation.inventory.availableUnits} units.`,
      });
      onAllocated?.();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setAllocatingId(null);
      await fetchRequests();
    }
  }

  return (
    <section style={{ background: "#fff", padding: "24px", borderRadius: "16px", border: "1px solid #e7dcd3" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: "20px" }}>Allocate Blood Units</h3>
        <button
          type="button"
          onClick={fetchRequests}
          style={{
            padding: "6px 14px",
            minHeight: "auto",
            fontSize: "13px",
            background: "#f3ebe4",
            color: "#51413b",
            borderRadius: "8px",
          }}
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className={`form-message ${message.type}`} role="status" style={{ marginBottom: "12px" }}>
          {message.text}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#81716a", fontSize: "14px" }}>Loading approved requests…</p>
      ) : loadError ? (
        <div className="form-message error" role="alert">
          {loadError}
        </div>
      ) : requests.length === 0 ? (
        <p style={{ color: "#81716a", fontSize: "14px" }}>No approved requests are waiting for allocation.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f0e7df", color: "#81716a" }}>
                <th style={{ padding: "8px" }}>Hospital</th>
                <th style={{ padding: "8px" }}>Blood Group</th>
                <th style={{ padding: "8px" }}>Units</th>
                <th style={{ padding: "8px" }}>Urgency</th>
                <th style={{ padding: "8px" }}>Submitted</th>
                <th style={{ padding: "8px" }} />
              </tr>
            </thead>
            <tbody>
              {requests.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f5ede6" }}>
                  <td style={{ padding: "10px 8px" }}>{item.hospitalName}</td>
                  <td style={{ padding: "10px 8px", fontWeight: "bold" }}>{formatGroup(item.bloodGroup)}</td>
                  <td style={{ padding: "10px 8px" }}>{item.units}</td>
                  <td style={{ padding: "10px 8px" }}>{item.urgency}</td>
                  <td style={{ padding: "10px 8px", color: "#81716a", fontSize: "13px" }}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>
                    <button
                      type="button"
                      disabled={allocatingId !== null}
                      onClick={() => handleAllocate(item)}
                      style={{ padding: "6px 14px", minHeight: "auto", fontSize: "13px", borderRadius: "8px" }}
                    >
                      {allocatingId === item.id ? "Allocating…" : "Allocate"}
                    </button>
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
