# STATIC CODE REVIEW REPORT

**Document version:** 2 — local review addendum, 14 November 2026.

Sections 1–9 below retain the original PR #218 report as historical evidence. Their dates, counts and PR status describe that review, not the unpublished local changes. Section 10 records the subsequent local review.


**Project:** SE-Jackfruit – Blood Donation Management System  
**Review Type:** Static Code Analysis and Code Review  
**Date:** 11 November 2026  
**Pull Request:** #218 – Fix SonarQube Security and Reliability Findings  
**Branch:** `fix/static-analysis-findings`  
**Target Branch:** `main`

---

## 1. Introduction

This report documents the static code review performed on the SE-Jackfruit Blood Donation Management System.

The review was conducted using SonarQube to identify security-sensitive coding practices and reliability issues in the project's frontend, backend, and CI workflow.

The objective was to address the identified findings, improve code reliability and security, validate the changes through existing tests, and submit the modifications for review through a GitHub pull request.

## 2. Scope of Review

The review covered the following areas:

- GitHub Actions CI workflow: `.github/workflows/ci.yml`
- Backend Express application configuration: `backend/src/app.js`
- Frontend React components responsible for appointments, donations, donors, inventory, blood requests, and slot management.
- Asynchronous function calls and Promise handling.
- Dependency installation practices in the CI pipeline.

A total of **21 original SonarQube findings** were identified:

| Category | Number of findings |
|---|---:|
| Security | 5 |
| Reliability | 16 |
| **Total** | **21** |

## 3. Security Findings

### 3.1 Dependency Version Locking

**Rule:** `githubactions:S8543`  
**Severity:** Medium  
**File:** `.github/workflows/ci.yml`  
**Occurrences:** 2

**Issue:**

The CI workflow used `npm install` for backend and frontend dependencies. This did not enforce installation strictly from the committed lockfiles.

**Correction:**

Both installation commands were changed to:

```bash
npm ci --ignore-scripts
```

This ensures dependencies are installed using the committed package lockfiles.

### 3.2 Unrestricted Lifecycle Scripts During Installation

**Rule:** `githubactions:S6505`  
**Severity:** Medium  
**File:** `.github/workflows/ci.yml`  
**Occurrences:** 2

**Issue:**

Dependency installation allowed package lifecycle scripts to run automatically.

**Correction:**

The installation commands were updated to use `--ignore-scripts`.

Since the backend uses Prisma, the required engine setup and client generation were added explicitly:

```yaml
- run: npm ci --ignore-scripts
- run: npm rebuild @prisma/engines
- run: npm run db:generate
```

This preserves the required Prisma setup while restricting automatic lifecycle script execution during installation.

### 3.3 Express Framework Information Disclosure

**Rule:** `javascript:S5689`  
**Severity:** Low  
**File:** `backend/src/app.js`  
**Original Location:** Line 29

**Issue:**

The Express application exposed its framework information through the `X-Powered-By` HTTP response header.

**Correction:**

The following statement was added immediately after the Express application instance was created:

```javascript
app.disable('x-powered-by');
```

This prevents Express from exposing the framework identification header in responses.

## 4. Reliability Findings

### 4.1 Unhandled Promise Calls

**Rule:** `javascript:S9338`  
**Severity:** Medium  
**Total Occurrences:** 16

**Issue:**

SonarQube identified asynchronous function calls that were not explicitly awaited, handled with a rejection handler, or marked as intentionally ignored.

These calls primarily occurred in React `useEffect` hooks and operation handlers.

**Correction Approach:**

The changes were made according to the purpose of each call:

- Initial data-loading calls inside `useEffect` were marked using `void` to indicate intentional fire-and-forget execution.
- Data refresh calls following user operations were changed to `await` inside their existing asynchronous handlers.
- Existing error handling and callback references were preserved.

### 4.2 Files Modified

