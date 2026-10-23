import { useState, useEffect } from "react";

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

export function BloodRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    hospitalName: "",
    bloodGroup: "A_POSITIVE",
    units: 1,
    urgency: "NORMAL",
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      const response = await fetch("/api/v1/requests/my", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch {
      console.error("Could not fetch requests.");
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
      const response = await fetch("/api/v1/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorText = result.errors?.map((err) => err.message).join(" ");
        setMessage({
          type: "error",
          text: errorText || result.message || "Could not submit blood request.",
        });
        return;
      }

      setMessage({ type: "success", text: result.message });
      setFormData({
        hospitalName: "",
        bloodGroup: "A_POSITIVE",
        units: 1,
        urgency: "NORMAL",
      });
      fetchRequests();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ marginTop: "32px", display: "grid", gap: "28px" }}>
      {/* Submit Blood Request Section */}
      <section style={{ background: "#fff", padding: "24px", borderRadius: "16px", border: "1px solid #e7dcd3" }}>
        <h3 style={{ margin: "0 0 16px", fontFamily: "Manrope, sans-serif", fontSize: "20px" }}>
          Submit Blood Request
        </h3>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
          <div>
            <label htmlFor="hospitalName">Hospital / Medical Center Name</label>
            <input
              id="hospitalName"
              name="hospitalName"
              value={formData.hospitalName}
              onChange={handleInputChange}
              placeholder="e.g., City General Hospital"
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div>
              <label htmlFor="bloodGroup">Blood Group</label>
              <select
                id="bloodGroup"
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  minHeight: "50px",
                  padding: "0 15px",
                  borderRadius: "12px",
                  border: "1px solid #e7dcd3",
                  background: "#fff",
                  font: "inherit",
                }}
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg.value} value={bg.value}>
                    {bg.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="units">Units Required</label>
              <input
                id="units"
                name="units"
                type="number"
                min="1"
                max="50"
                value={formData.units}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label htmlFor="urgency">Urgency</label>
              <select
                id="urgency"
                name="urgency"
                value={formData.urgency}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  minHeight: "50px",
                  padding: "0 15px",
                  borderRadius: "12px",
                  border: "1px solid #e7dcd3",
                  background: "#fff",
                  font: "inherit",
                }}
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
          </div>

          {message && (
            <div className={`form-message ${message.type}`} role="status">
              {message.text}
            </div>
          )}

          <button type="submit" disabled={submitting} style={{ marginTop: "8px" }}>
            {submitting ? "Submitting request…" : "Submit Blood Request"}
          </button>
        </form>
      </section>

      {/* Track Submitted Requests Section */}
      <section style={{ background: "#fff", padding: "24px", borderRadius: "16px", border: "1px solid #e7dcd3" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: "20px" }}>
            My Submitted Requests
          </h3>
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

        {loading ? (
          <p style={{ color: "#81716a", fontSize: "14px" }}>Loading your requests…</p>
        ) : requests.length === 0 ? (
          <p style={{ color: "#81716a", fontSize: "14px" }}>No blood requests submitted yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f0e7df", color: "#81716a" }}>
                  <th style={{ padding: "8px" }}>Request ID</th>
                  <th style={{ padding: "8px" }}>Hospital</th>
                  <th style={{ padding: "8px" }}>Blood Group</th>
                  <th style={{ padding: "8px" }}>Units</th>
                  <th style={{ padding: "8px" }}>Urgency</th>
                  <th style={{ padding: "8px" }}>Status</th>
                  <th style={{ padding: "8px" }}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: "1px solid #f5ede6" }}>
                    <td style={{ padding: "10px 8px", fontFamily: "monospace", fontSize: "12px", color: "#6e2522" }}>
                      {req.id}
                    </td>
                    <td style={{ padding: "10px 8px" }}>{req.hospitalName}</td>
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
                          background: req.urgency === "EMERGENCY" ? "#fee2e2" : req.urgency === "URGENT" ? "#fef3c7" : "#e0e7ff",
                          color: req.urgency === "EMERGENCY" ? "#991b1b" : req.urgency === "URGENT" ? "#92400e" : "#3730a3",
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
                          background: req.status === "PENDING" ? "#fef3c7" : req.status === "APPROVED" ? "#d1fae5" : "#fee2e2",
                          color: req.status === "PENDING" ? "#92400e" : req.status === "APPROVED" ? "#065f46" : "#991b1b",
                        }}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px 8px", color: "#81716a", fontSize: "13px" }}>
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
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
