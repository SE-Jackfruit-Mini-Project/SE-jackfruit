# Backend local setup

Use Node 22 and a local PostgreSQL database. Copy .env.example only if .env does not exist; preserve existing credentials. Set DATABASE_URL and SESSION_SECRET, install dependencies, then run npm run db:generate and npm run db:push from backend. Review data-loss warnings; do not reset a database containing data you need. Start the API with npm run dev.

Public POST /api/v1/auth/register creates DONOR accounts only. Registration records fullName, email, password, dateOfBirth, gender and bloodGroup. Passwords are hashed. Non-donor roles are assigned through administrator user management after initial local admin provisioning. No default admin credentials are shipped by this README.

GET and PUT /api/v1/donors/me serve the signed-in donor. Full name is editable; missing date of birth, gender and blood group can be supplied once. Recorded values and email cannot be changed through that form. Session identity is refreshed from the database before protected routing.

Staff slot/inventory changes are proposals. Administrators approve/reject them or make changes directly. Pending proposals do not change availability. Booking reserves capacity atomically. Donation intake requires a scheduled appointment on the recorded date and completes it transactionally.

The frozen SRS/SAD remain unchanged. See ../deviations.md for requirement mappings, API differences and limitations. The original STATIC_CODE_REVIEW_REPORT.md is historical; the local consistency review supplement is separate.

## Optional local database regression check

Run node scripts/check-local-consistency.mjs from backend. It accepts only a localhost database, creates disposable fictional users/slots/appointments, records unaccepted test donations, and deletes its own fixtures in finally. It does not alter existing sample accounts or inventory. This is separate from mocked CI tests.
