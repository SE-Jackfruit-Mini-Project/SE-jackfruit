# SOFTWARE REQUIREMENTS SPECIFICATION (SRS) — VERSION 3.0
## Blood Donation Management System (SE-Jackfruit)
**Course:** Software Engineering (UE23CS341A)  
**Department:** Department of Computer Science and Engineering, PES University  
**Project Repository:** `SE-Jackfruit-Mini-Project / SE-jackfruit`  
**Deployment Target:** Unified Web Service on Render (`https://se-jackfruit.onrender.com`)  
**Database:** Neon Serverless PostgreSQL (`ep-shiny-cake-bc5wy3at-pooler.c-16.us-east-1.aws.neon.tech/neondb`)  
**Status:** Post-Sprint 4 Release Baseline — Aligned with Live Codebase & `deviations.md`

---

### Project Team & Contribution Registry
| Name | SRN / Student ID | Role & Module Contribution |
| :--- | :--- | :--- |
| **Tusti S (Lead)** | PES1UG24CS505 | Project Lead, CI/CD, Donor Management, Eligibility Engine (`US-001, 003, 008, 010, 012`) |
| **Vedanth Kiran** | PES1UG24CS523 | Inventory & Availability, System Architecture, Prisma Data Models (`US-005, 006, 014, 015`) |
| **Pavithra Reddy** | PES1UG24CS489 | Appointment Scheduling, Staff Donation Intake, External Interfaces (`US-004, 009, 011, 013`) |
| **Vrushant K P** | PES1UG24CS542 | Authentication, RBAC, Blood Requests & Admin Governance (`US-002, 007, 016, 017`) |

---

## 1. Introduction

### 1.1 Purpose
This document specifies the updated, release-grade Software Requirements Specification (SRS v3.0) for the **Blood Donation Management System (`SE-jackfruit`)**. This version captures all implemented system workflows, data schemas, and architectural refinements introduced during Sprints 1 through 4, directly reconciling the initial frozen SRS v2 baseline with the active `deviations.md` record and the live Render cloud deployment.

### 1.2 Scope
The system is a 3-tier web platform engineered to eliminate operational bottlenecks, manual record discrepancies, and critical delays across the blood donation and hospital supply chain. The scope encompasses:
1. **Donor Lifecycle Management:** Secure registration, RBAC profile governance, self-service eligibility checking, appointment scheduling, and personal donation history tracking.
2. **Clinical Eligibility Engine:** Automated validation of age boundaries ($\ge 18$ years), body weight thresholds ($\ge 45\text{ kg}$), and gender-specific donation cooldown intervals (90 days for male donors, 120 days for female donors).
3. **Operational Change Approval (Two-Phase Staff/Admin Governance):** Safe proposal and administrative review workflow (`OperationApproval`) for high-impact actions including appointment slot creation/deletion and inventory adjustments.
4. **Blood Inventory & Audit Movements:** Tracking blood units by blood group with transactional audit logging (`InventoryMovement`) for incoming donations, adjustments, and hospital allocations.
5. **Hospital Blood Request & Allocation:** Multi-stage request workflow (`PENDING` $\to$ `APPROVED`/`REJECTED` $\to$ `FULFILLED`) enforcing strict separation between administrative approval and physical stock allocation.
6. **DevOps & Quality Assurance:** Automated CI/CD pipeline via GitHub Actions, Static Application Security Testing (SAST) via SonarCloud, and comprehensive testing across 83 test cases.

### 1.3 Definitions, Acronyms, and Abbreviations
* **AC:** Acceptance Criteria
* **BVA:** Boundary Value Analysis
* **EP:** Equivalence Partitioning
* **FR:** Functional Requirement
* **NFR:** Non-Functional Requirement
* **RBAC:** Role-Based Access Control (`DONOR`, `HOSPITAL_REQUESTER`, `STAFF`, `ADMIN`)
* **RTM:** Requirements Traceability Matrix
* **SAST:** Static Application Security Testing (SonarQube Cloud)
* **SRS:** Software Requirements Specification
* **TC:** Test Case

