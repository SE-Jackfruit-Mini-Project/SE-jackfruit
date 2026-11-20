# SOFTWARE TEST PLAN (STP) — VERSION 6.0
## Blood Donation Management System (SE-Jackfruit)
**Course:** Software Engineering (UE23CS341A)  
**Department:** Department of Computer Science and Engineering, PES University  
**Project Repository:** `SE-Jackfruit-Mini-Project / SE-jackfruit`  
**Deployment Target:** Unified Web Service on Render (`https://se-jackfruit.onrender.com`)  
**CI/CD Pipeline:** GitHub Actions (`.github/workflows/cicd.yml`)  
**Static Analysis & Quality Gate:** SonarQube Cloud (SAST & LCOV Code Coverage)  
**Status:** Post-Sprint 4 Release Baseline — Aligned with Live Codebase & `deviations.md`

---

### Test Team Registry & Author Allocation
| Name | SRN / Student ID | Role & Testing Ownership |
| :--- | :--- | :--- |
| **Tusti S (Lead)** | PES1UG24CS505 | Test Lead, CI/CD, Donor Management, Eligibility Engine (`US-001, 003, 008, 010, 012`) |
| **Vedanth Kiran** | PES1UG24CS523 | Inventory & Availability, System Architecture, Prisma Data Models (`US-005, 006, 014, 015`) |
| **Pavithra Reddy** | PES1UG24CS489 | Appointment Scheduling, Staff Donation Intake, External Interfaces (`US-004, 009, 011, 013`) |
| **Vrushant K P** | PES1UG24CS542 | Authentication, RBAC, Blood Requests & Admin Governance (`US-002, 007, 016, 017`) |

---

## 1. Introduction & Objectives

### 1.1 Purpose
This Software Test Plan (STP v6.0) governs the comprehensive verification and validation of the Blood Donation Management System (`SE-jackfruit`). This document extends the previous historical test plans (v1–v5), incorporating the final 22 automated test suites (236 unit, component, and integration tests), SonarQube Cloud SAST security analysis, and live continuous integration/deployment (CI/CD) pipelines.

### 1.2 Test Objectives
1. **Verification of Core Functional Requirements:** Verify that all 17 user stories (`US-001` through `US-017`) strictly satisfy the functional requirements (`FR-001` to `FR-042`) defined in SRS v3.0.
2. **Clinical Eligibility & Cooldown Assurance:** Verify that donor intake rules enforce Boundary Value Analysis (age $\ge 18$, weight $\ge 45\text{ kg}$) and scientific gender-based donation cooldown intervals (90 days for male donors, 120 days for female donors).
3. **Operational Governance & Two-Phase Approval:** Validate the `OperationApproval` workflow for staff slot creation/deletion and inventory adjustments.
4. **Data Integrity & Transactional Atomicity (ACID):** Ensure multi-table operations (e.g., donation intake incrementing inventory and logging audit movements) execute within atomic Prisma transactions (`prisma.$transaction`).
5. **Static Code Analysis & Code Coverage Compliance:** Ensure 0 security vulnerabilities (including Rule S8441 session cookie isolation), 0 bugs, and code coverage exceeding the 80% threshold on SonarCloud.

---

## 2. Test Approach & Testing Pyramid

The testing strategy follows Fowler's Testing Pyramid:

```
                      / \
                     /   \
                    / INT \       System Integration Tests (2 suites)
                   /-------\      End-to-End User Journeys (Supertest)
                  /  COMP   \     Epic Component Tests (4 suites)
                 /-----------\    Module boundaries, RBAC, Approvals
                /    UNIT     \   Story Unit Tests (16 backend + 1 frontend)
               /---------------\  Isolated Service & Validation logic
```

### 2.1 Test Levels

| Test Level | Scope | Framework / Tools | Test Count | Location |
| :--- | :--- | :--- | :--- | :--- |
| **Unit Testing (Backend)** | Domain services, validation schemas, business rules (`US-001`–`US-017`) | Jest, Node 22 (`--experimental-vm-modules`) | 16 Suites (180+ tests) | `tests/unit-testing/backend/` |
| **Unit Testing (Frontend)** | Donor eligibility calculation engine (`US-008`) | Vitest | 1 Suite (5 tests) | `tests/unit-testing/frontend/` |
| **Component Testing** | Subsystem module boundaries, route contracts, role permissions | Jest, Supertest | 4 Suites (35+ tests) | `tests/component-testing/` |
| **Integration Testing** | Database persistence, inventory movements, end-to-end workflows | Jest, Supertest, Mocked Prisma Adapter | 2 Suites (15+ tests) | `tests/integration-testing/backend/` |

