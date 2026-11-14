# SE-Jackfruit: Blood Donation Management System

A Software Engineering mini-project built by the JACKFRUIT team. The application supports donor registration and profiles, appointment booking and management, donation records, blood inventory, hospital blood requests, and role-based access.

## Current project status

The application covers 17 user stories across four epics:

1. **Donor Management** — donor registration, login, profile, eligibility information, donor lookup, donation history, and user access administration.
2. **Donation and Appointment Management** — appointment slot management, booking, rescheduling and cancellation, and recording completed donations.
3. **Blood Inventory and Availability** — stock updates, status management, and blood group availability.
4. **Blood Requests and Administration** — hospital requester submissions, staff review, and allocation of approved requests.

The user stories are implemented story by story. Supporting implementation tasks are tracked under their stories; they are not treated as separate delivery units.

## Roles

| Role | Main responsibilities |
|---|---|
| **Donor** | Maintain donor details, view eligibility guidance, book/manage appointments, and view personal donation history. |
| **Hospital requester** | Submit blood requests for a hospital and track those requests. |
| **Staff** | Manage donor appointments, record completed donations, and review/allocate hospital requests. Suggest appointment-slot creation/deletion, blood-unit additions, and inventory adjustments for admin approval. Staff can view their own proposal statuses. |
| **Admin** | Review and approve or reject staff proposals for slot and inventory changes; make those changes directly when needed; manage user roles and account status. |

The backend enforces role and ownership checks. Hiding an action in the UI is not the sole access control.

## Implemented business rules

- Donor age is calculated from date of birth; age is not stored as a separate donor field. Donor date of birth, gender, and blood group are stored on the donor profile. These attributes can be null for non-donor accounts.
- A donor must be **18–65 years old (inclusive)** and weigh at least **45 kg** when booking. Weight is captured for each booking.
- The donation interval is calculated from the date of the donor's latest **accepted, completed donation**, not from an appointment booking. The configured interval is four calendar months for female donors and three for male donors. A booking or cancellation alone does not start this interval.
- Completed donation records are retained. An accepted donation adds units to inventory using the donor's saved blood group; a rejected donation does not add stock.
- Inventory tracks the eight ABO/Rh blood groups and logs additions, donations, allocations, and adjustments as inventory movements. Status is derived from quantity: `OUT_OF_STOCK` at zero, `LOW` at 1–5 units, and `AVAILABLE` above 5 units.
- Hospital requests start as `PENDING`. Staff/admin review them; an approved request can be allocated once. Allocation reduces stock and records the movement together.
- Cancelling an appointment retains it with `CANCELLED` status and releases its slot capacity.
- Staff slot and inventory changes are proposals. A pending proposal has no effect on donor slot availability or blood availability; an administrator must approve it before it is applied. Rejection leaves operational data unchanged.
- Administrators review pending staff proposals in the **Staff Change Approvals** dashboard section. Staff can view their own submitted proposals and their decision status.
- Empty appointment slots can be deleted after admin approval. A slot with any appointment records cannot be deleted, so its history is retained. Administrators may create or delete eligible slots directly.
- Approved stock additions and inventory adjustments update the inventory movement history with the approval. Approval and the operational change are applied transactionally, and a proposal cannot be applied twice.
- Eligibility guidance is informational and does not provide a medical diagnosis or clinical approval.

## Technology

| Part | Technology |
|---|---|
| Frontend | React, Vite, React Router |
| Backend | Node.js, Express, REST API |
| Database | PostgreSQL, Prisma ORM |
| Authentication | Server-side sessions stored in PostgreSQL; `bcryptjs` password hashing |
| Input validation | Zod |
| Backend tests | Jest and Supertest |
| Frontend tests | Vitest |
| CI | GitHub Actions; SonarCloud may run when configured for a pull request |

## Prerequisites

- **Node.js 22 LTS** (npm is included). Node 20 or newer may work locally; CI uses Node 22.
- **PostgreSQL** running on the development computer, normally on port `5432`.
- Git, to clone the project and use its branch/pull request workflow.

The backend and frontend run locally. Each developer configures their own local database; it is not a shared team database. Data created in one developer's local database does not automatically appear in another developer's database.

## Local setup

### 1. Clone and enter the project

```powershell
git clone https://github.com/SE-Jackfruit-Mini-Project/SE-jackfruit.git
cd SE-jackfruit
```

If you already have the project, open a terminal at its root directory.

### 2. Create a local PostgreSQL database

Start the PostgreSQL service and create an empty database in pgAdmin or with `createdb`. Choose any database name you like, then use that same name in `DATABASE_URL` below. Ensure the PostgreSQL username and password are correct for your local server.

### 3. Configure backend environment variables

From the project root, copy the example environment file and edit `backend/.env`:

```powershell
Copy-Item backend/.env.example backend/.env
```

