/**
 * @file Dashboard.jsx
 * @description Centralized role-based application dashboard. Inspects active user authentication
 * session and conditionally renders specialized portals and widgets for:
 * - Hospital Requesters (blood availability, request submission and tracking)
 * - Staff and Admin (user management, request reviews, inventory adjustments, stock entries, slots, donor lookups, donation recordings)
 * - Donors (appointment booking, appointment management, profile links, eligibility info, donation history)
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BloodRequests } from "../requests/BloodRequests.jsx";
import { ReviewRequests } from "../requests/ReviewRequests.jsx";
import { ManageUsers } from "../admin/ManageUsers.jsx";
import { ManageSlots } from "../slots/ManageSlots.jsx";
import { BookAppointment } from "../appointments/BookAppointment.jsx";
import { StockEntry } from "../inventory/StockEntry.jsx";
import { BloodAvailability } from "../inventory/BloodAvailability.jsx";
import { ManageInventory } from "../inventory/ManageInventory.jsx";
import { AllocateRequests } from "../inventory/AllocateRequests.jsx";
import { RecordDonation } from "../donations/RecordDonation.jsx";
import { ManageAppointments } from "../appointments/ManageAppointments.jsx";
import { DonorInformation } from "../donors/DonorInformation.jsx";
import { DonationHistory } from "../donations/DonationHistory.jsx";
import { OperationApprovals } from "../admin/OperationApprovals.jsx";

/**
 * Dashboard component serving as the main view router once authenticated.
 *
 * @component
 * @returns {JSX.Element | null} Rendered dashboard layout according to user role.
 */