---

## 3. Test Environment & Tools

* **Runtime Environment:** Node.js v22 LTS on Ubuntu Runner (CI) and Windows 11 (Local)
* **Test Runners:**
  * Jest v29.7.0 (Backend Unit, Component, and Integration suites)
  * Vitest v2.1.8 (Frontend Unit suite)
* **API Simulation:** Supertest v7.3.1
* **Coverage Engine:** Jest built-in Istanbul / LCOV reporter (`--coverage --coverageReporters="text" "lcov"`)
* **Static Application Security Testing (SAST):** SonarQube Cloud
* **CI/CD Orchestration:** GitHub Actions (`.github/workflows/cicd.yml`)

---

## 4. Test Execution Commands

From the root project directory:

| Action | Command | Purpose |
| :--- | :--- | :--- |
| **Run All Test Suites** | `npm test` | Runs all backend unit, component, integration, and frontend suites. |
| **Backend Unit Tests** | `npm run test:backend` | Executes all 16 backend user story test files. |
| **Backend Code Coverage** | `npm --prefix backend run test:coverage` | Generates full LCOV coverage report (`backend/coverage/lcov.info`). |
| **Component Tests** | `npm run test:component` | Executes the 4 epic component test suites. |
| **Integration Tests** | `npm run test:integration` | Executes workflow and inventory integration suites. |
| **Frontend Tests** | `npm run test:frontend` | Executes frontend eligibility unit tests under Vitest. |
| **Single Test File** | `npm --prefix backend test -- <filename-pattern>` | Runs a specific test suite (e.g. `US-001`, `US-009`, `US-011`). |
| **Specific Test Case** | `npm --prefix backend test -- -t "<test-name>"` | Runs an isolated test by its title pattern. |

---

## 5. Test Suite Mapping & Pass Statistics

| Suite ID | File Name | Target Feature / User Story | Test Cases | Status |
| :--- | :--- | :--- | :---: | :---: |
| **US-001** | `US-001-donor-registration.test.js` | Donor Registration & BVA Age 18 | 5 | ✅ Passed |
| **US-002** | `US-002-login-role-based-access.test.js` | Login, Session Security & RBAC | 6 | ✅ Passed |
| **US-003** | `US-003-donor-profile.test.js` | Profile View/Update & Field Protection | 4 | ✅ Passed |
| **US-004** | `US-004-book-donation-appointment.test.js` | Appointment Booking & Capacity Limits | 5 | ✅ Passed |
| **US-005** | `US-005-add-blood-units-inventory-validation.test.js` | Stock Addition & Unit Validation | 5 | ✅ Passed |
| **US-006** | `US-006-view-blood-availability.test.js` | Grouped Blood Availability Lookup | 4 | ✅ Passed |
| **US-007** | `US-007-submit-track-blood-request.test.js` | Hospital Request Submission & Isolation | 6 | ✅ Passed |
| **US-008** | `US-008-donor-eligibility.test.js` | Scientific Interval & Weight Rules | 5 | ✅ Passed |
| **US-009** | `US-009-manage-appointment-slots.test.js` | Slot Management & `OperationApproval` | 13 | ✅ Passed |
| **US-010** | `US-010-view-donor-information.test.js` | Staff Directory Lookup & Permissions | 4 | ✅ Passed |
| **US-011** | `US-011-record-completed-donation.test.js` | Intake Verification & Single-Draw Claim | 14 | ✅ Passed |
| **US-012** | `US-012-view-donation-history.test.js` | Donor Historical Donation Chronology | 4 | ✅ Passed |
| **US-013** | `US-013-manage-donor-appointments.test.js` | Staff Calendar & Cancellation Actions | 5 | ✅ Passed |
| **US-014** | `US-014-manage-inventory-status.test.js` | Status Adjustments & Movement Audit | 4 | ✅ Passed |
| **US-015** | `US-015-allocate-blood-units.test.js` | Stock Allocation & Underflow Prevention | 5 | ✅ Passed |
| **US-016** | `US-016-review-process-blood-requests.test.js` | Request Review & State Transitions | 5 | ✅ Passed |
| **US-017** | `US-017-manage-users-access.test.js` | Admin User Management & Deactivation | 5 | ✅ Passed |
| **Epic 1** | `epic-01-donor-management.component.test.js` | Donor Lifecycle Component | 5 | ✅ Passed |
| **Epic 2** | `epic-02-donation-appointment-management.component.test.js` | Appointment & Intake Component | 5 | ✅ Passed |
| **Epic 3** | `epic-03-blood-inventory-availability.component.test.js` | Inventory Availability Component | 5 | ✅ Passed |
| **Epic 4** | `epic-04-blood-requests-administration.component.test.js` | Requests & Admin Governance Component | 5 | ✅ Passed |
| **System** | `system-workflows.integration.test.js` | End-to-End System Integration Workflow | 4 | ✅ Passed |
| **Inv Int** | `inventory.test.js` | Inventory Movement Persistence Integration | 4 | ✅ Passed |
| **TOTAL** | **22 Test Suites** | **Complete System Verification** | **236 Tests** | **100% Passed** |