---

## 2. Overall Description & Implemented System Architecture

### 2.1 Product Perspective & Deployed Topology
The software operates as a monolithic, unified full-stack web service:
* **Frontend Tier:** React 18 SPA built with Vite and Tailwind CSS.
* **Backend Tier:** Node.js (v22) and Express.js RESTful API, serving both `/api/v1/*` endpoints and pre-compiled client assets from `frontend/dist`.
* **Database & ORM Tier:** Neon Serverless PostgreSQL running via Prisma ORM 6.19 with explicit connection pooling and transactional isolation (`prisma.$transaction`).
* **Session & Security Layer:** `express-session` with PostgreSQL persistent store (`connect-pg-simple`). Implements strict cookie isolation (Rule S8441): static assets bypass session middleware, and session cookies enforce `httpOnly: true`, `secure: true` (in production), and `sameSite: 'lax'`.

### 2.2 Reconciled Baseline & Implemented Deviations
As documented in `deviations.md`, the live implementation refines the initial specification in several critical areas:
1. **Two-Phase Operational Approvals (`OperationApproval` Table):** Staff members propose slot additions/deletions and stock adjustments. Changes remain pending until an Administrator reviews (`APPROVE`/`REJECT`) them. Administrators retain the ability to perform operations directly.
2. **Slot Deletion Integrity:** Slots with existing donor appointment records cannot be deleted, preserving audit and historical integrity.
3. **Proposal Deduplication:** Submitting duplicate deletion proposals while one is pending returns the existing pending record rather than generating redundant approval items.
4. **Strict Gender-Based Cooldown:** Enforced at both client-side booking and server-side donation intake (90 days for males, 120 days for females).
5. **Single-Draw Claim:** Intake marks the scheduled appointment as `COMPLETED` inside a database transaction, rejecting duplicate records for the same donor on the same day.

---

## 3. Detailed Functional Requirements (FR-001 to FR-042)

### 3.1 Authentication & Role-Based Access Control
* **FR-001:** The system shall allow public users to register as Donors or Hospital Requesters with input validation.
* **FR-002:** The system shall authenticate registered users using email and hashed passwords (`bcryptjs`).
* **FR-003:** The system shall reject unauthenticated access to protected API routes with HTTP `401 Unauthorized`.
* **FR-004:** The system shall enforce role-based access control (`DONOR`, `HOSPITAL_REQUESTER`, `STAFF`, `ADMIN`).
* **FR-005:** The system shall deny unauthorized role actions with HTTP `403 Forbidden`.
* **FR-006:** The system shall allow authenticated users to log out, destroying server session and clearing client cookies.

### 3.2 Donor Management & Eligibility Engine
* **FR-007:** The system shall enforce unique email registration, rejecting duplicates with HTTP `409 Conflict`.
* **FR-008:** The system shall validate donor age ($Age \ge 18$) using Boundary Value Analysis.
* **FR-009:** The system shall allow authenticated donors to retrieve their personal profile.
* **FR-010:** The system shall allow authorized staff/admin to view registered donor profiles.
* **FR-011:** The system shall allow donors to update mutable contact info while locking medical identifiers (`bloodGroup`).
* **FR-012:** The system shall evaluate donor eligibility: age $\ge 18$, weight $\ge 45\text{ kg}$, and donation cooldown.
* **FR-013:** The system shall maintain and display historical completed donations for the authenticated donor.

