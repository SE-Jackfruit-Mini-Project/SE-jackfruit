import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const initialValues = { email: "", password: "" };

export function LoginPage() {
  const [values, setValues] = useState(initialValues);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  function updateField(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
    setMessage(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage({ type: "error", text: result.message || "Login failed. Please try again." });
        return;
      }
      navigate("/dashboard");
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
        <h1 id="intro-title">Welcome back.</h1>
        <p className="intro-copy">
          Log in to access your account and continue making a difference.
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
          <p className="eyebrow">Sign in</p>
          <h2 id="form-title">Log in to your account</h2>
          <p>Enter your credentials to continue.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
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

          <label htmlFor="password">Password</label>
          <input
            autoComplete="current-password"
            id="password"
            name="password"
            onChange={updateField}
            placeholder="Your password"
            required
            type="password"
            value={values.password}
          />

          {message && (
            <p className={`form-message ${message.type}`} role="status">
              {message.text}
            </p>
          )}

          <button disabled={submitting} type="submit">
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="privacy-note">
          Don&apos;t have an account?{" "}
          <Link to="/register">Create an account</Link>
          <br />
          <Link to="/eligibility">View donor eligibility information</Link>
        </p>
      </section>
    </main>
  );
}
