import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
    <main style={{ padding: "48px", fontFamily: "DM Sans, sans-serif", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontFamily: "Manrope, sans-serif", margin: 0 }}>Dashboard</h2>
        <button
          onClick={handleLogout}
          style={{
            padding: "10px 20px",
            background: "#862f2b",
            color: "#fff",
            border: 0,
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Log out
        </button>
      </div>
      <p style={{ marginTop: 24, color: "#51413b" }}>
        Welcome, <strong>{user?.fullName}</strong>
      </p>
      <p style={{ color: "#81716a", fontSize: 14 }}>
        Role: <strong>{user?.role}</strong>
      </p>
      {user?.role === "DONOR" && (
        <Link className="dashboard-profile-link" to="/profile">View or update your donor profile</Link>
      )}
    </main>
  );
}
