# Blood donation consistency regression test plan

Version 5 addendum, 13 November 2026. This supplements the existing Word test plans and the operational approval cases referenced in deviations.md. SRS and SAD remain frozen. Review baseline: GitHub main `cf87b67259bc9a9bd889e7708e8ff834291033c7`.

## Scope and setup

Cover hospital request tracking, staff stock proposals, administrator decisions, and dashboard refreshes. Preserve the existing request approval and allocation lifecycle. Use isolated test data and separate hospital requester, staff, and administrator accounts for manual acceptance.

Run from the repository root on Node 22 after installing backend and frontend dependencies. Generate Prisma Client with `npm --prefix backend run db:generate`. Automated backend suites use mocked persistence; they do not migrate or reset a database. Manual acceptance requires a configured database synchronized with the schema using the README setup.

```powershell
npm test
npm --prefix frontend run build
```

The frontend runner imports the existing Vitest configuration with Node; the build uses Vite's native config loader. These avoid config bundling attempts to read inaccessible Windows ancestor directories. Test discovery includes the existing eligibility test and `frontend/tests/regression/workflow-regressions.test.js`.

## Regression cases

| Case | Action | Expected result | Coverage |
|---|---|---|---|
| RG-001 | Fail requester history loading, then refresh after recovery. | An error appears rather than an empty-list claim; refresh can recover the list. | Frontend handler regression; recovery is manual. |
| RG-002 | Fail staff review-list loading. | An error appears; stale rows are hidden while the load has failed. | Frontend regression. |
| RG-003 | View an allocated hospital request and select the allocated staff filter. | Allocated is styled as fulfilled and the filter queries ALLOCATED. | Frontend regression. |
| RG-004 | Submit a request twice rapidly. | One POST occurs during the in-flight operation. On validation failure, the form remains available. | Frontend regression. |
| RG-005 | Submit staff stock with an admin role still displayed in the client. | A proposal response displays success, signals the proposal queue, and does not claim that inventory changed. | Frontend regression. |
| RG-006 | Submit admin stock with a staff role still displayed in the client. | An inventory response displays the new quantity and refreshes inventory. | Frontend regression. |
| RG-007 | Submit stock twice rapidly; fail the first submission and retry. | One initial POST occurs, followed by an allowed retry after failure. | Frontend regression. |
| RG-008 | Rapidly approve or reject an operational proposal. | Only one decision is sent while busy; both successful decisions notify dependent views. | Frontend regression. |
| RG-009 | Fail an operational approval. | An error is shown; no success callback fires. The administrator can refresh and retry. | Frontend regression; retry is manual. |
| RG-010 | Allocate an approved blood request. | Inventory and request-review refresh counters both advance. | Frontend regression and existing backend lifecycle integration test. |
| RG-011 | Record a donation, then approve an operational change. | Donation refreshes inventory; an operational decision refreshes inventory and slots. | Dashboard callback regression; accepted/unaccepted quantities remain covered by backend tests. |
| RG-012 | Fail session validation. | HTTP 401/403 redirects to login without a donor dashboard; HTTP 500/network failure displays a retry message without pretending the user logged out. | Frontend regression. |
| RG-013 | Submit an operational proposal or decision without a body. | The API returns a validation error with no inventory or proposal writes. | Backend integration regression. |
| RG-014 | Approve a negative stock adjustment with no stock available, then reject it. | Approval returns 409, the transaction retains PENDING, inventory/movements are unchanged, and rejection succeeds. | Backend integration regression. |

## Manual acceptance

1. As a hospital requester, submit a valid request, refresh, and confirm PENDING. As staff, approve it and confirm it enters the allocation queue. Allocate it, then confirm ALLOCATED in the review panel and the updated inventory without reloading the dashboard. Refresh the hospital view to see the final status.
2. As staff, suggest stock addition. Confirm a pending proposal appears and available units remain unchanged. As admin, approve it; confirm the queue removes it and inventory changes once. Repeat with rejection and confirm inventory does not change.
3. Record an accepted donation for an eligible scheduled donor. Confirm stock panels update. Record an unaccepted donation using different eligible test data and confirm stock does not increase.
4. During a slow stock submission or operational decision, click repeatedly and inspect the network panel for one request. After a failure, confirm retry is available. Check keyboard operation, focus, and narrow-screen layout.
5. Confirm donors and hospital requesters cannot submit or review operational proposals through direct API calls. Existing integration tests cover role restrictions and staff-only proposal visibility.

