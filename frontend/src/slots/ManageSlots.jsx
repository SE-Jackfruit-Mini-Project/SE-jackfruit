import { useState, useEffect } from "react";

export function ManageSlots() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const todayString = new Date().toISOString().slice(0, 10);

  const [formData, setFormData] = useState({
    date: todayString,
    startTime: "09:00",
    endTime: "10:00",
    maxCapacity: 5,
  });

  useEffect(() => {
    fetchSlots();
  }, []);

  async function fetchSlots() {
    try {
      const response = await fetch("/api/v1/appointment-slots", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setSlots(data.slots || []);
      }
    } catch {
      console.error("Could not fetch appointment slots.");
    } finally {
      setLoading(false);
    }
  }

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
      const response = await fetch("/api/v1/appointment-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          maxCapacity: Number(formData.maxCapacity),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorText = result.errors?.map((err) => err.message).join(" ");
        setMessage({
          type: "error",
          text: errorText || result.message || "Failed to create appointment slot.",
        });
        return;
      }

      setMessage({ type: "success", text: result.message || "Slot created successfully!" });
      setFormData({
        date: todayString,
        startTime: "09:00",
        endTime: "10:00",
        maxCapacity: 5,
      });
      fetchSlots();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ marginTop: "32px", display: "grid", gap: "28px" }}>
      {/* Create Appointment Slot Section */}
      <section
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "16px",
          border: "1px solid #e7dcd3",
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontFamily: "Manrope, sans-serif", fontSize: "20px" }}>
          Create Donation Appointment Slot
        </h3>

        {message && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              marginBottom: "16px",
              fontSize: "14px",
              background: message.type === "success" ? "#e8f5e9" : "#ffebee",
              color: message.type === "success" ? "#2e7d32" : "#c62828",
              border: `1px solid ${message.type === "success" ? "#c8e6c9" : "#ffcdd2"}`,
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <div>
              <label htmlFor="date" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 700, color: "#51413b" }}>
                Date
              </label>
              <input
                id="date"
                type="date"
                name="date"
                value={formData.date}
                min={todayString}
                onChange={handleInputChange}
                required
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "0 12px",
                  borderRadius: "10px",
                  border: "1px solid #e7dcd3",
                  fontSize: "14px",
                }}
              />
            </div>

            <div>
              <label htmlFor="startTime" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 700, color: "#51413b" }}>
                Start Time
              </label>
              <input
                id="startTime"
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                required
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "0 12px",
                  borderRadius: "10px",
                  border: "1px solid #e7dcd3",
                  fontSize: "14px",
                }}
              />
            </div>

            <div>
              <label htmlFor="endTime" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 700, color: "#51413b" }}>
                End Time
              </label>
              <input
                id="endTime"
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                required
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "0 12px",
                  borderRadius: "10px",
                  border: "1px solid #e7dcd3",
                  fontSize: "14px",
                }}
              />
            </div>

            <div>
              <label htmlFor="maxCapacity" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 700, color: "#51413b" }}>
                Max Capacity (Donors)
              </label>
              <input
                id="maxCapacity"
                type="number"
                name="maxCapacity"
                min="1"
                max="100"
                value={formData.maxCapacity}
                onChange={handleInputChange}
                required
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "0 12px",
                  borderRadius: "10px",
                  border: "1px solid #e7dcd3",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: "8px" }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "12px 24px",
                background: "#862f2b",
                color: "#fff",
                border: 0,
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "14px",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Creating Slot..." : "Create Appointment Slot"}
            </button>
          </div>
        </form>
      </section>

      {/* Appointment Slots List Section */}
      <section
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "16px",
          border: "1px solid #e7dcd3",
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontFamily: "Manrope, sans-serif", fontSize: "20px" }}>
          Existing Appointment Slots
        </h3>

        {loading ? (
          <p style={{ color: "#81716a", fontSize: "14px" }}>Loading slots...</p>
        ) : slots.length === 0 ? (
          <p style={{ color: "#81716a", fontSize: "14px" }}>No appointment slots have been created yet.</p>
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
                <tr style={{ borderBottom: "2px solid #e7dcd3", color: "#51413b" }}>
                  <th style={{ padding: "10px 12px" }}>Date</th>
                  <th style={{ padding: "10px 12px" }}>Time Window</th>
                  <th style={{ padding: "10px 12px" }}>Booked / Capacity</th>
                  <th style={{ padding: "10px 12px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => {
                  const isFull = slot.bookedCount >= slot.maxCapacity;
                  return (
                    <tr key={slot.id} style={{ borderBottom: "1px solid #f0e6de" }}>
                      <td style={{ padding: "12px", fontWeight: 600 }}>{slot.date}</td>
                      <td style={{ padding: "12px" }}>
                        {slot.startTime} – {slot.endTime}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {slot.bookedCount} / {slot.maxCapacity}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: !slot.isAvailable || isFull ? "#f5f5f5" : "#e8f5e9",
                            color: !slot.isAvailable || isFull ? "#757575" : "#2e7d32",
                          }}
                        >
                          {!slot.isAvailable ? "Closed" : isFull ? "Full" : "Available"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