Set values similar to these, replacing the password and database name with your own:

```dotenv
DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/YOUR_DATABASE_NAME?schema=public"
PORT=3000
SESSION_SECRET="a-long-random-secret-for-local-development"
```

The `SESSION_SECRET` is a random value you create for this local installation. Do not reuse a production secret or commit `backend/.env`. The database URL points Prisma to the local PostgreSQL server and database.

### 4. Install dependencies and prepare the Prisma client

Run these commands from the **project root**:

```powershell
npm --prefix backend install
npm --prefix frontend install
npm --prefix backend run db:generate
```

Apply the Prisma schema to the local database:

```powershell
npm --prefix backend run db:push
```

`db:push` synchronizes the database schema with the Prisma schema. If Prisma reports that a change could delete data, stop and review the message; do not reset a database containing data you want to keep. The project also defines `db:migrate` for Prisma migration development, but if migration history and a local database drift, resolve that intentionally rather than accepting a reset prompt.

## Run the application

Open two PowerShell terminals at the project root.

**Terminal 1 — backend API:**

```powershell
cd backend
npm run dev
```

The API listens at `http://localhost:3000`. Its health endpoint is `http://localhost:3000/api/v1/health`.

**Terminal 2 — frontend:**

```powershell
cd frontend
npm run dev
```

Open the Vite URL printed in the terminal, usually **http://localhost:5173**. The frontend proxies `/api` requests to the backend on port 3000. Stop either development server with `Ctrl+C` in its terminal.

## Test and build commands

Run from the project root unless noted:

| Command | What it runs |
|---|---|
| `npm test` | Backend unit tests, epic component tests, backend integration tests, then frontend story unit tests and workflow regressions. |
| `npm run test:backend` | Backend unit tests in `tests/unit-testing/backend`. |
| `npm run test:component` | Four epic-level backend component suites in `tests/component-testing`. |
| `npm run test:integration` | Backend integration/system suites in `tests/integration-testing/backend`. |
| `npm run test:frontend` | Frontend story tests in `tests/unit-testing/frontend` and existing workflow regressions in `frontend/tests/regression`. |
| `npm --prefix frontend run build` | Creates the frontend production build in `frontend/dist`. |

Unit testing uses one suite file per user story: 16 backend suites and frontend US-008, for 17 story suites. Session-refresh cases are part of US-002. Cross-story frontend workflow regressions are kept separately and remain included in the test command.

The epic component suites exercise the API routes and role-specific behavior with mocked services. They verify that staff slot and inventory changes remain pending proposals while administrators can apply changes or review proposals. The integration suite covers the end-to-end persistence and approval behavior. Backend and frontend dependencies must be installed first. Most automated tests use mocks or synthetic data; do not point test runs at a production database. When the Prisma schema changes, regenerate Prisma Client and run `npm --prefix backend run db:push` against your local database before starting the application. Do not reset a database containing data you want to keep.

### CI

The GitHub Actions workflow at `.github/workflows/ci.yml` runs on pushes and pull requests targeting `main`. It installs backend and frontend dependencies, runs backend unit, component, and integration tests, then runs frontend tests and a production build. SonarCloud is an additional check only when its repository integration and workflow configuration are active.

## Repository layout

```text
backend/                 Express API, Prisma schema, and backend package scripts
frontend/                React/Vite application and frontend package scripts
deviations.md            Implementation additions and deviations from the frozen SRS
tests/
  unit-testing/          Backend and frontend unit suites
  component-testing/     Four epic-level backend component suites
  integration-testing/  Backend workflow and inventory integration suites
.github/workflows/       GitHub Actions CI configuration
```

Frozen SRS/SAD Word copies are in srs_document/ and sad_document/. Historical Word test plans remain in testplan_document/; current regression additions are in test_plan-v5.md. Record implementation differences in deviations.md without rewriting frozen baselines. The local review supplement is docs_own_reference/code_review/STATIC_CODE_REVIEW_REPORT-v2.md.

## Development workflow

1. Start from an up-to-date `main` branch and create a separate feature branch for each user story, for example `feature/US-001-donor-registration`.
2. Implement the story and update relevant tests and documentation.
3. Run the appropriate local checks, then open a pull request to `main` and link the related issue.
4. Resolve review feedback and required CI checks. Do not commit secrets, local `.env` files, database dumps, or generated `node_modules`/build output.

## Security and scope notes

- Keep database credentials and session secrets out of Git. `backend/.env` is ignored; share only safe configuration instructions, never actual credentials.
- Use synthetic data in development and testing.
- This project coordinates software workflows; it does not provide clinical eligibility decisions, diagnose or treat patients, conduct laboratory tests, or manage physical collection, storage, or transport of blood.
- External hospital and government integrations and shared hosted production infrastructure are outside the current local-development setup.
