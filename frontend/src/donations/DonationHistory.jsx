import { useEffect, useState } from "react";

function formatGroup(value) {
  return value?.replace("_POSITIVE", "+").replace("_NEGATIVE", "-") || "—";
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export function DonationHistory() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/v1/donation-history", { credentials: "include" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "Could not load donation history.");
        setDonations(result.donations || []);
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section style={{ marginTop: "28px", background: "#fff", padding: "24px", borderRadius: "16px", border: "1px solid #e7dcd3" }}>
      <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: "20px" }}>My Donation History</h3>
      <p style={{ margin: "5px 0 16px", color: "#81716a", fontSize: "14px" }}>Completed donations recorded for your donor account.</p>
      {loading ? <p style={{ color: "#81716a", fontSize: "14px" }}>Loading donation history…</p> : error ? <div className="form-message error" role="alert">{error}</div> : donations.length === 0 ? <p style={{ color: "#81716a", fontSize: "14px" }}>No completed donations have been recorded yet.</p> : (
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }}>
          <thead><tr style={{ borderBottom: "2px solid #e7dcd3", color: "#51413b" }}><th style={{ padding: "10px 12px" }}>Date</th><th style={{ padding: "10px 12px" }}>Blood group</th><th style={{ padding: "10px 12px" }}>Units</th><th style={{ padding: "10px 12px" }}>Status</th></tr></thead>
          <tbody>{donations.map((donation) => <tr key={donation.id} style={{ borderBottom: "1px solid #f0e6de" }}><td style={{ padding: "12px" }}>{formatDate(donation.donationDate)}</td><td style={{ padding: "12px" }}>{formatGroup(donation.bloodGroup)}</td><td style={{ padding: "12px" }}>{donation.units}</td><td style={{ padding: "12px" }}>Completed</td></tr>)}</tbody>
        </table></div>
      )}
    </section>
  );
}
