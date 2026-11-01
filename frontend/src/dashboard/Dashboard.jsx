
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BloodRequests } from "../requests/BloodRequests.jsx";
import { ManageSlots } from "../slots/ManageSlots.jsx";
import { BookAppointment } from "../appointments/BookAppointment.jsx";
import { ManageAppointments } from "../appointments/ManageAppointments.jsx";
import { StockEntry } from "../inventory/StockEntry.jsx";
import { BloodAvailability } from "../inventory/BloodAvailability.jsx";
import { RecordDonation } from "../donations/RecordDonation.jsx";

export function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inventoryVersion, setInventoryVersion] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/v1/auth/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthenticated");
        return res.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => navigate("/login"))
      .finally(() => setLoading(false));
  }, [navigate]);

  async function handleLogout() {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    navigate("/login");
  }

  if (loading) return null;

  return (
    <main
      style={{
        padding: "40px 24px",
        fontFamily: "DM Sans, sans-serif",
        maxWidth: "860px",
        margin: "0 auto",
      }}
    >
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
              : user?.role === "STAFF"
              ? "Staff Portal"
              : user?.role === "ADMIN"
              ? "Admin Portal"
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
        <div style={{ marginTop: "32px", display: "grid", gap: "0" }}>
          <BloodAvailability />
          <BloodRequests />
        </div>
      ) : user?.role === "STAFF" ? (
        <div
          style={{
            marginTop: "32px",
            display: "grid",
            gap: "28px",
          }}
        >
          <BloodAvailability refreshKey={inventoryVersion} />

          <StockEntry
            onAdded={() => setInventoryVersion((version) => version + 1)}
          />

          <ManageSlots />
          <RecordDonation />
        </div>
      ) : user?.role === "ADMIN" ? (
        <section
          style={{
            marginTop: "32px",
            background: "#fff",
            padding: "32px",
            borderRadius: "16px",
            border: "1px solid #e7dcd3",
          }}
        >
          <h3 style={{ fontFamily: "Manrope, sans-serif", marginTop: 0 }}>
            Administrative access
          </h3>
          <p style={{ color: "#81716a", lineHeight: 1.6 }}>
            User, role, and account-status management is planned under US-017.
            It is not part of the Sprint 1 operational dashboard yet.
          </p>
        </section>
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
              <BookAppointment />
              <ManageAppointments />
            </>
          )}
        </>
      )}
    </main>
  );
}