## Release gate and limits

Both requested commands must pass for the exact source being published. Recheck current GitHub main before publishing, preserve newer upstream changes, and verify the published commit's CI, SonarCloud gate, and PR mergeability. An older PR's green quality gate does not validate these changes.

Frontend regressions exercise element props and asynchronous handlers with deterministic hook fixtures. They do not run a browser or reproduce React scheduling, layout, focus, or cross-session live updates. Backend integration tests use in-memory persistence and are not PostgreSQL concurrency tests. UI in-flight guards do not prevent duplicate submissions across tabs or devices.

## Local audit regression addendum — 14 November 2026

| Case | Expected behavior | Validation |
|---|---|---|
| LA-001 | Existing logged-in account receives its updated role/name on next request. | Middleware unit tests and real local PostgreSQL session/API smoke checks. |
| LA-002 | Deactivated/deleted accounts cannot continue using stored sessions. Database errors do not authorize stale identity. | Middleware unit tests; local database deactivation/reactivation check. |
| LA-003 | Dashboard polls identity every 15 seconds and changes portal after role updates; service errors show retry. | Frontend regression. |
| LA-004 | User-management changes notify directory and donation intake; overlapping changes are blocked. Failed directory loads are visible. | Frontend regression. |
| LA-005 | Booking and appointment-management panels notify one another; booking load errors are visible. | Frontend regression. |
| LA-006 | Signed-in eligibility page links back to dashboard. | Frontend regression. |
| LA-007 | Rebooking a cancelled slot uses the existing row and preserves correct capacity after another cancellation. | Booking unit regression and local PostgreSQL smoke check. |

Local smoke checks use only fictional @jackfruit.test accounts; temporary name/role/status changes are restored. These results were recorded before publication. Browser tooling could not launch, so layout, mobile appearance, focus behavior, and complete click-through browser behavior remain manual checks, not passed tests. In-memory integration fixtures now explicitly create authenticated principals before exercising the production session refresh middleware.

## Verified transaction regressions — 14 November 2026

| Case | Frozen SRS mapping | Expected result | Evidence |
|---|---|---|---|
| LC-001 | FR-014; NFR data consistency | Two simultaneous donors cannot take one remaining place; stored count equals actual bookings. | Local PostgreSQL barrier test; conditional reservation unit test. |
| LC-002 | FR-012, FR-019–FR-021 | Donation date without a scheduled appointment is rejected with no writes. | Unit regression; local PostgreSQL rejection check. |
| LC-003 | FR-019–FR-021 | Only the dated appointment completes; two concurrent intake attempts produce one donation record. | Unit regressions and local PostgreSQL conditional-claim check. |
| LC-004 | FR-014, FR-017 | Concurrent claims cannot reactivate the same cancelled record twice; failed transaction rolls back capacity. | Unit claim regression; production transaction. |
| LC-005 | Documentation | Current FR mappings and API deviations are explicit; PR #218 report remains historical. | Traceability table in deviations.md and separate local review supplement. |

The reusable real-database test is backend/scripts/check-local-consistency.mjs. Run it explicitly with node from backend after configuring a local PostgreSQL database. It uses disposable fictional fixtures and unaccepted donations, removes its fixtures in finally, and performs no GitHub operations. Before the fix, two bookings succeeded for capacity 1 while the stored count was 1, and mismatched donation intake was accepted. After the fix, one booking succeeds, the other is rejected, mismatched intake returns 400, and concurrent dated intake creates one record.

These tests do not certify all possible concurrent interleavings, browser layout, or clinical fitness. Concurrent overlapping slot creation, separate same-day appointment intake, and the planned general staff appointment-management interface remain explicitly open in deviations.md. These local results precede publication; GitHub CI and SonarCloud must be checked separately on the final PR commit.

Final local result for this correction: 197 backend + 22 frontend automated tests passed (219 total), frontend production build passed, and the opt-in PostgreSQL regression passed. Tools were invoked directly through Node; this is not a claim that the managed npm wrapper or unpublished GitHub CI/SonarCloud ran successfully.


## Test suite organization

Unit tests follow the team standard of one suite per user story: 16 backend story files and frontend US-008, for 17 story suites. Existing session-refresh cases are included in US-002. Existing frontend workflow regressions are classified separately in frontend/tests/regression/workflow-regressions.test.js and still run through npm test. No test cases were added or removed for this reorganization.

This file remains the v5 Markdown addendum. A complete Word version following test_plan-v2.docx is still pending.
