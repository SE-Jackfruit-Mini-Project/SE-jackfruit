/**
 * @file BookAppointment.jsx
 * @description Donor appointment booking component. Displays available donation slots, allows donors
 * to reserve slots with optional notes, enforces real-time capacity checks, and renders the donor's
 * booked appointments (US-004 / AC-1 through AC-7).
 */

import { useState, useEffect } from "react";

function calculateAge(dateOfBirth, at = new Date()) {
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;
  let age = at.getUTCFullYear() - birthDate.getUTCFullYear();
  if (at.getUTCMonth() < birthDate.getUTCMonth()
    || (at.getUTCMonth() === birthDate.getUTCMonth() && at.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return age;
}

function addCalendarMonths(date, months) {
  const targetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), Math.min(date.getUTCDate(), lastDay),
    date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds(),
  ));
}

/**
 * BookAppointment component for selecting and reserving blood donation slots.
 *
 * @component
 * @returns {JSX.Element} Rendered booking interface and donor appointment summary.
 */
export function BookAppointment({ donor }) {
  // State for available slots, personal appointments, loading states, and form inputs
  const [slots, setSlots] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [donationHistory, setDonationHistory] = useState([]);
  const [donationHistoryLoaded, setDonationHistoryLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookingSlotId, setBookingSlotId] = useState(null);
  const [notes, setNotes] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const currentAge = donor?.dateOfBirth ? calculateAge(donor.dateOfBirth) : null;
  const ageEligible = currentAge !== null && currentAge >= 18 && currentAge <= 65;
  const intervalMonths = donor?.gender === "FEMALE" ? 4 : donor?.gender === "MALE" ? 3 : null;
  const latestDonation = donationHistory.reduce((latest, donation) => {
    if (!donation.donationDate) return latest;
    return !latest || new Date(donation.donationDate) > new Date(latest.donationDate) ? donation : latest;
  }, null);
  const nextEligibleDate = latestDonation && intervalMonths
    ? addCalendarMonths(new Date(latestDonation.donationDate), intervalMonths)
    : null;
  const intervalEligible = !nextEligibleDate || new Date() >= nextEligibleDate;
  const weightEntered = weightKg !== "";
  const weightEligible = weightEntered && Number(weightKg) >= 45;

  let eligibilityStatus;
  if (!ageEligible) {
    eligibilityStatus = {
      type: "error",
      text: currentAge === null
        ? "Your date of birth is missing. Complete your donor profile before booking."
        : `Not eligible to book: your age is ${currentAge}; the allowed range is 18–65.`,
    };
  } else if (!intervalMonths) {
    eligibilityStatus = {
      type: "error",
      text: "Your gender is missing from your donor profile. Complete your profile before booking.",
    };
  } else if (!donationHistoryLoaded) {
    eligibilityStatus = {
      type: "pending",
      text: "Checking your recorded donation history before confirming eligibility.",
    };
  } else if (!intervalEligible) {
    eligibilityStatus = {
      type: "error",
      text: `Your last accepted donation was on ${latestDonation.donationDate.slice(0, 10)}. You can book again on or after ${nextEligibleDate.toISOString().slice(0, 10)}.`,
    };
  } else if (!weightEntered) {
    eligibilityStatus = {
      type: "pending",
      text: "Your age and waiting period since your last accepted donation meet the booking checks. Select a slot and enter your current weight to complete the check.",
    };
  } else if (!weightEligible) {
    eligibilityStatus = {
      type: "error",
      text: "Not eligible to book: your current weight must be at least 45 kg.",
    };
  } else {
    eligibilityStatus = {
      type: "success",
      text: "Eligible to book based on age, time since your last accepted donation, and current weight.",
    };
  }

  // Initial data loading on component mount
  useEffect(() => {
    loadData();
  }, []);

  /**
   * Fetches available appointment slots and the donor's active appointments in parallel.
   *
   * @async
   * @function loadData
   */
  async function loadData() {
    setLoading(true);
    setDonationHistoryLoaded(false);
    try {
      const [slotsRes, apptsRes, donationsRes] = await Promise.all([
        fetch("/api/v1/appointment-slots", { credentials: "include" }),
        fetch("/api/v1/appointments/me", { credentials: "include" }),
        fetch("/api/v1/donation-history", { credentials: "include" }),
      ]);

      if (slotsRes.ok) {
        const slotsData = await slotsRes.json();
        setSlots(slotsData.slots || []);
      }
      if (apptsRes.ok) {
        const apptsData = await apptsRes.json();
        setMyAppointments(apptsData.appointments || []);
      }
      if (donationsRes.ok) {
        const donationsData = await donationsRes.json();
        setDonationHistory(donationsData.donations || []);
        setDonationHistoryLoaded(true);
      }
    } catch {
      console.error("Could not fetch appointment data.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Submits an appointment booking request for a specified slot ID.
   *
   * @async
   * @function handleBook
   * @param {string} slotId - Selected slot identifier.
   */
  async function handleBook(slotId) {
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slotId, notes, weightKg: Number(weightKg) }),
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
      setWeightKg("");
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

      <div
        role="status"
        aria-live="polite"
        style={{
          padding: "14px 18px",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: 500,
          background: eligibilityStatus.type === "success" ? "#e8f5e9" : eligibilityStatus.type === "error" ? "#ffebee" : "#fff8e1",
          color: eligibilityStatus.type === "success" ? "#2e7d32" : eligibilityStatus.type === "error" ? "#c62828" : "#795548",
          border: `1px solid ${eligibilityStatus.type === "success" ? "#c8e6c9" : eligibilityStatus.type === "error" ? "#ffcdd2" : "#ffe0b2"}`,
        }}
      >
        <strong>Appointment eligibility: {eligibilityStatus.type === "success" ? "Eligible" : eligibilityStatus.type === "error" ? "Not eligible" : "Check in progress"}</strong>
        <div style={{ marginTop: "4px" }}>{eligibilityStatus.text}</div>
      </div>

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
          Select an available slot and enter your current weight. Booking requires age 18–65,
          weight of at least 45 kg, and a wait since your last accepted donation of 4 months for female donors or 3 months for male donors. Cancelled or unattended bookings do not start the waiting period.
        </p>

        {loading ? (
          <p style={{ color: "#81716a", fontSize: "14px" }}>Loading available slots...</p>
        ) : slots.length === 0 ? (
          <p style={{ color: "#81716a", fontSize: "14px" }}>
            No upcoming donation slots are currently available. Please check back later or contact staff.
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
                        <label style={{ display: "grid", gap: "4px", color: "#51413b", fontSize: "12px" }}>
                          Weight (kg)
                          <input
                            type="number"
                            min="45"
                            step="0.1"
                            required
                            value={weightKg}
                            onChange={(event) => setWeightKg(event.target.value)}
                            aria-label="Current weight in kilograms"
                            placeholder="At least 45"
                            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e7dcd3", fontSize: "13px", width: "110px" }}
                          />
                        </label>
                        {weightKg && Number(weightKg) < 45 && (
                          <span role="alert" style={{ color: "#c62828", fontSize: "12px" }}>
                            Minimum booking weight is 45 kg.
                          </span>
                        )}
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
                          disabled={submitting || !eligibilityStatus || eligibilityStatus.type !== "success"}
                          onClick={() => handleBook(slot.id)}
                          style={{
                            padding: "8px 16px",
                            background: "#862f2b",
                            color: "#fff",
                            border: 0,
                            borderRadius: "8px",
                            fontWeight: 700,
                            fontSize: "13px",
                            cursor: submitting || eligibilityStatus.type !== "success" ? "not-allowed" : "pointer",
                          }}
                        >
                          {submitting ? "Booking..." : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBookingSlotId(null);
                            setNotes("");
                            setWeightKg("");
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
                  <th style={{ padding: "10px 12px" }}>Weight recorded</th>
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
                    <td style={{ padding: "12px" }}>{appt.weightKg == null ? "—" : `${appt.weightKg} kg`}</td>
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
