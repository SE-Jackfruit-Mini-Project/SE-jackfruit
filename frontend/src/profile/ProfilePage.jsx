import { useEffect, useState } from "react";

export function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/donors/me")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "We could not load your profile.");
        return result.user;
      })
      .then((user) => {
        if (!active) return;
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
  }, []);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/donors/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "We could not update your profile.");
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
      <a className="back-link" href="/">← Jackfruit Blood Donation</a>
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
        ) : (
          <p className="form-message error" role="alert">
            {message?.text || "We could not load your profile. Please try again."}
          </p>
        )}
      </section>
    </main>
  );
}
