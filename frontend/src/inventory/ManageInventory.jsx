import { useEffect, useState } from "react";

const STATUS_STYLES = {
  AVAILABLE: { label: "Available", background: "#d1fae5", color: "#065f46" },
  LOW: { label: "Low stock", background: "#fef3c7", color: "#92400e" },
  OUT_OF_STOCK: { label: "Out of stock", background: "#fee2e2", color: "#991b1b" },
};

function formatGroup(bloodGroup) {
  return bloodGroup.replace("_POSITIVE", "+").replace("_NEGATIVE", "-");
}

export function ManageInventory({ refreshKey = 0, onChanged }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({ bloodGroup: "", delta: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  async function fetchInventory() {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/v1/inventory/availability", { credentials: "include" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setLoadError(result.message || "Inventory records could not be loaded.");
        return;
      }
      const data = await response.json();
      setInventory(data.availability || []);
    } catch {
      setLoadError("Inventory records could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInventory();
  }, [refreshKey]);

  function selectGroup(bloodGroup) {
    setForm({ bloodGroup, delta: "", reason: "" });
    setMessage(null);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setMessage(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/inventory/${form.bloodGroup}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ delta: form.delta, reason: form.reason }),
      });
      const result = await response.json();

      if (!response.ok) {
        const errorText = result.errors?.map((err) => err.message).join(" ");
        setMessage({ type: "error", text: errorText || result.message || "Could not update inventory." });
        return;
      }

      setMessage({
        type: "success",
        text: `${result.message} ${formatGroup(result.inventory.bloodGroup)} now has ${result.inventory.availableUnits} units.`,
      });
      setForm({ bloodGroup: "", delta: "", reason: "" });
      fetchInventory();
      onChanged?.();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section style={{ background: "#fff", padding: "24px", borderRadius: "16px", border: "1px solid #e7dcd3" }}>
      <h3 style={{ margin: "0 0 4px", fontFamily: "Manrope, sans-serif", fontSize: "20px" }}>Manage Inventory Status</h3>
      <p style={{ margin: "0 0 16px", color: "#81716a", fontSize: "13px" }}>
        Correct stock for expired, damaged or miscounted units. The status updates from the quantity.
      </p>

      {loading ? (
        <p style={{ color: "#81716a", fontSize: "14px" }}>Loading inventory records…</p>
      ) : loadError ? (
        <div className="form-message error" role="alert">
          {loadError}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f0e7df", color: "#81716a" }}>
                <th style={{ padding: "8px" }}>Blood Group</th>
                <th style={{ padding: "8px" }}>Units</th>
                <th style={{ padding: "8px" }}>Status</th>
                <th style={{ padding: "8px" }} />
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const style = STATUS_STYLES[item.status] || STATUS_STYLES.OUT_OF_STOCK;
                return (
                  <tr key={item.bloodGroup} style={{ borderBottom: "1px solid #f5ede6" }}>
                    <td style={{ padding: "10px 8px", fontWeight: "bold" }}>{formatGroup(item.bloodGroup)}</td>
                    <td style={{ padding: "10px 8px" }}>{item.availableUnits}</td>
                    <td style={{ padding: "10px 8px" }}>
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
                    </td>
                    <td style={{ padding: "10px 8px", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => selectGroup(item.bloodGroup)}
                        style={{
                          padding: "6px 14px",
                          minHeight: "auto",
                          fontSize: "13px",
                          background: "#f3ebe4",
                          color: "#51413b",
                          borderRadius: "8px",
                        }}
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {form.bloodGroup && (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px", marginTop: "20px" }}>
          <strong>Adjust {formatGroup(form.bloodGroup)} stock</strong>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
            <div>
              <label htmlFor="adjustDelta">Change in units</label>
              <input
                id="adjustDelta"
                name="delta"
                type="number"
                step="1"
                value={form.delta}
                onChange={handleChange}
                placeholder="e.g., -3 or 5"
                required
              />
            </div>
            <div>
              <label htmlFor="adjustReason">Reason</label>
              <input
                id="adjustReason"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                maxLength={200}
                placeholder="e.g., Expired units removed"
                required
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save adjustment"}
            </button>
            <button
              type="button"
              onClick={() => selectGroup("")}
              style={{ background: "#f3ebe4", color: "#51413b" }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {message && (
        <div className={`form-message ${message.type}`} role="status" style={{ marginTop: "12px" }}>
          {message.text}
        </div>
      )}
    </section>
  );
}
