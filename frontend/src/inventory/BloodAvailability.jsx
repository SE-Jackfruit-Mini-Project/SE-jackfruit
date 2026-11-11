/**
 * @file BloodAvailability.jsx
 * @description Blood availability dashboard widget. Fetches and displays real-time unit levels
 * and availability statuses (AVAILABLE, LOW, OUT_OF_STOCK) across all 8 blood groups in accordance
 * with US-006 (FR-025, FR-026).
 */

import { useEffect, useState } from "react";

/** Visual badge styling mappings for inventory status */
const STATUS_STYLES = {
  AVAILABLE: { label: "Available", background: "#d1fae5", color: "#065f46" },
  LOW: { label: "Low stock", background: "#fef3c7", color: "#92400e" },
  OUT_OF_STOCK: { label: "Out of stock", background: "#fee2e2", color: "#991b1b" },
};

/**
 * Formats blood group enum string to display string.
 *
 * @param {string} bloodGroup - Blood group enum.
 * @returns {string} Formatted notation.
 */
function formatGroup(bloodGroup) {
  return bloodGroup.replace("_POSITIVE", "+").replace("_NEGATIVE", "-");
}

/**
 * BloodAvailability component displaying real-time inventory levels.
 *
 * @component
 * @param {Object} props - Component properties.
 * @param {number} [props.refreshKey=0] - Dependency counter triggering re-fetches when inventory mutates.
 * @returns {JSX.Element} Rendered blood availability widget.
 */
export function BloodAvailability({ refreshKey = 0 }) {
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetches real-time blood availability from backend API.
   *
   * @async
   * @function fetchAvailability
   */
  async function fetchAvailability() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/inventory/availability", { credentials: "include" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setError(result.message || "Blood availability is currently unavailable.");
        return;
      }
      const data = await response.json();
      setAvailability(data.availability || []);
    } catch {
      setError("Blood availability is currently unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Refetch availability when refreshKey increments or on initial mount
  useEffect(() => {
    void fetchAvailability();
  }, [refreshKey]);

  return (
    <section style={{ background: "#fff", padding: "24px", borderRadius: "16px", border: "1px solid #e7dcd3" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: "20px" }}>Blood Availability</h3>
        <button
          type="button"
          onClick={fetchAvailability}
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

      {loading ? (
        <p style={{ color: "#81716a", fontSize: "14px" }}>Loading blood availability…</p>
      ) : error ? (
        <div className="form-message error" role="alert">
          {error}
        </div>
      ) : availability.length === 0 ? (
        <p style={{ color: "#81716a", fontSize: "14px" }}>No inventory data is available yet.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" }}>
          {availability.map((item) => {
            const style = STATUS_STYLES[item.status] || STATUS_STYLES.OUT_OF_STOCK;
            return (
              <div
                key={item.bloodGroup}
                style={{ border: "1px solid #f0e7df", borderRadius: "12px", padding: "14px", textAlign: "center" }}
              >
                <div style={{ fontFamily: "Manrope, sans-serif", fontSize: "22px", fontWeight: 800, color: "#862f2b" }}>
                  {formatGroup(item.bloodGroup)}
                </div>
                <div style={{ fontSize: "26px", fontWeight: 700, margin: "4px 0" }}>{item.availableUnits}</div>
                <div style={{ fontSize: "12px", color: "#81716a", marginBottom: "8px" }}>units</div>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    background: style.background,
                    color: style.color,
                  }}
                >
                  {style.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
