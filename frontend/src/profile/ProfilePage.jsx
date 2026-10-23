import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    fetch("/api/v1/donors/me", { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (response.status === 401) {
          navigate("/login", { replace: true });
          return null;
        }
        if (!response.ok) throw new Error(result.message || "We could not load your profile.");
        return result.user;
      })
      .then((user) => {
        if (!active || !user) return;
        setProfile(user);
        setFullName(user.fullName);
      })
      .catch((error) => {
        if (active) setMessage({ type: "error", text: error.message });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [navigate]);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/donors/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fullName }),
      });
      const result = await response.json();
      if (!response.ok) {
        const details = result.errors?.map(({ message: text }) => text).join(" ");
        throw new Error(details || result.message || "We could not update your profile.");
      }
      setProfile(result.user);
      setFullName(result.user.fullName);
      setMessage({ type: "success", text: result.message });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "We could not reach the service." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="profile-page">
      <Link className="back-link" to="/dashboard">← Dashboard</Link>
      <section className="profile-card" aria-labelledby="profile-title">
        <div className="profile-avatar" aria-hidden="true">
          {profile?.fullName?.trim()?.charAt(0)?.toUpperCase() || "J"}
        </div>
        <p className="eyebrow">Donor account</p>
        <h1 id="profile-title">Your profile</h1>
        <p className="profile-intro">Keep your account details up to date.</p>

        {loading ? (
          <p className="profile-state" role="status">Loading your profile…</p>
        ) : profile ? (
          <form onSubmit={saveProfile} noValidate>
            <label htmlFor="profileFullName">Full name</label>
            <input
              autoComplete="name"
              id="profileFullName"
              maxLength={120}
              onChange={(event) => setFullName(event.target.value)}
              required
              value={fullName}
            />

            <label htmlFor="profileEmail">Email address</label>
            <input autoComplete="email" id="profileEmail" readOnly value={profile.email} />
            <p className="field-hint">Email address is used to sign in and cannot be changed here.</p>

            {message && <p className={`form-message ${message.type}`} role="status">{message.text}</p>}
            <button disabled={saving || fullName.trim().length === 0} type="submit">
              {saving ? "Saving changes…" : "Save changes"}
            </button>
          </form>
        ) : message ? (
          <p className="form-message error" role="alert">{message.text}</p>
        ) : null}
      </section>
    </main>
  );
}
