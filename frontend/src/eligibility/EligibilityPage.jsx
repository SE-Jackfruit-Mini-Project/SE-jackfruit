import { Link } from "react-router-dom";

// The approved SRS has not defined donor eligibility criteria yet.
const approvedEligibilityInformation = null;

export function EligibilityPage() {
  return (
    <main className="eligibility-page">
      <article className="eligibility-card" aria-labelledby="eligibility-title">
        <p className="eyebrow">Jackfruit Blood Donation</p>
        <h1 id="eligibility-title">Donor eligibility information</h1>
        <p className="eligibility-intro">
          Read the blood bank&apos;s approved guidance before arranging a donation.
        </p>

        {approvedEligibilityInformation ? (
          <section aria-label="Approved donor eligibility guidance">
            {approvedEligibilityInformation}
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
          <Link to="/register">Create a donor account</Link>
          <Link to="/login">Log in</Link>
        </nav>
      </article>
    </main>
  );
}