### 3.3 Donation & Appointment Management
* **FR-014:** The system shall allow eligible donors to book appointments for available slots.
* **FR-015:** The system shall prevent overbooking beyond slot `maxCapacity`.
* **FR-016:** The system shall allow donors to reschedule pending appointments to valid alternative slots.
* **FR-017:** The system shall allow donors to cancel pending appointments, incrementing slot availability.
* **FR-018:** The system shall provide staff/admin management interfaces for appointments and slot calendars.
* **FR-019:** The system shall allow staff to record completed donations linked to a scheduled appointment.
* **FR-020:** The system shall associate recorded donations with the donor record and update appointment status to `COMPLETED`.
* **FR-021:** The system shall validate donation intake parameters (units, date, collection notes).
* **FR-022:** The system shall update blood inventory and log movement upon accepted donation intake.

### 3.4 Blood Inventory & Availability
* **FR-023:** The system shall allow staff to propose and administrators to add verified blood units.
* **FR-024:** The system shall track available blood units categorized by blood group and status (`AVAILABLE`, `RESERVED`, `EXPIRED`, `DISCARDED`).
* **FR-025:** The system shall provide public and staff interfaces to view real-time blood stock levels.
* **FR-026:** The system shall return stock availability queries by blood group.
* **FR-027:** The system shall record status adjustments (e.g., quarantine/discard) via `OperationApproval`.
* **FR-028:** The system shall decrement available inventory upon successful hospital request allocation.
* **FR-029:** The system shall reject allocations that exceed available unreserved stock with HTTP `400 Bad Request`.

### 3.5 Blood Requests & Administration
* **FR-030:** The system shall allow authenticated hospital requesters to submit urgent blood requests.
* **FR-031:** The system shall validate request blood group and requested unit quantity ($Units > 0$).
* **FR-032:** The system shall assign initial status `PENDING` to newly submitted requests.
* **FR-033:** The system shall allow requesters to view only their own submitted requests (horizontal isolation).
* **FR-034:** The system shall display live tracking status (`PENDING`, `APPROVED`, `REJECTED`, `FULFILLED`) to the requester.
* **FR-035:** The system shall allow staff and administrators to view the consolidated hospital request queue.
* **FR-036:** The system shall allow authorized staff/admin to review and transition requests to `APPROVED` or `REJECTED`.
* **FR-037:** The system shall record reviewer ID and decision timestamp upon request status update.
* **FR-038:** The system shall allow authorized staff to allocate inventory units to approved requests.
* **FR-039:** The system shall transition allocated requests to `FULFILLED` and record an `InventoryMovement` entry.
* **FR-040:** The system shall allow administrators to view all registered users across all roles.
* **FR-041:** The system shall allow administrators to update user roles (`STAFF`, `ADMIN`, etc.).
* **FR-042:** The system shall allow administrators to activate or deactivate user accounts, immediately revoking access.

---

## 4. Complete Requirements Traceability Matrix (RTM)

The following matrix provides comprehensive forward and backward traceability across **User Stories (US)**, **Functional Requirements (FR)**, **Acceptance Criteria (AC)**, **Test Cases (TC)**, and **Source Test Suites**.

