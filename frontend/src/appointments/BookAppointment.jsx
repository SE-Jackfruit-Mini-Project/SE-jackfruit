import { useState, useEffect } from "react";

export function BookAppointment() {
  const [slots, setSlots] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingSlotId, setBookingSlotId] = useState(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [slotsRes, apptsRes] = await Promise.all([
        fetch("/api/v1/appointment-slots", { credentials: "include" }),
        fetch("/api/v1/appointments/me", { credentials: "include" }),
      ]);

      if (slotsRes.ok) {
        const slotsData = await slotsRes.json();
        setSlots(slotsData.slots || []);
      }
      if (apptsRes.ok) {
        const apptsData = await apptsRes.json();
        setMyAppointments(apptsData.appointments || []);
      }
    } catch {
      console.error("Could not fetch appointment data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBook(slotId) {
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slotId, notes }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: result.message || "Could not book appointment. Please try another slot.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: result.message || "Appointment successfully booked!",
      });
      setBookingSlotId(null);
      setNotes("");
      loadData();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ marginTop: "32px", display: "grid", gap: "28px" }}>
      {/* Feedback Message */}
      {message && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 500,
            background: message.type === "success" ? "#e8f5e9" : "#ffebee",
            color: message.type === "success" ? "#2e7d32" : "#c62828",
            border: `1px solid ${message.type === "success" ? "#c8e6c9" : "#ffcdd2"}`,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Available Slots Section (AC-1, AC-2, AC-3) */}
      <section
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "16px",
          border: "1px solid #e7dcd3",
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontFamily: "Manrope, sans-serif", fontSize: "20px" }}>
          Available Donation Appointment Slots
        </h3>
        <p style={{ margin: "0 0 20px", color: "#81716a", fontSize: "14px" }}>
          Select an available slot to book your blood donation appointment.
        </p>

        {loading ? (
          <p style={{ color: "#81716a", fontSize: "14px" }}>Loading available slots...</p>
        ) : slots.length === 0 ? (
          <p style={{ color: "#81716a", fontSize: "14px" }}>
            No donation slots are currently available. Please check back later or contact staff.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {slots.map((slot) => {
              const spotsLeft = slot.maxCapacity - slot.bookedCount;
              const isFull = spotsLeft <= 0 || !slot.isAvailable;
              const isSelected = bookingSlotId === slot.id;

              return (
                <div
                  key={slot.id}
                  style={{
                    padding: "16px 20px",
                    borderRadius: "12px",
                    border: `1px solid ${isSelected ? "#862f2b" : "#e7dcd3"}`,
                    background: isFull ? "#faf7f5" : "#fff",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "16px", color: "#302522" }}>{slot.date}</strong>
                    <div style={{ color: "#81716a", fontSize: "14px", marginTop: "2px" }}>
                      Time: <strong>{slot.startTime} – {slot.endTime}</strong> &bull; Spots remaining:{" "}
                      <span style={{ fontWeight: 700, color: isFull ? "#c62828" : "#2e7d32" }}>
                        {isFull ? "Full" : spotsLeft}
                      </span>
                    </div>
                  </div>

                  <div>
                    {isSelected ? (
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <input
                          type="text"
                          placeholder="Optional note (e.g. first-time donor)"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          maxLength={255}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid #e7dcd3",
                            fontSize: "13px",
                            minWidth: "220px",
                          }}
                        />
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleBook(slot.id)}
                          style={{
                            padding: "8px 16px",
                            background: "#862f2b",
                            color: "#fff",
                            border: 0,
                            borderRadius: "8px",
                            fontWeight: 700,
                            fontSize: "13px",
                            cursor: submitting ? "not-allowed" : "pointer",
                          }}
                        >
                          {submitting ? "Booking..." : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBookingSlotId(null);
                            setNotes("");
                          }}
                          style={{
                            padding: "8px 12px",
                            background: "#eee",
                            color: "#51413b",
                            border: 0,
                            borderRadius: "8px",
                            fontWeight: 600,
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isFull}
                        onClick={() => {
                          setBookingSlotId(slot.id);
                          setMessage(null);
                        }}
                        style={{
                          padding: "8px 18px",
                          background: isFull ? "#ccc" : "#862f2b",
                          color: "#fff",
                          border: 0,
                          borderRadius: "10px",
                          fontWeight: 700,
                          fontSize: "13px",
                          cursor: isFull ? "not-allowed" : "pointer",
                        }}
                      >
                        {isFull ? "Slot Full" : "Book This Slot"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* My Booked Appointments Section (AC-6, AC-7) */}
      <section
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "16px",
          border: "1px solid #e7dcd3",
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontFamily: "Manrope, sans-serif", fontSize: "20px" }}>
          My Booked Appointments
        </h3>

        {loading ? (
          <p style={{ color: "#81716a", fontSize: "14px" }}>Loading your appointments...</p>
        ) : myAppointments.length === 0 ? (
          <p style={{ color: "#81716a", fontSize: "14px" }}>You have no booked appointments yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e7dcd3", color: "#51413b" }}>
                  <th style={{ padding: "10px 12px" }}>Appointment Date</th>
                  <th style={{ padding: "10px 12px" }}>Time Window</th>
                  <th style={{ padding: "10px 12px" }}>Status</th>
                  <th style={{ padding: "10px 12px" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {myAppointments.map((appt) => (
                  <tr key={appt.id} style={{ borderBottom: "1px solid #f0e6de" }}>
                    <td style={{ padding: "12px", fontWeight: 600 }}>{appt.slot?.date || "—"}</td>
                    <td style={{ padding: "12px" }}>
                      {appt.slot?.startTime} – {appt.slot?.endTime}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: 700,
                          background: appt.status === "SCHEDULED" ? "#e8f5e9" : "#f5f5f5",
                          color: appt.status === "SCHEDULED" ? "#2e7d32" : "#757575",
                        }}
                      >
                        {appt.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px", color: "#81716a" }}>{appt.notes || "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
