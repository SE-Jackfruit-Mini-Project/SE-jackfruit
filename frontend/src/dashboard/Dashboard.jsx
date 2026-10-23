import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BloodRequests } from "../requests/BloodRequests.jsx";

export function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
    navigate("/login");
  }

  if (loading) return null;

  return (
    <main style={{ padding: "40px 24px", fontFamily: "DM Sans, sans-serif", maxWidth: "860px", margin: "0 auto" }}>
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
          <h2 style={{ fontFamily: "Manrope, sans-serif", margin: 0, fontSize: "24px" }}>
            {user?.role === "HOSPITAL_REQUESTER" ? "Hospital Portal" : "Dashboard"}
          </h2>
          <p style={{ margin: "4px 0 0", color: "#81716a", fontSize: "14px" }}>
            Signed in as <strong>{user?.fullName}</strong> ({user?.email}) &bull;{" "}
            <span style={{ fontWeight: "bold", color: "#862f2b" }}>{user?.role}</span>
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

      {/* Hospital Requester features: Submit and track blood requests */}
      {user?.role === "HOSPITAL_REQUESTER" ? (
        <BloodRequests />
      ) : (
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
          <h3 style={{ fontFamily: "Manrope, sans-serif", margin: "0 0 12px" }}>
            Welcome, {user?.fullName}!
          </h3>
          <p style={{ color: "#81716a", maxWidth: "480px", margin: "0 auto", lineHeight: 1.6 }}>
            You are currently logged in as a <strong>{user?.role}</strong>. Your donor profile,
            appointment booking, and donation history are available in the respective donor modules.
          </p>
        </section>
      )}
    </main>
  );
}