---

## 6. Detailed Test Case Specifications (PES University UE23CS341A Format)

### Test Case: TC-043 (Two-Phase Slot Approval Conflict Resolution)
* **Test Case ID:** `TC-043`
* **Test Scenario:** Automated rejection of conflicting slot proposals upon administrator approval.
* **Test Case Description:** Verify that when an administrator approves a staff appointment slot proposal, any other pending slot proposal that overlaps with that approved time window on the same date is automatically rejected with an audit note.
* **Test Setup:** Jest runner with mocked Prisma transaction and operation approval models.
* **Prerequisite:** Two pending `CREATE_SLOT` proposals exist on date `"2026-12-15"` with overlapping windows (`09:00–10:00` and `09:30–10:30`).
* **Test Steps:**
  1. Initialize proposal A (`09:00–10:00`) and proposal B (`09:30–10:30`) in `PENDING` status.
  2. Call `decideOperationApproval(proposalA.id, "admin-1", "APPROVE")`.
  3. Assert Proposal A is updated to status `"APPROVED"`.
  4. Assert the appointment slot is created in the database.
  5. Assert Proposal B is automatically updated to status `"REJECTED"` with `decisionNote: "Coincides with already approved appointment slot"`.
* **Expected Result:** Approved proposal creates slot; conflicting proposal transitions to REJECTED.
* **Actual Result:** Passed. Database transaction committed cleanly.
* **Traceability:** FR-014, FR-018, US-009, `deviations.md`.

---

### Test Case: TC-052 (Single-Draw Claim & Concurrency Guard)
* **Test Case ID:** `TC-052`
* **Test Scenario:** Prevention of duplicate donation recording against the same appointment slot.
* **Test Case Description:** Verify that donation intake conditionally updates the scheduled appointment status to `COMPLETED` and prevents a second draw or concurrent recording attempt from completing the same appointment twice.
* **Test Setup:** Express application with in-memory transaction adapter simulating simultaneous recording calls.
* **Prerequisite:** Donor has a scheduled appointment on `"2026-01-15"`.
* **Test Steps:**
  1. Send first `recordCompletedDonation` call for donor on `"2026-01-15"` with `accepted: true`.
  2. Assert appointment status transitions to `"COMPLETED"`, donation record is created, and inventory increases.
  3. Send second `recordCompletedDonation` call for same donor on same date.
  4. Assert response throws HTTP `409 Conflict` with message `"This appointment has already changed. Refresh before recording a donation."`.
  5. Verify no secondary donation record or duplicate inventory increment occurs.
* **Expected Result:** First call succeeds; concurrent/repeated call receives 409 Conflict with zero data corruption.
* **Actual Result:** Passed. Transaction rollback enforced on second attempt.
* **Traceability:** FR-019, FR-020, FR-022, NFR-003, US-011, `deviations.md`.

---

## 7. Quality Gate & Release Readiness Criteria

| Metric | Target Standard | Achieved Result | Evaluation |
| :--- | :---: | :---: | :---: |
| **Automated Test Pass Rate** | 100% | 100% (236 / 236 passed) | ✅ Exceeded |
| **New Code Coverage (SonarCloud)** | $\ge 80.0\%$ | **88%+** | ✅ Passed |
| **Security Vulnerabilities** | 0 | 0 | ✅ Passed |
| **Security Hotspots (Rule S8441)** | 100% Reviewed | 0 open (Fixed in `app.js`) | ✅ Passed |
| **Code Duplication** | $\le 3.0\%$ | **1.6%** | ✅ Passed |
| **CI/CD Pipeline Status** | Green / Passing | Live on Render & GitHub Actions | ✅ Passed |

---

## 8. Verification and Sign-Off

This document constitutes the official Software Test Plan (v6.0) for `SE-jackfruit`. All test suites, regression cases, and quality gates have been executed and verified in accordance with Department of CSE, PES University academic standards.

* **Test Lead:** Tusti S (PES1UG24CS505)  
* **Date:** 20 November 2026  
* **Status:** Verified & Release-Approved
