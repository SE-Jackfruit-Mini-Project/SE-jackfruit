/**
 * @file EligibilityPage.jsx
 * @description Donor eligibility guidance page component. Renders official blood bank criteria
 * or fallback messaging informing users when medical guidance is pending review in compliance with US-008.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEligibilityState } from "./eligibility-content.js";

/**
 * EligibilityPage component presenting donor criteria.
 *
 * @component
 * @returns {JSX.Element} Rendered eligibility guidance page.
 */
export function EligibilityPage() {
  const eligibility = getEligibilityState();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/v1/auth/me", { credentials: "include" })
      .then(response => { if (active) setSignedIn(response.ok); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return (
    <main className="eligibility-page">
      <article className="eligibility-card" aria-labelledby="eligibility-title">
        <p className="eyebrow">Jackfruit Blood Donation</p>
        <h1 id="eligibility-title">Donor eligibility information</h1>

        {eligibility.available ? (
          <section aria-label="Project appointment booking criteria">
            <p>{eligibility.content}</p>
          </section>
        ) : (
          <section className="eligibility-unavailable" aria-live="polite" role="status">
            <h2>Approved guidance is not available yet</h2>
            <p>
              Please contact your blood bank for donor eligibility information before arranging a
              donation.
            </p>
          </section>
        )}

        <p className="eligibility-note">
          This page does not assess medical eligibility or provide a medical diagnosis.
        </p>

        <nav className="eligibility-links" aria-label="Next steps">
          {signedIn ? <Link to="/dashboard">Back to dashboard</Link> : <>
            <Link to="/register">Create a donor account</Link>
            <Link to="/login">Log in</Link>
          </>}
        </nav>
      </article>
    </main>
  );
}