export function Dashboard() {
  // Session user profile, loading state, and reactive inventory version counter
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inventoryVersion, setInventoryVersion] = useState(0);
  const [allocationQueueVersion, setAllocationQueueVersion] = useState(0);
  const [slotVersion, setSlotVersion] = useState(0);
  const [requestVersion, setRequestVersion] = useState(0);
  const navigate = useNavigate();

  const [directoryVersion, setDirectoryVersion] = useState(0);
  const [appointmentVersion, setAppointmentVersion] = useState(0);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let active = true;
    let pending = false;
    async function refreshSession() {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch("/api/v1/auth/me", { credentials: "include" });
        if (response.status === 401 || response.status === 403) {
          if (active) { setUser(null); navigate("/login"); }
          return;
        }
        if (!response.ok) throw new Error("Could not reach the service. Please retry.");
        const result = await response.json();
        if (active) { setUser(result.user); setSessionError(""); }
      } catch {
        if (active) setSessionError("Could not reach the service. Please retry.");
      } finally { pending = false; if (active) setLoading(false); }
    }
    const refresh = () => {
      void refreshSession();
      setInventoryVersion(v => v + 1);
      setAllocationQueueVersion(v => v + 1);
      setRequestVersion(v => v + 1);
      setSlotVersion(v => v + 1);
      setDirectoryVersion(v => v + 1);
      setAppointmentVersion(v => v + 1);
    };
    void refreshSession();
    window.addEventListener("focus", refresh);
    const timer = setInterval(() => void refreshSession(), 15000);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [navigate]);

  /**
   * Destroys current session and redirects to login page.
   *
   * @async
   * @function handleLogout
   */
  async function handleLogout() {
    setSessionError("");
    try {
    const response = await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok && response.status !== 401) throw new Error();
    navigate("/login");
    } catch { setSessionError("Could not log out. Please try again."); }
  }

  if (loading) return null;
  if (!user) return sessionError ? <main className="profile-page"><p role="alert">{sessionError}</p><button onClick={() => window.location.reload()}>Retry</button></main> : null;

  return (
    <main
      style={{
        padding: "40px 24px",
        fontFamily: "DM Sans, sans-serif",
        maxWidth: "860px",
        margin: "0 auto",
      }}
    >
      {sessionError && <p className="form-message error" role="alert">{sessionError}</p>}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#fff",
          padding: "20px 28px",
          borderRadius: "16px",
          border: "1px solid #e7dcd3",
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "Manrope, sans-serif",
              margin: 0,
              fontSize: "24px",
            }}
          >
            {user?.role === "HOSPITAL_REQUESTER"
              ? "Hospital Portal"
              : user?.role === "ADMIN" ? "Admin Portal" : user?.role === "STAFF"
              ? "Staff Portal"
              : "Dashboard"}
          </h2>

          <p
            style={{
              margin: "4px 0 0",
              color: "#81716a",
              fontSize: "14px",
            }}
          >
            Signed in as <strong>{user?.fullName}</strong> <br/>
            <span style={{ fontWeight: "bold", color: "#862f2b" }}>
              {user?.role}
            </span>
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: "8px 18px",
            minHeight: "auto",
            background: "#862f2b",
            color: "#fff",
            border: 0,
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "14px",
          }}
        >
          Log out
        </button>
      </header>

      {user?.role === "HOSPITAL_REQUESTER" ? (
        <div
          style={{
            marginTop: "32px",
            display: "grid",
            gap: "0",
          }}
        >
          <BloodAvailability refreshKey={inventoryVersion} />
          <BloodRequests refreshKey={requestVersion} />
        </div>
      ) : user?.role === "STAFF" || user?.role === "ADMIN" ? (
        <div
          style={{
            marginTop: "32px",
            display: "grid",
            gap: "28px",
          }}
        >
          {user?.role === "ADMIN" && <ManageUsers currentAdminId={user.id} refreshKey={directoryVersion} onChanged={() => setDirectoryVersion(v => v + 1)} />}
          <OperationApprovals
            userRole={user.role}
            onDecision={() => {
              setInventoryVersion((version) => version + 1);
              setSlotVersion((version) => version + 1);
            }}
          />
          <ReviewRequests
            refreshKey={requestVersion}
            onReviewed={() => setAllocationQueueVersion((version) => version + 1)}
          />
          <AllocateRequests
            refreshKey={allocationQueueVersion}
            onAllocated={() => {
              setInventoryVersion((version) => version + 1);
              setRequestVersion((version) => version + 1);
            }}
          />
          <BloodAvailability refreshKey={inventoryVersion} />
          <StockEntry
            userRole={user.role}
            onAdded={() => setInventoryVersion((version) => version + 1)}
          />
          <ManageInventory
            refreshKey={inventoryVersion}
            userRole={user.role}
            onChanged={() => setInventoryVersion((version) => version + 1)}
          />

          <ManageSlots userRole={user.role} refreshKey={slotVersion} />
          <DonorInformation refreshKey={directoryVersion} />
          <RecordDonation refreshKey={directoryVersion} onRecorded={() => setInventoryVersion((version) => version + 1)} />
        </div>
      ) : (
        <>
          <section
            style={{
              marginTop: "32px",
              background: "#fff",
              padding: "32px",
              borderRadius: "16px",
              border: "1px solid #e7dcd3",
              textAlign: "center",
            }}
          >
            <h3
              style={{
                fontFamily: "Manrope, sans-serif",
                margin: "0 0 12px",
              }}
            >
              Welcome, {user?.fullName}!
            </h3>

            <p
              style={{
                color: "#81716a",
                maxWidth: "480px",
                margin: "0 auto",
                lineHeight: 1.6,
              }}
            >
              You are currently logged in as <strong>{user?.role}</strong>. Your
              donor profile, appointment booking, and donation history are
              available in the respective donor modules.
            </p>

            {user?.role === "DONOR" && (
              <div className="dashboard-donor-links">
                <Link className="dashboard-profile-link" to="/profile">
                  View or update your donor profile
                </Link>

                <Link className="dashboard-profile-link" to="/eligibility">
                  View donor eligibility information
                </Link>
              </div>
            )}
          </section>

          {user?.role === "DONOR" && (
            <>
              {user.dateOfBirth && user.gender && user.bloodGroup ? (
                <BookAppointment donor={user} refreshKey={appointmentVersion} onBooked={() => setAppointmentVersion(v => v + 1)} />
              ) : (
                <section style={{ marginTop: "28px", padding: "24px", background: "#fff", border: "1px solid #e7dcd3", borderRadius: "16px" }}>
                  <h3 style={{ marginTop: 0 }}>Complete your donor profile to book</h3>
                  <p style={{ color: "#81716a" }}>Add your date of birth, gender, and blood group once in your profile before booking.</p>
                  <Link className="dashboard-profile-link" to="/profile">Complete donor profile</Link>
                </section>
              )}
              <ManageAppointments refreshKey={appointmentVersion} onChanged={() => setAppointmentVersion(v => v + 1)} />
              <DonationHistory refreshKey={appointmentVersion} />
            </>
          )}
        </>
      )}
    </main>
  );
}