| File | Original locations | Function | Correction |
|---|---|---|---|
| `frontend/src/admin/ManageUsers.jsx` | Line 37 | `fetchUsers()` | `void` |
| `frontend/src/appointments/BookAppointment.jsx` | Lines 29, 97 | `loadData()` | Initial call: `void`; refresh: `await` |
| `frontend/src/appointments/ManageAppointments.jsx` | Line 43 | `loadData()` | `void` |
| `frontend/src/donations/RecordDonation.jsx` | Line 58 | `refreshData()` | `void` |
| `frontend/src/donors/DonorInformation.jsx` | Line 76 | `loadDonors()` | `void` |
| `frontend/src/inventory/AllocateRequests.jsx` | Lines 60, 95 | `fetchRequests()` | Initial call: `void`; refresh: `await` |
| `frontend/src/inventory/BloodAvailability.jsx` | Line 67 | `fetchAvailability()` | `void` |
| `frontend/src/inventory/ManageInventory.jsx` | Lines 69, 127 | `fetchInventory()` | Initial call: `void`; refresh: `await` |
| `frontend/src/requests/BloodRequests.jsx` | Lines 40, 113 | `fetchRequests()` | Initial call: `void`; refresh: `await` |
| `frontend/src/requests/ReviewRequests.jsx` | Line 24 | `fetchRequests()` | `void` |
| `frontend/src/slots/ManageSlots.jsx` | Lines 33, 109 | `fetchSlots()` | Initial call: `void`; refresh: `await` |

**Note:** The line numbers above refer to the original SonarQube findings. They may differ in the modified files.

The final changes consist of:

- 11 intentional fire-and-forget calls marked using `void`.
- 5 operation-triggered refresh calls changed to `await`.

## 5. Validation and Testing

After implementing the changes, the existing project tests and build commands were executed.

### 5.1 Backend Testing

| Test command | Result |
|---|---|
| `npm test` | 16 suites, 123 tests passed |
| `npm run test:component` | 4 suites, 16 tests passed |
| `npm run test:integration` | 2 suites, 28 tests passed |

**Total backend tests passed: 167**

### 5.2 Frontend Testing

| Command | Result |
|---|---|
| `npm test` | 1 test passed |
| `npm run build` | Production build successful |

**Total frontend tests passed: 1**

### 5.3 Prisma Setup

The following commands were executed successfully:

```bash
npm ci --ignore-scripts
npm rebuild @prisma/engines
npm run db:generate
```

Prisma Client generation completed successfully.

### 5.4 Code Change Validation

The following Git validation commands were also used:

```bash
git diff --check
git diff --cached --check
```

No whitespace errors were reported.

**Total local tests passed: 168**

## 6. CI and SonarCloud Verification

The changes were pushed to the `fix/static-analysis-findings` branch and submitted through Pull Request #218.

The pull request checks completed successfully.

| Verification | Result |
|---|---|
| GitHub Actions checks | 3/3 passed |
| SonarCloud Quality Gate | Passed |
| New issues reported in PR analysis | 0 |
| Accepted issues reported | 0 |
| New security hotspots | 0 |
| New dependency risks | 0 |

The SonarCloud pull request analysis passed its Quality Gate with no new issues reported.

The PR analysis result should not be interpreted as confirmation that every original finding has disappeared from the main branch. Final verification of the original findings is to be performed after the pull request is merged and the main branch is reanalysed.

## 7. Additional Dependency Audit Observations

Separate `npm audit` checks were performed for the backend and frontend dependencies.

The audit reported:

| Component | Reported vulnerabilities |
|---|---:|
| Backend | 10 |
| Frontend | 6 |
| **Total** | **16** |

Some suggested automatic fixes involved major version upgrades to existing project dependencies, which could introduce breaking changes.

Therefore, `npm audit fix --force` was not executed.

These dependency audit findings are separate from the original 21 SonarQube findings addressed in this pull request. They remain to be reviewed and handled separately.

## 8. Pull Request Status

The implemented changes and report were committed to the branch:

`fix/static-analysis-findings`

The changes were submitted through:

**PR #218 – fix: address SonarQube security and reliability findings**

The pull request includes the CI workflow modifications, Express configuration change, frontend Promise handling corrections, and this static code review report.

**Current status:** Pull request checks have passed. Formal review and merge by the repository reviewer are pending.


## 9. Conclusion

The static code review identified 21 original SonarQube findings across the SE-Jackfruit project.

The identified security and reliability issues were addressed through changes to the CI dependency installation process, Express application configuration, and asynchronous Promise handling in the frontend components.

The modified project passed 168 local tests, the frontend production build completed successfully, and the pull request checks and SonarCloud Quality Gate passed.

