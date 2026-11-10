/**
 * @file ProfilePage.jsx
 * @description Donor profile self-service view component. Displays personal account details
 * and allows donors to modify their registered full legal name in compliance with US-003.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/**
 * ProfilePage component for viewing and editing donor user profile.
 *
 * @component
 * @returns {JSX.Element} Rendered profile management page.
 */
export function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  // Load active donor profile on mount
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
        setDateOfBirth(user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : "");
        setGender(user.gender || "");
      })
      .catch((error) => {
        if (active) setMessage({ type: "error", text: error.message });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [navigate]);

  /**
   * Submits full name update to the donor profile API.
   *
   * @async
   * @function saveProfile
   * @param {React.FormEvent} event - Form event.
   */
  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/donors/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName,
          ...(!profile.dateOfBirth ? { dateOfBirth } : {}),
          ...(!profile.gender ? { gender } : {}),
        }),
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

            <label htmlFor="profileDateOfBirth">Date of birth</label>
            <input
              id="profileDateOfBirth"
              max={new Date(Date.now() - 86400000).toISOString().slice(0, 10)}
              onChange={(event) => setDateOfBirth(event.target.value)}
              required={!profile.dateOfBirth}
              readOnly={Boolean(profile.dateOfBirth)}
              type="date"
              value={dateOfBirth}
            />
            <label htmlFor="profileGender">Gender</label>
            <select
              id="profileGender"
              onChange={(event) => setGender(event.target.value)}
              required={!profile.gender}
              disabled={Boolean(profile.gender)}
              value={gender}
            >
              <option value="">Select</option>
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
            </select>
            <p className="field-hint">
              {!profile.dateOfBirth || !profile.gender
                ? "Add these details once before booking. They cannot be changed after saving."
                : "Date of birth and gender are recorded once and cannot be changed here."}
            </p>

            {message && <p className={`form-message ${message.type}`} role="status">{message.text}</p>}
            <button
              disabled={saving || fullName.trim().length === 0 || ((!profile.dateOfBirth || !profile.gender) && (!dateOfBirth || !gender))}
              type="submit"
            >
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
