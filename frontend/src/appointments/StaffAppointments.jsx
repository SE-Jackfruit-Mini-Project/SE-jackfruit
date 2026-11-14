import { useEffect, useRef, useState } from "react";

export function StaffAppointments({ refreshKey = 0, onChanged }) {
  const [appointments, setAppointments] = useState([]);
  const [status, setStatus] = useState("SCHEDULED");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        const query = new URLSearchParams({ page: String(page) });
        if (status) query.set("status", status);
        const response = await fetch("/api/v1/appointments?" + query, { credentials: "include" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load appointments.");
        if (active) { setAppointments(result.appointments || []); setHasMore(Boolean(result.hasMore)); }
      } catch (failure) {
        if (active) setError(failure.message || "Could not load appointments.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [refreshKey, status, page, reload]);

  async function cancel(appointment) {
    if (pending.current || !window.confirm("Cancel this donor's appointment?")) return;
    pending.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/appointments/" + encodeURIComponent(appointment.id) + "/status", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not cancel appointment.");
      setMessage("Appointment cancelled. Slot capacity has been released.");
      setReload(value => value + 1); onChanged?.();
    } catch (failure) { setError(failure.message || "Could not cancel appointment."); }
    finally { pending.current = false; setBusy(false); }
  }

  return (
    <section style={{ background: "#fff", padding: "24px", borderRadius: "16px", border: "1px solid #e7dcd3" }}>
      <h3 style={{ marginTop: 0 }}>Manage Donor Appointments</h3>
      <p>Review donor appointments and cancel scheduled bookings. Use Record Donation below to complete an appointment.</p>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <label>Status <select aria-label="Appointment status" value={status} disabled={busy} onChange={event => { setStatus(event.target.value); setPage(1); setMessage(""); }}>
          <option value="">All statuses</option><option value="SCHEDULED">Scheduled</option>
          <option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option>
        </select></label>
        <button type="button" disabled={loading || busy} onClick={() => setReload(value => value + 1)}>Refresh appointments</button>
      </div>
      {error && <p className="form-message error" role="alert">{error}</p>}
      {message && <p className="form-message success" role="status">{message}</p>}
      {loading ? <p>Loading appointments…</p> : error ? null : appointments.length === 0 ? <p>No appointments on this page.</p> : (
        <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
          {appointments.map(appointment => (
            <article key={appointment.id} style={{ padding: "16px", border: "1px solid #e7dcd3", borderRadius: "10px" }}>
              <strong>{appointment.donor.fullName}</strong><div>{appointment.donor.email}</div>
              <p>{appointment.slot.date} · {appointment.slot.startTime}–{appointment.slot.endTime} · {appointment.status}</p>
              {appointment.notes && <p>{appointment.notes}</p>}
              {appointment.status === "SCHEDULED" && <button type="button" disabled={busy} onClick={() => cancel(appointment)}>Cancel appointment</button>}
            </article>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "16px" }}>
        <button type="button" disabled={page === 1 || loading || busy} onClick={() => setPage(value => value - 1)}>Previous appointments</button>
        <span>Page {page}</span>
        <button type="button" disabled={!hasMore || loading || busy || Boolean(error)} onClick={() => setPage(value => value + 1)}>Next appointments</button>
      </div>
    </section>
  );
}