The changes and report have been submitted through PR #218. Formal review, merge, and final verification of the original findings on the main branch remain pending.

**Report Status:** Submitted for review  
**Pull Request:** #218  
**Branch:** `fix/static-analysis-findings`


## 10. Local consistency review addendum

Date: 14 November 2026. Scope: local working tree, booking capacity, dated donation intake, earlier dashboard/access fixes, and supporting traceability. This supplements the 11 November PR #218 static-analysis report; it does not replace its historical findings or test counts.

### Findings and targeted changes

| Finding | Before | Local correction | Traceability |
|---|---|---|---|
| Booking capacity race | Two donors booked capacity 1; stored count remained 1 with 2 appointments. | Conditional atomic capacity reservation inside the appointment transaction; a failed reservation rolls back. Cancelled-record reactivation is also claimed conditionally. | FR-014; LC-001/LC-004 |
| Donation appointment mismatch | A date with no matching appointment was accepted and could complete an unrelated scheduled booking. | Require matching scheduled slot date; claim the appointment once before donation/inventory writes. | FR-012, FR-019–FR-021; LC-002/LC-003 |
| Stale session and dashboard identity | Active sessions retained old role/name/activation status; dependent panels became stale. | Database-backed identity refresh, dashboard revalidation, panel callbacks, and explicit retry states. | FR-002–FR-010, FR-038–FR-040; LA cases |
| Documentation drift | Wrong RE-to-SRS references, missing TC references, planned API paths differing from implementation. | Authoritative frozen-FR mapping, API deviation table, corrected setup notes, and current regression evidence. | LC-005 |

No schema, SRS or SAD changes. No broad architecture refactoring or dependency upgrades. Existing sample accounts and inventory are preserved.

### Validation evidence

Before editing the transaction code, both defects were reproduced against disposable local PostgreSQL fixtures. The same barrier-controlled booking test after the fix allowed one booking with actual count and stored count equal to capacity 1. Mismatched intake returned 400. Two concurrent dated intake attempts produced one donation record and completed the matching appointment. Disposable users, appointments, slots and donation records were removed in finally; no stock was added by this test.

The opt-in reusable check is backend/scripts/check-local-consistency.mjs. Automated Jest/Vitest tests use isolated mocks/adapters; they are separate evidence from the real PostgreSQL check. The system fixture now explicitly reaches the appointment day before recording intake, instead of accepting a donation on a date unrelated to its future slot.

Final local validation: 197 backend tests across 23 suites and 22 frontend tests passed (219 total); Vite production build passed. Jest, the configured frontend launcher and Vite were invoked directly through Node because the managed npm shell wrapper previously failed to launch. The opt-in PostgreSQL regression passed separately. Frozen SRS/SAD paths have no Git diff. The original PR #218 report remains unchanged. Its SonarCloud results and the user's initial main-branch analysis are historical observations, not analysis of these local fixes.

### Open findings and limits

- Slot-creation overlap checks are sequential application checks. Distinct overlapping windows created concurrently are not protected by a database exclusion constraint.
- Donation rows have no donor/date unique constraint. Conditional claiming protects the same appointment; concurrent intake against different same-day appointments remains a separate review item.
- Some planned SAD APIs have different implemented paths; general staff appointment-list/status management and an inventory-movement-history API are not implemented equivalents. These are recorded design gaps, not passed features.
- There is no browser appearance, focus or full scheduling certification because the browser inspection runtime could not launch.
- No current dependency audit, coverage percentage or SonarCloud gate is claimed for the local working tree. Prior passing CI/quality gates do not validate unpublished changes.

### Change control

This addendum was prepared and validated locally. The user subsequently authorized adding the fixes and reports to existing PR #224 while retaining its commits. No merge or SonarCloud suppression was requested. Earlier local results must be distinguished from the final published commit checks; frozen baselines remain unchanged.


### Publication security follow-up

The first published revision passed GitHub backend/frontend CI but SonarCloud flagged a literal placeholder in the disposable database fixture passwordHash field (javascript:S2068). The fixture now generates a random value and hashes it with bcrypt; no known test credential is stored. This was corrected without suppressing the finding or changing quality-gate settings. The final revision must receive its own analysis result.
