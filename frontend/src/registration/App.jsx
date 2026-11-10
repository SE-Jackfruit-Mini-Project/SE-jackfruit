/**
 * @file App.jsx
 * @description Donor registration view component. Provides public registration form with
 * client-side password confirmation matching, communicates with registration endpoint,
 * and navigates to `/login` upon successful account creation in compliance with US-001.
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const initialValues = { fullName: "", email: "", dateOfBirth: "", gender: "", bloodGroup: "", password: "", confirmPassword: "" };

const BLOOD_GROUPS = [
  ["A_POSITIVE", "A+"], ["A_NEGATIVE", "A-"],
  ["B_POSITIVE", "B+"], ["B_NEGATIVE", "B-"],
  ["AB_POSITIVE", "AB+"], ["AB_NEGATIVE", "AB-"],
  ["O_POSITIVE", "O+"], ["O_NEGATIVE", "O-"],
];

/**
 * App component rendering the donor registration page.
 *
 * @component
 * @returns {JSX.Element} Rendered registration view.
 */
export function App() {
  const [values, setValues] = useState(initialValues);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  /**
   * Updates state on input change.
   *
   * @function updateField
   * @param {React.ChangeEvent<HTMLInputElement>} event - Form input event.
   */
  function updateField(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
    setMessage(null);
  }

  /**
   * Validates matching passwords and submits registration details.
   *
   * @async
   * @function handleSubmit
   * @param {React.FormEvent} event - Form event.
   */
  async function handleSubmit(event) {
    event.preventDefault();
    if (values.password !== values.confirmPassword) {
      setMessage({ type: "error", text: "Your passwords do not match." });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName,
          email: values.email,
          dateOfBirth: values.dateOfBirth,
          gender: values.gender,
          bloodGroup: values.bloodGroup,
          password: values.password,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const fieldMessages = result.errors?.map(({ message: text }) => text).join(" ");
        setMessage({
          type: "error",
          text: fieldMessages || result.message || "We could not create your account.",
        });
        return;
      }

      navigate("/login");
    } catch {
      setMessage({ type: "error", text: "We could not reach the service. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="intro-panel" aria-labelledby="intro-title">
        <div className="brand-mark" aria-hidden="true">J</div>
        <p className="eyebrow">Jackfruit Blood Donation</p>
        <h1 id="intro-title">A little time can mean a lot.</h1>
        <p className="intro-copy">
          Create your donor account to take the first step toward giving blood.
        </p>
        <div className="drop-art" aria-hidden="true">
          <span className="drop drop-one" />
          <span className="drop drop-two" />
          <span className="drop drop-three" />
          <span className="art-caption">Every donor matters</span>
        </div>
      </section>

      <section className="form-panel" aria-labelledby="form-title">
        <div className="form-heading">
          <p className="eyebrow">Donor registration</p>
          <h2 id="form-title">Create your account</h2>
          <p>Enter your details below to get started.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="fullName">Full name</label>
          <input
            autoComplete="name"
            id="fullName"
            name="fullName"
            onChange={updateField}
            placeholder="Your name"
            required
            value={values.fullName}
          />

          <label htmlFor="email">Email address</label>
          <input
            autoComplete="email"
            id="email"
            name="email"
            onChange={updateField}
            placeholder="you@example.com"
            required
            type="email"
            value={values.email}
          />

          <label htmlFor="dateOfBirth">Date of birth</label>
          <input
            autoComplete="bday"
            id="dateOfBirth"
            max={new Date(Date.now() - 86400000).toISOString().slice(0, 10)}
            name="dateOfBirth"
            onChange={updateField}
            required
            type="date"
            value={values.dateOfBirth}
          />

          <label htmlFor="gender">Gender</label>
          <select id="gender" name="gender" onChange={updateField} required value={values.gender}>
            <option value="">Select</option>
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
          </select>
          <p className="field-hint">Date of birth and gender are saved to your donor profile for appointment eligibility.</p>

          <label htmlFor="bloodGroup">Blood group</label>
          <select id="bloodGroup" name="bloodGroup" onChange={updateField} required value={values.bloodGroup}>
            <option value="">Select blood group</option>
            {BLOOD_GROUPS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <p className="field-hint">Your blood group is saved once and used for donation records.</p>

          <label htmlFor="password">Password</label>
          <input
            autoComplete="new-password"
            id="password"
            minLength={8}
            name="password"
            onChange={updateField}
            placeholder="At least 8 characters"
            required
            type="password"
            value={values.password}
          />

          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            autoComplete="new-password"
            id="confirmPassword"
            name="confirmPassword"
            onChange={updateField}
            placeholder="Enter your password again"
            required
            type="password"
            value={values.confirmPassword}
          />

          {message && (
            <p className={`form-message ${message.type}`} role="status">
              {message.text}
            </p>
          )}

          <button disabled={submitting} type="submit">
            {submitting ? "Creating account…" : "Create donor account"}
          </button>
        </form>

        <p className="privacy-note">
          Already have an account?{" "}
          <Link to="/login">Log in</Link>
          <br />
          <Link to="/eligibility">View donor eligibility information</Link>
        </p>
      </section>
    </main>
  );
}