| User Story ID & Title | Functional Req (FR) | Acceptance Criteria (AC) | Test Case ID(s) | Test Level | Implementation Test File |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **US-001: Donor Registration** | FR-001, FR-007, FR-008 | AC-001: Valid payload creates donor with hashed password.<br>AC-002: Duplicate email returns 409.<br>AC-003: Age $< 18$ rejected with 400. | `TC-001`<br>`TC-002`<br>`TC-003`<br>`TC-004`<br>`TC-005` | Unit (Backend) | `tests/unit-testing/backend/US-001-donor-registration.test.js` |
| **US-002: Login & Role-Based Access** | FR-002, FR-003, FR-004, FR-005, FR-006 | AC-001: Valid credentials return session cookie.<br>AC-002: Invalid credentials return 401.<br>AC-003: Role routes strictly protected. | `TC-006`<br>`TC-007`<br>`TC-008`<br>`TC-009`<br>`TC-010`<br>`TC-011` | Unit (Backend) | `tests/unit-testing/backend/US-002-login-role-based-access.test.js` |
| **US-003: Donor Profile Management** | FR-009, FR-010, FR-011 | AC-001: Donor views self profile.<br>AC-002: Donor updates contact fields.<br>AC-003: Blood group modification blocked. | `TC-012`<br>`TC-013`<br>`TC-014`<br>`TC-015` | Unit (Backend) | `tests/unit-testing/backend/US-003-donor-profile.test.js` |
| **US-004: Book Donation Appointment** | FR-014, FR-015, FR-016, FR-017 | AC-001: Available slot books successfully.<br>AC-002: Overbooked slot returns 409.<br>AC-003: Cooldown violation rejected. | `TC-016`<br>`TC-017`<br>`TC-018`<br>`TC-019`<br>`TC-020` | Unit (Backend) | `tests/unit-testing/backend/US-004-book-donation-appointment.test.js` |
| **US-005: Add Blood Units & Inventory** | FR-023, FR-024 | AC-001: Admin adds stock directly.<br>AC-002: Staff proposal creates `OperationApproval`.<br>AC-003: Negative quantity rejected. | `TC-021`<br>`TC-022`<br>`TC-023`<br>`TC-024`<br>`TC-025` | Unit (Backend) | `tests/unit-testing/backend/US-005-add-blood-units-inventory-validation.test.js` |
| **US-006: View Blood Availability** | FR-025, FR-026 | AC-001: Aggregated quantities grouped by blood group.<br>AC-002: Zero-stock groups returned accurately. | `TC-026`<br>`TC-027`<br>`TC-028`<br>`TC-029` | Unit (Backend) | `tests/unit-testing/backend/US-006-view-blood-availability.test.js` |
| **US-007: Submit & Track Blood Request** | FR-030, FR-031, FR-032, FR-033, FR-034 | AC-001: Requester submits valid request (201).<br>AC-002: Hospital only sees own requests.<br>AC-003: Live status accurately tracked. | `TC-030`<br>`TC-031`<br>`TC-032`<br>`TC-033`<br>`TC-034`<br>`TC-035` | Unit (Backend) | `tests/unit-testing/backend/US-007-submit-track-blood-request.test.js` |
| **US-008: Donor Eligibility Rules Engine** | FR-012, FR-013 | AC-001: Male 90-day cooldown enforced.<br>AC-002: Female 120-day cooldown enforced.<br>AC-003: Weight $< 45\text{ kg}$ fails eligibility. | `TC-036`<br>`TC-037`<br>`TC-038`<br>`TC-039`<br>`TC-040` | Unit (Frontend) | `tests/unit-testing/frontend/US-008-donor-eligibility.test.js` |
| **US-009: Manage Appointment Slots** | FR-014, FR-018 | AC-001: Admin creates slot directly.<br>AC-002: Staff creates pending approval.<br>AC-003: Non-empty slot deletion blocked. | `TC-041`<br>`TC-042`<br>`TC-043`<br>`TC-044`<br>`TC-045` | Unit (Backend) | `tests/unit-testing/backend/US-009-manage-appointment-slots.test.js` |
| **US-010: Staff View Donor Information** | FR-010, FR-018 | AC-001: Staff searches donor directory.<br>AC-002: Unauthorized roles denied access (403). | `TC-046`<br>`TC-047`<br>`TC-048`<br>`TC-049` | Unit (Backend) | `tests/unit-testing/backend/US-010-view-donor-information.test.js` |
| **US-011: Staff Record Completed Donation** | FR-019, FR-020, FR-021, FR-022 | AC-001: Scheduled appointment completed.<br>AC-002: Single-draw claim enforced.<br>AC-003: Inventory & movement recorded. | `TC-050`<br>`TC-051`<br>`TC-052`<br>`TC-053`<br>`TC-054`<br>`TC-055` | Unit (Backend) | `tests/unit-testing/backend/US-011-record-completed-donation.test.js` |
| **US-012: View Donation History** | FR-013 | AC-001: Donor views past donations.<br>AC-002: Sorted chronologically descending. | `TC-056`<br>`TC-057`<br>`TC-058`<br>`TC-059` | Unit (Backend) | `tests/unit-testing/backend/US-012-view-donation-history.test.js` |
| **US-013: Staff Manage Donor Appointments** | FR-016, FR-017, FR-018 | AC-001: Staff views calendar appointments.<br>AC-002: Staff cancels/reschedules for donor. | `TC-060`<br>`TC-061`<br>`TC-062`<br>`TC-063`<br>`TC-064` | Unit (Backend) | `tests/unit-testing/backend/US-013-manage-donor-appointments.test.js` |
| **US-014: Manage Inventory Status** | FR-027 | AC-001: Status change creates `OperationApproval`.<br>AC-002: Approval updates batch status.<br>AC-003: Deduplication of duplicate reviews. | `TC-065`<br>`TC-066`<br>`TC-067`<br>`TC-068` | Unit (Backend) | `tests/unit-testing/backend/US-014-manage-inventory-status.test.js` |
| **US-015: Allocate Blood Units** | FR-028, FR-029, FR-038, FR-039 | AC-001: Allocation succeeds if stock $\ge$ requested.<br>AC-002: Insufficient stock rejected (400).<br>AC-003: Atomic decrement & movement log. | `TC-069`<br>`TC-070`<br>`TC-071`<br>`TC-072`<br>`TC-073` | Unit (Backend) | `tests/unit-testing/backend/US-015-allocate-blood-units.test.js` |
| **US-016: Review & Process Blood Requests** | FR-035, FR-036, FR-037 | AC-001: Staff reviews pending requests.<br>AC-002: Approval/rejection transitions status.<br>AC-003: Reviewer stamp persisted. | `TC-074`<br>`TC-075`<br>`TC-076`<br>`TC-077`<br>`TC-078` | Unit (Backend) | `tests/unit-testing/backend/US-016-review-process-blood-requests.test.js` |
| **US-017: Admin Manage Users & Access** | FR-040, FR-041, FR-042 | AC-001: Admin views all user accounts.<br>AC-002: Role promotion/demotion enforced.<br>AC-003: Deactivated user denied on next API call. | `TC-079`<br>`TC-080`<br>`TC-081`<br>`TC-082`<br>`TC-083` | Unit (Backend) | `tests/unit-testing/backend/US-017-manage-users-access.test.js` |
| **Epic 1: Donor Subsystem Integration** | FR-001–005, FR-007–013 | AC-001: Full donor onboarding, profile, eligibility. | `COMP-001` to `COMP-005` | Component | `tests/component-testing/epic-01-donor-management.component.test.js` |
| **Epic 2: Appointment & Donation Flow** | FR-014–022 | AC-001: Slot creation, booking, intake, single-draw. | `COMP-006` to `COMP-010` | Component | `tests/component-testing/epic-02-donation-appointment-management.component.test.js` |
| **Epic 3: Inventory Availability Flow** | FR-023–029 | AC-001: Stock proposals, admin review, status audits. | `COMP-011` to `COMP-015` | Component | `tests/component-testing/epic-03-blood-inventory-availability.component.test.js` |
| **Epic 4: Request & Admin Governance** | FR-030–042 | AC-001: Hospital request, review, allocation, RBAC. | `COMP-016` to `COMP-020` | Component | `tests/component-testing/epic-04-blood-requests-administration.component.test.js` |
| **System E2E Lifecycle Workflow** | FR-001 to FR-042 | AC-001: Register $\to$ Slot $\to$ Appointment $\to$ Donation $\to$ Inventory $\to$ Request $\to$ Allocation stay connected in single ACID flow. | `INT-001` to `INT-004` | Integration | `tests/integration-testing/backend/system-workflows.integration.test.js` |

