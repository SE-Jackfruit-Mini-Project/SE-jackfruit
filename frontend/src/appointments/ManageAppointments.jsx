
import { useEffect, useState } from "react";

const panelStyle = {
  background: "#fff",
  padding: "24px",
  borderRadius: "16px",
  border: "1px solid #e7dcd3",
};

const inputStyle = {
  padding: "9px 12px",
  borderRadius: "8px",
  border: "1px solid #e7dcd3",
  fontSize: "13px",
  minWidth: "200px",
};

export function ManageAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [rescheduleId, setRescheduleId] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      const [appointmentsResponse, slotsResponse] = await Promise.all([
        fetch("/api/v1/appointment-management", {
          credentials: "include",
        }),
        fetch("/api/v1/appointment-slots", {
          credentials: "include",
        }),
      ]);

      const appointmentsResult = await appointmentsResponse.json();
      const slotsResult = await slotsResponse.json();

      if (!appointmentsResponse.ok) {
        throw new Error(
          appointmentsResult.message || "Could not load appointments."
        );
      }

      if (!slotsResponse.ok) {
        throw new Error(
          slotsResult.message || "Could not load available slots."
        );
      }

      setAppointments(appointmentsResult.appointments || []);
      setSlots(slotsResult.slots || []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Could not load your appointments.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(appointment) {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

    setBusyId(appointment.id);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/v1/appointment-management/${encodeURIComponent(
          appointment.id
        )}/cancel`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not cancel appointment.");
      }

      setMessage({ type: "success", text: result.message });
      setRescheduleId(null);
      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Network error. Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReschedule(appointment) {
    if (!selectedSlotId) {
      setMessage({
        type: "error",
        text: "Please select a new appointment slot.",
      });
      return;
    }

    setBusyId(appointment.id);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/v1/appointment-management/${encodeURIComponent(
          appointment.id
        )}/reschedule`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ slotId: selectedSlotId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not reschedule appointment.");
      }

      setMessage({ type: "success", text: result.message });
      setRescheduleId(null);
      setSelectedSlotId("");
      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Network error. Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section style={{ ...panelStyle, marginTop: "28px" }}>
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
        <h3
          style={{
            margin: 0,
            fontFamily: "Manrope, sans-serif",
            fontSize: "20px",
          }}
        >
          My Donation Appointments
        </h3>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          style={{
            padding: "7px 14px",
            background: "#f3ebe4",
            color: "#51413b",
            border: 0,
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Refresh
        </button>
      </div>

      <p
        style={{
          margin: "0 0 18px",
          color: "#81716a",
          fontSize: "14px",
          lineHeight: 1.6,
        }}
      >
        View your appointment details and manage scheduled appointments.
      </p>

      {message && (
        <div
          role="status"
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "16px",
            fontSize: "14px",
            background: message.type === "success" ? "#e8f5e9" : "#ffebee",
            color: message.type === "success" ? "#2e7d32" : "#c62828",
            border: `1px solid ${
              message.type === "success" ? "#c8e6c9" : "#ffcdd2"
            }`,
          }}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#81716a", fontSize: "14px" }}>
          Loading appointments...
        </p>
      ) : appointments.length === 0 ? (
        <p style={{ color: "#81716a", fontSize: "14px" }}>
          You don't have any appointments yet.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "14px" }}>
          {appointments.map((appointment) => {
            const slot = appointment.slot;
            const canManage = appointment.status === "SCHEDULED";
            const isEditing = rescheduleId === appointment.id;
            const busy = busyId === appointment.id;

            const availableSlots = slots.filter(
              (candidate) =>
                candidate.id !== appointment.slotId &&
                candidate.isAvailable &&
                candidate.bookedCount < candidate.maxCapacity
            );

            return (
              <article
                key={appointment.id}
                style={{
                  padding: "16px",
                  border: "1px solid #f0e6de",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div>
                    <strong style={{ color: "#302522" }}>
                      {slot?.date || "Date unavailable"}
                    </strong>

                    <p
                      style={{
                        margin: "6px 0",
                        color: "#81716a",
                        fontSize: "14px",
                      }}
                    >
                      {slot?.startTime || "--"} – {slot?.endTime || "--"}
                    </p>

                    <p
                      style={{
                        margin: "6px 0",
                        fontSize: "13px",
                        color: "#81716a",
                      }}
                    >
                      Notes: {appointment.notes || "None"}
                    </p>

                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        background:
                          appointment.status === "SCHEDULED"
                            ? "#e8f5e9"
                            : appointment.status === "CANCELLED"
                            ? "#ffebee"
                            : "#f5f5f5",
                        color:
                          appointment.status === "SCHEDULED"
                            ? "#2e7d32"
                            : appointment.status === "CANCELLED"
                            ? "#c62828"
                            : "#757575",
                      }}
                    >
                      {appointment.status}
                    </span>
                  </div>

                  {canManage && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setRescheduleId(isEditing ? null : appointment.id);
                          setSelectedSlotId("");
                          setMessage(null);
                        }}
                        style={{
                          padding: "8px 12px",
                          border: 0,
                          borderRadius: "8px",
                          background: "#f3ebe4",
                          color: "#51413b",
                          cursor: busy ? "not-allowed" : "pointer",
                          fontSize: "13px",
                        }}
                      >
                        {isEditing ? "Close" : "Reschedule"}
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleCancel(appointment)}
                        style={{
                          padding: "8px 12px",
                          border: 0,
                          borderRadius: "8px",
                          background: "#862f2b",
                          color: "#fff",
                          cursor: busy ? "not-allowed" : "pointer",
                          fontSize: "13px",
                        }}
                      >
                        {busy ? "Please wait..." : "Cancel appointment"}
                      </button>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div
                    style={{
                      marginTop: "14px",
                      paddingTop: "14px",
                      borderTop: "1px solid #f0e6de",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <select
                      value={selectedSlotId}
                      onChange={(event) =>
                        setSelectedSlotId(event.target.value)
                      }
                      style={inputStyle}
                      disabled={busy}
                    >
                      <option value="">Select a new slot</option>

                      {availableSlots.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.date} · {candidate.startTime}–{candidate.endTime}
                          {" · "}
                          {candidate.maxCapacity - candidate.bookedCount} spots
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={busy || !selectedSlotId}
                      onClick={() => handleReschedule(appointment)}
                      style={{
                        padding: "9px 14px",
                        border: 0,
                        borderRadius: "8px",
                        background: "#862f2b",
                        color: "#fff",
                        cursor: busy || !selectedSlotId ? "not-allowed" : "pointer",
                        fontSize: "13px",
                      }}
                    >
                      {busy ? "Saving..." : "Confirm reschedule"}
                    </button>

                    {availableSlots.length === 0 && (
                      <p style={{ width: "100%", color: "#81716a", fontSize: "13px" }}>
                        No alternative slots are available right now.
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
