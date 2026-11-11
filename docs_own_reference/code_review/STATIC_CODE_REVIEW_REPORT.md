# SE-Jackfruit — Static Code Review Report

**Project:** SE-Jackfruit Mini-Project  
**Repository:** `SE-Jackfruit-Mini-Project/SE-jackfruit`  
**Review date:** 11 November 2026  
**Review branch:** `fix/static-analysis-findings`  
**Target branch:** `main`  
**Pull request status:** Created and submitted for review; merge and post-merge verification are pending.

---

## 1. Purpose

This report records the static code review carried out on the SE-Jackfruit codebase using SonarQube. It summarises the initial findings, the source files affected, the corrections prepared, the local tests performed, and the items that still require verification.

The focus of this review was to address the security and reliability issues identified in the SonarQube results. The intention was not to change application behaviour unnecessarily or to clear warnings without understanding them. Each finding was considered in the context of the affected code and the project workflow.

## 2. Scope and review approach

The review covered:

- The GitHub Actions workflow: `.github/workflows/ci.yml`.
- The Express application setup: `backend/src/app.js`.
- The frontend components listed in the Reliability findings below.

The review followed this sequence:

1. Inspect the SonarQube issue and its rule description.
2. Locate the highlighted code in the repository.
3. Review the surrounding code and the relevant asynchronous operation or workflow step.
4. Apply a targeted correction where appropriate.
5. Run the available local installation, test, and build commands.
6. Submit the changes through a pull request for repository-owner review.

This reflects the distinction covered in the Software Engineering Unit 3 slides: static analysis examines source code without executing it, while software testing executes the system and observes its behaviour. Human inspection is used to interpret tool findings and assess their relevance. See Unit 3 slides 140, 198–200, and 324–327.

## 3. Initial SonarQube results

The screenshots reviewed showed **21 findings** in total:

| Category | Rule | Occurrences | SonarQube severity |
|---|---|---:|---|
| Security | `githubactions:S8543` — Dependencies without locked resolved versions | 2 | Medium |
| Security | `githubactions:S6505` — Lifecycle scripts allowed during package installation | 2 | Medium |
| Security | `javascript:S5689` — Express framework version information disclosure | 1 | Low |
| Reliability | `javascript:S9338` — Promise must be awaited, handled, or explicitly marked as intentionally ignored | 16 | Medium |
| **Total** |  | **21** |  |

The two GitHub Actions rules each appeared in both the backend and frontend installation steps. The Reliability screenshots contained repeat views of some findings; the count above is the 16 unique issue occurrences reviewed, not the number of screenshots.

The line numbers below are the locations shown in the original SonarQube screenshots. They are baseline locations and may shift as surrounding code changes.

## 4. Security findings and corrections

### 4.1 Dependency versions should be locked

**Rule:** `githubactions:S8543`  
**Severity:** Medium  
**File:** `.github/workflows/ci.yml`  
**Baseline locations:** Backend install step, line 26; frontend install step, line 41.  
**Occurrences:** 2

**Finding:** Both CI jobs used `npm install`. For repeatable CI installs, the project should install from its committed lockfile rather than resolving dependencies as part of each run.

**Correction prepared:** Replaced the install commands with `npm ci --ignore-scripts` in both jobs. The backend and frontend `package-lock.json` files were confirmed to be tracked by Git.

### 4.2 Dependency lifecycle scripts should not run automatically during installation

**Rule:** `githubactions:S6505`  
**Severity:** Medium  
**File:** `.github/workflows/ci.yml`  
**Baseline locations:** Backend install step, line 26; frontend install step, line 41.  
**Occurrences:** 2

**Finding:** Dependency lifecycle scripts were allowed to execute during package installation in CI. Such scripts can run commands as part of installation, so their execution should be controlled.

**Correction prepared:** Both jobs now use `npm ci --ignore-scripts`.