---

## 5. Detailed Test Case Specifications (PES University UE23CS341A Format)

The following test specifications demonstrate rigorous test documentation following the Department of CSE format:

### Test Case Specification 1: Donor Registration Boundary Validation
* **Test Case ID:** `TC-001`
* **Test Scenario:** Validate donor registration age boundary using Boundary Value Analysis (BVA).
* **Test Case Description:** Verify that prospective donors under the age of 18 are rejected, while donors exactly 18 years of age are accepted.
* **Test Setup:** Fresh database state with mock Prisma in-memory client. Test runner initialized in Node 22 test environment.
* **Prerequisite:** The applicant email must not already exist in the database.
* **Test Steps:**
  1. Construct registration payload with Date of Birth corresponding to 17 years and 364 days from current date.
  2. Send HTTP `POST /api/v1/auth/register` with payload.
  3. Assert response status code and error message.
  4. Construct registration payload with Date of Birth corresponding to exactly 18 years and 0 days.
  5. Send HTTP `POST /api/v1/auth/register` with payload.
  6. Assert response status code and database user persistence.
* **Test Parameters:**
  * Subcase A (Underage): `{ email: "underage@test.com", dateOfBirth: "2008-11-21", bloodGroup: "O_POSITIVE" }`
  * Subcase B (Valid): `{ email: "valid18@test.com", dateOfBirth: "2008-11-20", bloodGroup: "O_POSITIVE" }`
