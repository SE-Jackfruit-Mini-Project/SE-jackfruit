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

function calculateAge(value) {
  if (!value) return "Not recorded";
  const [birthYear, birthMonth, birthDay] = value.slice(0, 10).split("-").map(Number);
  if (!birthYear || !birthMonth || !birthDay) return "Not recorded";
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  const beforeBirthday = today.getMonth() + 1 < birthMonth
    || (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay);
  if (beforeBirthday) age -= 1;
  return age >= 0 ? `${age} years` : "Not recorded";
}

function getAge(value) {
  const formatted = calculateAge(value);
  return formatted === "Not recorded" ? null : Number.parseInt(formatted, 10);
}

function formatBloodGroup(value) {
  return value?.replace("_POSITIVE", "+").replace("_NEGATIVE", "-") || "Not recorded";
}

function formatGender(value) {
  if (!value) return "Not recorded";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const filterStyle = {
  width: "100%",
  minHeight: "40px",
  padding: "0 12px",
  borderRadius: "10px",
  border: "1px solid #e7dcd3",
  background: "#fff",
  color: "#51413b",
  fontSize: "14px",
};

/**
 * DonorInformation component for staff inspection of registered donors.
 *
 * @component
 * @returns {JSX.Element} Rendered donor directory interface.
 */
export function DonorInformation({ refreshKey = 0 } = {}) {
  const [donors, setDonors] = useState([]);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [nameSearch, setNameSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [bloodGroupFilter, setBloodGroupFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
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
      setSelectedDonor(null);
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
    void loadDonors();
  }, [refreshKey]);

  const filteredDonors = donors.filter((donor) => {
    const age = getAge(donor.dateOfBirth);
    const matchesName = donor.fullName.toLowerCase().includes(nameSearch.trim().toLowerCase());
    const matchesGender = !genderFilter || donor.gender === genderFilter;
    const matchesBloodGroup = !bloodGroupFilter || donor.bloodGroup === bloodGroupFilter;
    const matchesAge = !ageFilter
      || (ageFilter === "unknown" && age === null)
      || (ageFilter === "under18" && age !== null && age < 18)
      || (ageFilter === "18to65" && age !== null && age >= 18 && age <= 65)
      || (ageFilter === "over65" && age !== null && age > 65);
    return matchesName && matchesGender && matchesBloodGroup && matchesAge;
  });

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
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px", marginBottom: "14px" }}>
            <input aria-label="Search donor name" onChange={(event) => setNameSearch(event.target.value)} placeholder="Search donor name" type="search" value={nameSearch} style={filterStyle} />
            <select aria-label="Filter by gender" onChange={(event) => setGenderFilter(event.target.value)} value={genderFilter} style={filterStyle}>
              <option value="">All genders</option><option value="FEMALE">Female</option><option value="MALE">Male</option>
            </select>
            <select aria-label="Filter by blood group" onChange={(event) => setBloodGroupFilter(event.target.value)} value={bloodGroupFilter} style={filterStyle}>
              <option value="">All blood groups</option>
              {["A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"].map((group) => <option key={group} value={group}>{formatBloodGroup(group)}</option>)}
            </select>
            <select aria-label="Filter by age" onChange={(event) => setAgeFilter(event.target.value)} value={ageFilter} style={filterStyle}>
              <option value="">All ages</option><option value="under18">Under 18</option><option value="18to65">18–65</option><option value="over65">Over 65</option><option value="unknown">Not recorded</option>
            </select>
          </div>
          {filteredDonors.length === 0 ? (
            <p style={{ color: "#81716a", fontSize: "14px" }}>No donors match your search or filters.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }}>
                <thead><tr style={{ borderBottom: "2px solid #e7dcd3", color: "#51413b" }}><th style={{ padding: "10px 12px" }}>Name</th><th style={{ padding: "10px 12px" }} /></tr></thead>
                <tbody>{filteredDonors.map((donor) => <tr key={donor.id} style={{ borderBottom: "1px solid #f0e6de" }}><td style={{ padding: "12px" }}>{donor.fullName}</td><td style={{ padding: "12px", textAlign: "right" }}><button type="button" onClick={() => viewDonor(donor.id)} style={{ padding: "7px 12px", minHeight: "auto", borderRadius: "8px" }}>View details</button></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selectedDonor && <div style={{ marginTop: "18px", padding: "16px", background: "#faf5f0", borderRadius: "12px" }}>
        <strong>{selectedDonor.fullName}</strong>
        <p style={{ margin: "8px 0 0", color: "#51413b", fontSize: "14px", lineHeight: 1.7 }}>
          Email: {selectedDonor.email}<br />
          Registered: {formatDate(selectedDonor.createdAt)}<br />
          Age: {calculateAge(selectedDonor.dateOfBirth)}<br />
          Gender: {formatGender(selectedDonor.gender)}<br />
          Blood group: {formatBloodGroup(selectedDonor.bloodGroup)}
        </p>
      </div>}
    </section>
  );
}
