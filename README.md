# SE-jackfruit — Blood Donation Management System
Software Engineering mini-project for the PES University JACKFRUIT Software Engineering Project.
## Project Overview
The Blood Donation Management System is a web application for managing donor information, donation appointments and records, blood inventory, blood requests, request decisions, allocation, and user access.
## Team
| Member | SRN | Functional Area |
|---|---|---|
| Tusti S | PES1UG24CS505 | Donor Management |
| Pavithra Reddy | PES1UG24CS489 | Donation & Appointment Management |
| Vedanth Kiran | PES1UG24CS523 | Blood Inventory & Availability |
| Vrushant K P | PES1UG24CS542 | Blood Requests & Administration |
All members participate in requirements, design, implementation, testing, reviews, and documentation. Functional areas indicate coordination ownership, not exclusive responsibility.
## System Scope
The system supports:
- User registration, login, logout, and role-based access control
- Donor registration, profiles, eligibility information, and donation history
- Donation appointment booking, viewing, rescheduling, and cancellation
- Staff management of appointments and completed donation records
- Blood inventory maintenance and availability lookup
- Blood request submission and status tracking
- Authorized request review, approval/rejection, and allocation
- Administrator management of users, roles, and account status
Out of scope: medical diagnosis or treatment recommendations, laboratory testing, physical blood collection or transportation, payments, emergency medical decisions, and external hospital/government integrations.
## Project Methodology
The project follows **Agile methodology** with weekly Scrum-style implementation sprints.
```text
Requirements → SRS → Architecture & Design → Backlog Refinement
      → Implementation → Automated & Manual Testing
      → Integration & Regression Testing → Demo & Final Documentation
```
The team uses a planning and requirements phase before implementation. The university implementation schedule remains:
- **Implementation Sprint 1:** 19–23 October 2026
- **Implementation Sprint 2:** 26–30 October 2026
## Project Documents
The Version 1 baseline documents are:
- **SRS Version 1.0** — functional and non-functional requirements, business rules, security requirements, acceptance criteria, and requirements traceability.
- **Software Architecture and Design Specification (SAD) Version 1.0** — layered architecture, technology stack, component descriptions, UML sequence diagrams, planned REST API contracts, security architecture, and design decisions.
- **Software Test Plan Version 2.0** — test strategy, environment, responsibilities, schedule, risks, traceability, and planned test cases TC-001–TC-040.
The Test Plan Version 2.0 is aligned with SRS Version 1.0 and SAD Version 1.0. Test cases are a plan; do not describe them as passed until they have actually been executed and evidence has been recorded.
## Planned Technology Stack
The project design selects the following stack:
| Area | Technology | Purpose |
|---|---|---|
| Frontend | React.js with Vite | Web user interface |
| Backend | Node.js with Express.js | Server-side logic and REST APIs |
| Database | PostgreSQL | Persistent relational data |
| Database access | Prisma ORM | Schema, migrations, and database queries |
| Password security | bcrypt | Password hashing |
| Session handling | Secure HTTP-only cookies | Authenticated sessions |
| Frontend testing | Vitest and React Testing Library | Unit and component tests |
| Backend/API testing | Jest and Supertest | Unit and API integration tests |
| Manual API checks | Postman | Request/response verification |
| Version control and CI | Git, GitHub, GitHub Actions | Collaboration, review, and automated checks |
| Design documentation | PlantUML and Draw.io (diagrams.net) | UML and architecture diagrams |
The application will use HTTPS for deployed authenticated communication. Configuration and secrets must not be committed to the repository. Use synthetic test data; do not use real personal or medical data in tests.
## Architecture Overview
The planned architecture is a **modular layered web architecture**:
1. **Presentation layer:** React web UI.
2. **Application/service layer:** Express routes, authentication and authorization middleware, and functional modules for donor management, appointments/donations, inventory/availability, blood requests, and administration.
3. **Persistence layer:** Prisma ORM and PostgreSQL.
The initial version uses one application deployment and a shared relational database. Inventory changes associated with accepted donations and approved request allocations must be handled consistently, using database transactions where required. Authorization must be enforced by the backend, not only by hiding frontend controls.
## Planned API Areas
REST API endpoints use the `/api/v1` prefix. The detailed contracts are documented in SAD Version 1.0, Section 4.3.
- **Authentication and administration:** registration, login, current-user details, logout, user listing, role updates, and account activation/deactivation.
- **Donor management:** donor profile creation/view/update and donation history.
- **Appointments and donations:** booking, viewing, rescheduling, cancellation, staff management, and completed donation recording.
- **Inventory and availability:** inventory lookup, availability checks, authorized adjustments, and inventory transaction history.
- **Blood requests and allocation:** request submission, requester-owned request tracking, staff review, approval/rejection, and allocation of approved requests.
All protected operations must validate input, authenticate the session, enforce role/ownership permissions, and return safe error responses.
## Requirements and Test Case IDs
Keep approved identifiers stable and use them for traceability across requirements, design, implementation, and tests.
| Prefix | Meaning |
|---|---|
| `FR-###` | Functional Requirement |
| `NFR-###` | Non-Functional Requirement |
| `BR-###` | Business Rule |
| `SR-###` | Security Requirement |
| `SO-###` | Security Objective |
| `AC-###` | Acceptance Criterion |
| `TC-###` | Test Case |
Use `TBD` only where the approved requirements documents explicitly leave a value unresolved. In SRS Version 1.0, the numeric response-time and concurrent-user targets in **NFR-001** and **NFR-002** remain TBD; do not invent acceptance thresholds.
## GitHub Workflow
The project uses GitHub for issues, pull requests, code review, and project coordination.
```text
Epic → User Story → Task → Code/Documentation → Pull Request → Review → Merge
```
- Keep `main` as the stable, reviewed branch.
- Do not develop directly on `main`.
- Each completed work item should be submitted through a pull request.
- The PR author must not approve their own PR.
- Address review feedback before merging.
- **Only Tusti (Team Lead) merges pull requests into `main`.**
- Link each pull request to the relevant GitHub issue.
### Branch Naming
Use this convention:
```text
sprint<no>/<member-name>-<short-description>
```
Examples:
```text
sprint1/tusti-requirements
sprint1/pavithra-requirements
sprint1/vedanth-requirements
sprint1/vrushant-requirements
```
Use lowercase, hyphens, and concise descriptions.
### Commit Messages
Use a Conventional Commit-style format:
```text
<type>: <short description>
```
Examples:
```text
docs: update software test plan
feat: implement donor registration
fix: validate donor contact number
test: add inventory allocation tests
```
Keep commits focused and meaningful.
### Pull Request Titles
Use:
```text
<ISSUE-ID>: <short description>
```
Example:
```text
US-001: Implement donor registration
```
Use the actual issue identifier associated with the work item.
## Suggested Documentation Layout
Keep project documents organized in the repository. The team may adjust the exact filenames while preserving a clear structure.
```text
docs/
├── requirements/
├── srs/
├── architecture/
├── design/
├── validation/
├── tests/
└── reviews/
```
Store the SRS, SAD, Test Plan, test evidence, review notes, and approved changes in the relevant folders. Keep the documents synchronized when an approved requirement, API contract, architecture decision, or test case changes.
## Current Planning Baseline
The current documentation baseline is:
- SRS Version 1.0
- SAD Version 1.0
- Software Test Plan Version 2.0
The project team should implement and verify the system against these documents. If a requirement or design decision changes, review the impact, update the relevant documents and traceability, and communicate the change through the GitHub workflow.
## Scope Limitations
The system is a software workflow prototype. It does not perform clinical eligibility decisions, laboratory testing, physical blood collection, storage, or transportation, and it does not integrate with external hospital or government systems in the current scope.