* **Expected Result:** Subcase A returns HTTP `400 Bad Request` with message `"Donor must be at least 18 years old"`. Subcase B returns HTTP `201 Created` with created user object (password hashed).
* **Actual Result:** Passed (Status: 400 for underage, 201 for valid).
* **Comments:** Verifies BVA boundary on FR-008 and AC-003 of US-001.

---

### Test Case Specification 2: Gender-Based Donation Cooldown Enforcement
* **Test Case ID:** `TC-036`
* **Test Scenario:** Automated donor eligibility verification based on clinical donation intervals.
* **Test Case Description:** Verify that male donors who donated 89 days ago are flagged ineligible, while male donors who donated 91 days ago are eligible. Verify that female donors who donated 119 days ago are ineligible.
* **Test Setup:** Frontend testing environment running Vitest with mock donor session.
* **Prerequisite:** Donor has at least one recorded accepted donation.
* **Test Steps:**
  1. Initialize donor profile with gender: `"MALE"` and last donation date: `Date.now() - 89 days`.
  2. Invoke `evaluateDonorEligibility()` function.
  3. Assert eligibility boolean and cooldown reason.
  4. Advance last donation date to `Date.now() - 91 days` and re-evaluate.
  5. Initialize donor profile with gender: `"FEMALE"` and last donation date: `Date.now() - 119 days` and evaluate.
* **Test Parameters:**
  * Male 89d: `{ gender: "MALE", lastDonation: "2026-08-23", weightKg: 70 }`
  * Male 91d: `{ gender: "MALE", lastDonation: "2026-08-21", weightKg: 70 }`
  * Female 119d: `{ gender: "FEMALE", lastDonation: "2026-07-24", weightKg: 55 }`
* **Expected Result:**
  * Male 89d returns `{ isEligible: false, nextEligibleDate: "...", reason: "Cooldown active (90 days required for male donors)" }`.
  * Male 91d returns `{ isEligible: true }`.
  * Female 119d returns `{ isEligible: false, reason: "Cooldown active (120 days required for female donors)" }`.
* **Actual Result:** Passed across all interval conditions.
* **Comments:** Verifies FR-012, US-008, and `deviations.md` clinical interval rule.

---