The backend requires Prisma setup, so the workflow explicitly performs the required steps after installation:

```yaml
- run: npm ci --ignore-scripts
- run: npm rebuild @prisma/engines
- run: npm run db:generate
```

The existing backend unit, component, and integration test commands remain in the workflow. The frontend continues with its existing test and production-build commands after installation.

**Validation note:** This installation sequence was exercised locally on Windows: the Prisma engine rebuild and Prisma Client generation completed successfully. The GitHub Actions runner uses Ubuntu, so the actual CI run is still required before this workflow change can be considered fully verified.

### 4.3 Express framework information disclosure

**Rule:** `javascript:S5689`  
**Severity:** Low  
**File:** `backend/src/app.js`  
**Baseline location:** Line 29.  
**Occurrences:** 1

**Finding:** Express enables the `X-Powered-By` response header by default. The header identifies the framework used by the application.

**Correction prepared:** Added the following immediately after the Express application is created:

```javascript
export const app = express();
app.disable('x-powered-by');
```

This disables the framework-identifying response header.

## 5. Reliability findings and corrections

**Rule:** `javascript:S9338`  
**SonarQube severity:** Medium  
**Finding:** Promise-returning functions were called without an explicit `await`, rejection handler, or intentional `void` marker. The findings were concentrated in component data loading and refresh operations.

The review identified 16 occurrences across 11 frontend components:

| Repository file | Baseline line(s) | Function | Context / correction prepared |
|---|---:|---|---|
| `frontend/src/admin/ManageUsers.jsx` | 37 | `fetchUsers()` | Initial component data load — marked with `void` |
| `frontend/src/appointments/BookAppointment.jsx` | 29, 97 | `loadData()` | Initial load — `void`; refresh after booking — `await` |
| `frontend/src/appointments/ManageAppointments.jsx` | 43 | `loadData()` | Initial component data load — marked with `void` |
| `frontend/src/donations/RecordDonation.jsx` | 58 | `refreshData()` | Initial data load — marked with `void` |
| `frontend/src/donors/DonorInformation.jsx` | 76 | `loadDonors()` | Initial donor data load — marked with `void` |
| `frontend/src/inventory/AllocateRequests.jsx` | 60, 95 | `fetchRequests()` | Initial load — `void`; refresh in the allocation handler — `await` |
| `frontend/src/inventory/BloodAvailability.jsx` | 67 | `fetchAvailability()` | Initial component data load — marked with `void` |
| `frontend/src/inventory/ManageInventory.jsx` | 69, 127 | `fetchInventory()` | Initial load — `void`; refresh after update — `await` |
| `frontend/src/requests/BloodRequests.jsx` | 40, 113 | `fetchRequests()` | Initial load — `void`; refresh after submission — `await` |
| `frontend/src/requests/ReviewRequests.jsx` | 24 | `fetchRequests()` | Initial component data load — marked with `void` |
| `frontend/src/slots/ManageSlots.jsx` | 33, 109 | `fetchSlots()` | Initial load — `void`; refresh after slot creation — `await` |
| **Total** |  |  | **16 occurrences** |

### 5.1 Correction approach

- **11 initial-loading calls:** Added `void` to make the intentional fire-and-forget call explicit at the component-load call site.
- **5 operation-triggered refresh calls:** Added `await` inside the corresponding asynchronous event handlers so the refresh Promise is explicitly awaited.

The called data-fetching functions contain their own request/error-handling logic. The `void` operator does not catch errors by itself; it only marks the Promise as intentionally not awaited. The internal error handling remains important.

Existing calls that already used `await`, event-handler references, and the parent callback used to trigger related inventory refreshes were left intact.

## 6. Local validation performed

The following local checks were completed on the remediation branch:

| Area | Validation | Result |
|---|---|---|
| Backend installation | `npm ci --ignore-scripts` | Successful |
| Prisma engine setup | `npm rebuild @prisma/engines` | Successful |
| Prisma Client | `npm run db:generate` | Successful; Prisma Client v6.19.3 generated |
| Backend unit tests | `npm test` | 123 tests passed across 16 suites |
| Backend component tests | `npm run test:component` | 16 tests passed across 4 suites |
| Backend integration tests | `npm run test:integration` | 28 tests passed across 2 suites |
| Frontend installation | `npm ci --ignore-scripts` | Successful |
| Frontend tests | `npm test` | 1 test passed |
| Frontend production build | `npm run build` | Successful |
| Patch formatting | `git diff --check` | No whitespace errors reported |

**Recorded local test total:** 168 tests passed (167 backend + 1 frontend). The final targeted Promise-handling edit was also followed by a successful local verification, as reported during the review.

These are local results. They do not replace the GitHub Actions result for the pull request.

## 7. Separate dependency-audit observations

During the clean dependency installations, `npm audit` reported additional dependency vulnerabilities. These are separate from the 21 original SonarQube findings and were not resolved by the changes in this review PR.

| Package area | Audit result |
|---|---:|
| Backend | 10 vulnerabilities: 6 low, 4 high |
| Frontend | 6 vulnerabilities: 3 moderate, 1 high, 2 critical |
| **Total** | **16 vulnerabilities** |

The audit's suggested automatic fixes involved potentially breaking dependency changes (including major-version changes to Jest, Prisma, Zod, and Vitest). `npm audit fix --dry-run` was used to inspect the proposed changes; no forced dependency upgrade was applied as part of this PR.

These dependency findings should be triaged separately. They should not be represented as resolved by the current SonarQube remediation.

## 8. Pending verification and follow-up

The following items remain open at the time of writing:

1. **GitHub Actions:** Confirm the PR workflow passes on the Ubuntu runner, including Prisma setup, backend tests, frontend tests, and frontend build.
2. **SonarQube PR analysis:** Re-run or inspect the PR analysis and confirm whether the 5 Security and 16 Reliability findings are resolved or no longer reported.
3. **Post-merge analysis:** After repository-owner approval and merge, inspect the `main` branch analysis to confirm the final status. A local code change or passing local test is not, by itself, proof that a SonarQube issue has been closed.
4. **Dependency audit:** Triage the 16 npm audit vulnerabilities in a separate dependency-maintenance task or PR.
5. **Testing and coverage deliverables:** Keep the project's required unit/system test reports and code/branch coverage reports in `docs`. This static review report does not replace those reports.

## 9. Conclusion

The review identified 21 SonarQube findings: 5 Security and 16 Reliability. Targeted corrections have been prepared in `.github/workflows/ci.yml`, `backend/src/app.js`, and the 11 frontend components listed in this report. Local installation, test, Prisma-generation, and build checks were successful.

The changes have been submitted in a pull request from `fix/static-analysis-findings` to `main` for repository-owner review. The findings should be marked as resolved only after the PR checks and subsequent SonarQube analysis confirm the result. The additional npm audit vulnerabilities remain a separate follow-up.

## 10. Project references

This report was prepared with reference to:

- **JACKFRUIT - SE Mini-Project Software Engineering Project Guidelines (2026):** requires CI/CD, code reviews, security validation, static code analysis using SonarQube or a similar tool, PRs, and test/coverage evidence.
- **Project Evaluation Checklist:** includes PR review, testing and quality assurance, generated reports in `docs`, and final demo requirements.
- **Final Demo and Viva Preparation FAQs:** identifies the final testing reports expected in the repository, including Unit, System Validation, Code Coverage, and Branch Coverage reports.
- **Software Engineering Unit 3 lecture slides:** Static Analysis (slide 140), good static-analysis tool characteristics (slides 198–200), and Inspections and Testing (slides 324–327).

---

**Report status:** Prepared; pending GitHub Actions, SonarQube re-analysis, and post-merge confirmation.
