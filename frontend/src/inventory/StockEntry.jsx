import { useState } from "react";

const BLOOD_GROUPS = [
  { value: "A_POSITIVE", label: "A+" },
  { value: "A_NEGATIVE", label: "A-" },
  { value: "B_POSITIVE", label: "B+" },
  { value: "B_NEGATIVE", label: "B-" },
  { value: "AB_POSITIVE", label: "AB+" },
  { value: "AB_NEGATIVE", label: "AB-" },
  { value: "O_POSITIVE", label: "O+" },
  { value: "O_NEGATIVE", label: "O-" },
];

const STOCK_TYPES = [
  { value: "PURCHASE", label: "Purchase" },
  { value: "TRANSFER_IN", label: "Transfer in" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

const emptyForm = { bloodGroup: "A_POSITIVE", units: 1, type: "PURCHASE", reason: "" };

const selectStyle = {
  width: "100%",
  minHeight: "50px",
  padding: "0 15px",
  borderRadius: "12px",
  border: "1px solid #e7dcd3",
  background: "#fff",
  font: "inherit",
};

export function StockEntry({ onAdded }) {
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setMessage(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/inventory/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      const result = await response.json();

      if (!response.ok) {
        const errorText = result.errors?.map((err) => err.message).join(" ");
        setMessage({ type: "error", text: errorText || result.message || "Could not add blood units." });
        return;
      }

      const label = BLOOD_GROUPS.find((bg) => bg.value === result.inventory.bloodGroup)?.label;
      setMessage({
        type: "success",
        text: `${result.message} ${label} now has ${result.inventory.availableUnits} units.`,
      });
      setFormData(emptyForm);
      onAdded?.();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section style={{ background: "#fff", padding: "24px", borderRadius: "16px", border: "1px solid #e7dcd3" }}>
      <h3 style={{ margin: "0 0 4px", fontFamily: "Manrope, sans-serif", fontSize: "20px" }}>Add Blood Units</h3>
      <p style={{ margin: "0 0 16px", color: "#81716a", fontSize: "13px" }}>
        For stock additions other than accepted donations. Donations are recorded when the donation is completed.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <div>
            <label htmlFor="stockBloodGroup">Blood Group</label>
            <select
              id="stockBloodGroup"
              name="bloodGroup"
              value={formData.bloodGroup}
              onChange={handleInputChange}
              style={selectStyle}
            >
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg.value} value={bg.value}>
                  {bg.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="stockUnits">Units</label>
            <input
              id="stockUnits"
              name="units"
              type="number"
              min="1"
              max="1000"
              value={formData.units}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label htmlFor="stockType">Type</label>
            <select id="stockType" name="type" value={formData.type} onChange={handleInputChange} style={selectStyle}>
              {STOCK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="stockReason">Reason (optional)</label>
          <input
            id="stockReason"
            name="reason"
            value={formData.reason}
            onChange={handleInputChange}
            maxLength={200}
            placeholder="e.g., Delivery from regional blood bank"
          />
        </div>

        {message && (
          <div className={`form-message ${message.type}`} role="status">
            {message.text}
          </div>
        )}

        <button type="submit" disabled={submitting} style={{ marginTop: "8px" }}>
          {submitting ? "Adding units…" : "Add Blood Units"}
        </button>
      </form>
    </section>
  );
}
