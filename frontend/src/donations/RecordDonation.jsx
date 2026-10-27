import { useEffect, useState } from "react";

const bloodGroups = [
  ["A_POSITIVE", "A+"],
  ["A_NEGATIVE", "A-"],
  ["B_POSITIVE", "B+"],
  ["B_NEGATIVE", "B-"],
  ["AB_POSITIVE", "AB+"],
  ["AB_NEGATIVE", "AB-"],
  ["O_POSITIVE", "O+"],
  ["O_NEGATIVE", "O-"],
];

const today = new Date().toISOString().slice(0, 10);

const inputStyle = {
  width: "100%",
  minHeight: "44px",
  padding: "0 12px",
  borderRadius: "10px",
  border: "1px solid #e7dcd3",
  background: "#fff",
  fontSize: "14px",
};

export function RecordDonation() {
  const [donors, setDonors] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const [formData, setFormData] = useState({
    donorId: "",
    bloodGroup: "",
    units: "1",
    donationDate: today,
    accepted: "",
    notes: "",
  });

  useEffect(() => {
    refreshData();
  }, []);

  async function refreshData() {
    setLoading(true);

    try {
      const [donorResponse, donationResponse] = await Promise.all([
        fetch("/api/v1/donations/donors", {
          credentials: "include",
        }),
        fetch("/api/v1/donations", {
          credentials: "include",
        }),
      ]);

      const donorResult = await donorResponse.json();
      const donationResult = await donationResponse.json();

      if (!donorResponse.ok) {
        throw new Error(
          donorResult.message || "Could not load registered donors."
        );
      }

      if (!donationResponse.ok) {
        throw new Error(
          donationResult.message || "Could not load donation history."
        );
      }

      setDonors(donorResult.donors || []);
      setDonations(donationResult.donations || []);

      setFormData((previous) => ({
        ...previous,
        donorId:
          previous.donorId || donorResult.donors?.[0]?.id || "",
      }));
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Could not load donation information.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/donations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          donorId: formData.donorId,
          bloodGroup: formData.bloodGroup,
          units: Number(formData.units),
          donationDate: formData.donationDate,
          accepted: formData.accepted === "true",
          notes: formData.notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const details = result.errors
          ?.map((item) => item.message)
          .join(" ");

        setMessage({
          type: "error",
          text:
            details ||
            result.message ||
            "Could not record donation.",
        });

        return;
      }

      setMessage({
        type: "success",
        text: result.message || "Donation recorded.",
      });

      setFormData({
        donorId: formData.donorId,
        bloodGroup: "",
        units: "1",
        donationDate: today,
        accepted: "",
        notes: "",
      });

      await refreshData();
    } catch {
      setMessage({
        type: "error",
        text: "Network error. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ marginTop: "28px", display: "grid", gap: "24px" }}>
      <section
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "16px",
          border: "1px solid #e7dcd3",
        }}
      >
        <h3
          style={{
            margin: "0 0 8px",
            fontFamily: "Manrope, sans-serif",
            fontSize: "20px",
          }}
        >
          Record Completed Blood Donation
        </h3>

        <p
          style={{
            margin: "0 0 18px",
            color: "#81716a",
            fontSize: "14px",
            lineHeight: 1.6,
          }}
        >
          Record the completed donation. Only accepted donations are added to
          blood inventory.
        </p>

        {message && (
          <div
            role="status"
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              marginBottom: "16px",
              fontSize: "14px",
              background:
                message.type === "success" ? "#e8f5e9" : "#ffebee",
              color:
                message.type === "success" ? "#2e7d32" : "#c62828",
              border:
                `1px solid ${
                  message.type === "success" ? "#c8e6c9" : "#ffcdd2"
                }`,
            }}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <p style={{ color: "#81716a", fontSize: "14px" }}>
            Loading donors...
          </p>
        ) : donors.length === 0 ? (
          <p style={{ color: "#81716a", fontSize: "14px" }}>
            No registered donors were found.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: "grid", gap: "14px" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "12px",
              }}
            >
              <div>
                <label
                  htmlFor="donation-donor"
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#51413b",
                  }}
                >
                  Registered donor
                </label>

                <select
                  id="donation-donor"
                  name="donorId"
                  value={formData.donorId}
                  onChange={handleInputChange}
                  required
                  style={inputStyle}
                >
                  <option value="">Select donor</option>
                  {donors.map((donor) => (
                    <option key={donor.id} value={donor.id}>
                      {donor.fullName} ({donor.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="donation-blood-group"
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#51413b",
                  }}
                >
                  Blood group
                </label>

                <select
                  id="donation-blood-group"
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleInputChange}
                  required
                  style={inputStyle}
                >
                  <option value="">Select blood group</option>
                  {bloodGroups.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="donation-units"
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#51413b",
                  }}
                >
                  Quantity (units)
                </label>

                <input
                  id="donation-units"
                  name="units"
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={formData.units}
                  onChange={handleInputChange}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  htmlFor="donation-date"
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#51413b",
                  }}
                >
                  Donation date
                </label>

                <input
                  id="donation-date"
                  name="donationDate"
                  type="date"
                  max={today}
                  value={formData.donationDate}
                  onChange={handleInputChange}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  htmlFor="donation-accepted"
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#51413b",
                  }}
                >
                  Donation accepted?
                </label>

                <select
                  id="donation-accepted"
                  name="accepted"
                  value={formData.accepted}
                  onChange={handleInputChange}
                  required
                  style={inputStyle}
                >
                  <option value="">Select decision</option>
                  <option value="true">Accepted</option>
                  <option value="false">Not accepted</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="donation-notes"
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#51413b",
                  }}
                >
                  Notes (optional)
                </label>

                <input
                  id="donation-notes"
                  name="notes"
                  type="text"
                  maxLength="255"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Optional donation notes"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
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
                {submitting ? "Saving donation..." : "Record Donation"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "16px",
          border: "1px solid #e7dcd3",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px",
            fontFamily: "Manrope, sans-serif",
            fontSize: "20px",
          }}
        >
          Recent Donation Records
        </h3>

        {loading ? (
          <p style={{ color: "#81716a", fontSize: "14px" }}>
            Loading donation history...
          </p>
        ) : donations.length === 0 ? (
          <p style={{ color: "#81716a", fontSize: "14px" }}>
            No donations recorded yet.
          </p>
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
                <tr
                  style={{
                    borderBottom: "2px solid #e7dcd3",
                    color: "#51413b",
                  }}
                >
                  <th style={{ padding: "10px 12px" }}>Donor</th>
                  <th style={{ padding: "10px 12px" }}>Blood group</th>
                  <th style={{ padding: "10px 12px" }}>Units</th>
                  <th style={{ padding: "10px 12px" }}>Date</th>
                  <th style={{ padding: "10px 12px" }}>Accepted</th>
                </tr>
              </thead>

              <tbody>
                {donations.map((donation) => (
                  <tr
                    key={donation.id}
                    style={{ borderBottom: "1px solid #f0e6de" }}
                  >
                    <td style={{ padding: "12px" }}>
                      {donation.donor.fullName}
                    </td>
                    <td style={{ padding: "12px" }}>
                      {bloodGroups.find(
                        ([value]) => value === donation.bloodGroup
                      )?.[1] || donation.bloodGroup}
                    </td>
                    <td style={{ padding: "12px" }}>{donation.units}</td>
                    <td style={{ padding: "12px" }}>
                      {String(donation.donationDate).slice(0, 10)}
                    </td>
                    <td style={{ padding: "12px" }}>
                      {donation.accepted ? "Yes" : "No"}
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