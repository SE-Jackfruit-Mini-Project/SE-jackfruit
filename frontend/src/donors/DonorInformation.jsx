/**
 * @file DonorInformation.jsx
 * @description Staff donor directory viewing component. Displays registered donors and provides
 * modal/inline inspection of individual donor registration profiles in compliance with US-010.
 */

import { useEffect, useState } from "react";

/**
 * Formats date into a localized calendar date string.
 *
 * @param {string | Date} value - Date value.
 * @returns {string} Formatted date.
 */
function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

/**
 * DonorInformation component for staff inspection of registered donors.
 *
 * @component
 * @returns {JSX.Element} Rendered donor directory interface.
 */
export function DonorInformation() {
  const [donors, setDonors] = useState([]);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Loads all registered donors.
   *
   * @async
   * @function loadDonors
   */
  async function loadDonors() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/donor-information", {
        credentials: "include",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Could not load donor information.");
      setDonors(result.donors || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Fetches specific donor details for the selected donor ID.
   *
   * @async
   * @function viewDonor
   * @param {string} donorId - Unique user ID of the donor.
   */
  async function viewDonor(donorId) {
    setError(null);
    try {
      const response = await fetch(`/api/v1/donor-information/${donorId}`, {
        credentials: "include",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Could not load donor details.");
      setSelectedDonor(result.donor);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadDonors();
  }, []);

  return (
    <section style={{ background: "#fff", padding: "24px", borderRadius: "16px", border: "1px solid #e7dcd3" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: "20px" }}>Registered Donors</h3>
          <p style={{ margin: "5px 0 0", color: "#81716a", fontSize: "14px" }}>View donor details needed for donation activities.</p>
        </div>
        <button type="button" onClick={loadDonors} style={{ padding: "6px 14px", minHeight: "auto", fontSize: "13px", background: "#f3ebe4", color: "#51413b", borderRadius: "8px" }}>Refresh</button>
      </div>

      {error && <div className="form-message error" role="alert">{error}</div>}
      {loading ? <p style={{ color: "#81716a", fontSize: "14px" }}>Loading donors…</p> : donors.length === 0 ? (
        <p style={{ color: "#81716a", fontSize: "14px" }}>No registered donors are available.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }}>
            <thead><tr style={{ borderBottom: "2px solid #e7dcd3", color: "#51413b" }}><th style={{ padding: "10px 12px" }}>Name</th><th style={{ padding: "10px 12px" }}>Email</th><th style={{ padding: "10px 12px" }}>Registered</th><th style={{ padding: "10px 12px" }} /></tr></thead>
            <tbody>{donors.map((donor) => <tr key={donor.id} style={{ borderBottom: "1px solid #f0e6de" }}><td style={{ padding: "12px" }}>{donor.fullName}</td><td style={{ padding: "12px" }}>{donor.email}</td><td style={{ padding: "12px" }}>{formatDate(donor.createdAt)}</td><td style={{ padding: "12px", textAlign: "right" }}><button type="button" onClick={() => viewDonor(donor.id)} style={{ padding: "7px 12px", minHeight: "auto", borderRadius: "8px" }}>View details</button></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {selectedDonor && <div style={{ marginTop: "18px", padding: "16px", background: "#faf5f0", borderRadius: "12px" }}><strong>{selectedDonor.fullName}</strong><p style={{ margin: "8px 0 0", color: "#51413b", fontSize: "14px" }}>Email: {selectedDonor.email}<br />Registered: {formatDate(selectedDonor.createdAt)}</p></div>}
    </section>
  );
}