### Test Case Specification 3: Two-Phase Operational Approval for Appointment Slots
* **Test Case ID:** `TC-042`
* **Test Scenario:** Staff appointment slot creation requiring administrator approval.
* **Test Case Description:** Verify that when staff submits a new appointment slot, it is placed in `OperationApproval` with status `PENDING` without immediately appearing in the public calendar. Verify that administrator approval persists the slot.
* **Test Setup:** Supertest API client targeting Express app with authenticated session headers.
* **Prerequisite:** Staff user (`staff-1`) and Admin user (`admin-1`) exist in database.
* **Test Steps:**
  1. Authenticate as `STAFF` (`x-test-role: STAFF`, `x-test-user-id: staff-1`).
  2. Send HTTP `POST /api/v1/appointment-slots` with date `"2026-11-25"`, time `"09:00" - "10:00"`, capacity: 5.
  3. Assert response status code HTTP `202 Accepted` and check approval ID returned.
  4. Query public slots `/api/v1/appointment-slots?date=2026-11-25` and assert slot is NOT visible.
  5. Authenticate as `ADMIN` and call `POST /api/v1/operation-approvals/:id/review` with `{ decision: "APPROVE" }`.
  6. Assert response status code HTTP `200 OK`.
  7. Re-query public slots and assert slot is now visible with `maxCapacity: 5`.
* **Test Parameters:** Payload: `{ date: "2026-11-25", startTime: "09:00", endTime: "10:00", maxCapacity: 5 }`.
* **Expected Result:** Slot proposal returns 202; pending slot remains unlisted; admin approval returns 200 and activates slot in inventory calendar.
* **Actual Result:** Passed. Database transaction committed cleanly.
* **Comments:** Directly verifies `deviations.md` operational governance addition for US-009 and FR-018.

---

### Test Case Specification 4: Transactional Stock Allocation & Inventory Movement Audit
* **Test Case ID:** `TC-070`
* **Test Scenario:** Atomic inventory decrement and audit trail recording during hospital blood request allocation.
* **Test Case Description:** Verify that allocating blood units to an approved hospital request decrements the `BloodInventory` stock and inserts an audit row into `InventoryMovement` inside an atomic transaction.
* **Test Setup:** Express test server with mocked Prisma transaction rollback spy. Initial inventory for `B_POSITIVE` set to 10 units.
* **Prerequisite:** Request with ID `req-1` exists with status `APPROVED`, blood group `B_POSITIVE`, and requested units: 4.
* **Test Steps:**
  1. Authenticate as `STAFF` with allocation permission.
  2. Send HTTP `POST /api/v1/requests/req-1/allocate` with `{ allocatedUnits: 4 }`.
  3. Assert HTTP response status code `200 OK`.
  4. Inspect `BloodInventory` record for `B_POSITIVE` and assert available units equals 6 ($10 - 4 = 6$).
  5. Inspect `InventoryMovement` table and assert record exists with `type: "ALLOCATION"`, `units: 4`, `requestId: "req-1"`.
  6. Attempt allocation of 7 units against remaining 6 units and assert HTTP `400 Bad Request`.
* **Test Parameters:** `{ requestId: "req-1", bloodGroup: "B_POSITIVE", units: 4 }`.
* **Expected Result:** Available inventory decrements from 10 to 6; audit movement recorded; excessive subsequent allocation returns HTTP 400 with no stock change.
* **Actual Result:** Passed with zero state contradiction.
* **Comments:** Verifies ACID transaction integrity (NFR-003, FR-028, FR-029, FR-039, US-015).

---

## 6. Verification and Sign-Off

This document constitutes the official updated Software Requirements Specification (v3.0) for `SE-jackfruit`. All 42 functional requirements, 22 non-functional requirements, and 83 test cases have been cross-verified against the active codebase, CI/CD pipeline, and deployed cloud environment.

* **Approved by:** Project Lead (Tusti S), Architecture Lead (Vedanth Kiran), QA Lead (Pavithra Reddy), Security/Backend Lead (Vrushant K P)  
* **Date:** 20 November 2026  
* **Institutional Affiliation:** PES University, Department of Computer Science and Engineering (`UE23CS341A`)
