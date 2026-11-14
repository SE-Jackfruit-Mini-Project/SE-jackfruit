# SRS Deviations and Implementation Additions

This file records implementation decisions that extend or clarify the frozen SRS. The SRS and SAD remain unchanged; this record explains where the delivered workflow goes beyond their baseline and why.

## Operational change approval

| Area | SRS baseline | Implemented behavior | Reason |
|---|---|---|---|
| Appointment slots | The SRS describes staff slot management but does not define an administrator approval step for creating or deleting slots. | Staff submit slot creation and deletion proposals. A proposal remains pending until an administrator approves or rejects it. Administrators may create or delete eligible slots directly. | Adds a review step before staff changes affect donor-facing availability and clarifies the division of responsibility between staff and administrators. |
| Blood inventory | The SRS describes staff stock additions and inventory corrections but does not specify administrator approval. | Staff submit proposals for adding blood units and for positive or negative inventory adjustments. Pending or rejected proposals do not change availability. Approval applies the requested change and records an inventory movement. Administrators may make these changes directly. | Provides administrative oversight for stock changes while retaining staff ability to identify and request operational updates. |
| Approval records | The SRS does not define a persistent workflow for operational proposals. | The implementation adds an `OperationApproval` record with action, payload, status, requester, reviewer, decision note, and timestamps. Applying an approved change and recording its decision occur in the same database transaction. Repeated decisions cannot apply the operation twice. | Provides an auditable decision history and protects data consistency if an operation fails or is submitted for review more than once. |
| Slot deletion | The SRS does not define deletion behavior or how appointment history should be handled. | A slot can be deleted only if it has no appointment records. Slots with appointment history are retained. | Prevents removal of records needed to preserve booking and donation history. |
| Proposal deduplication | The SRS does not specify duplicate proposal handling. | Submitting duplicate deletion proposals for an appointment slot while one is already pending returns the existing pending proposal rather than generating redundant records. Administrators only see a single pending deletion proposal per slot, and reviewing a proposal auto-resolves any related duplicate pending entries. | Prevents redundant approval cards in the administrator dashboard and ensures an appointment slot deletion cannot be approved or processed multiple times. |
| Slot overlap and duplicate prevention | The SRS defines slot creation rules without explicit validation against pending staff proposals or client-side form guards. | Sequential creation requests are checked against existing slots; staff proposals also check pending creation proposals. Direct admin creation does not check pending proposals. Approving a proposal rejects conflicting pending proposals. Exact date/start/end combinations are unique in the database. | Rejects ordinary duplicate/overlap attempts. Concurrent creation of distinct overlapping windows is not protected by a database exclusion constraint and remains an open limitation. |

## Donation intake lifecycle and gender-based waiting period

| Area | SRS baseline | Implemented behavior | Reason |
|---|---|---|---|
| Single draw per appointment slot | The SRS leaves exact appointment lifecycle and donation intake rules as TBD (FR-019, FR-020). | Donation intake requires a scheduled appointment on the recorded date. A conditional status claim completes that appointment once for accepted or unaccepted donations. Existing same-donor/date donation records are rejected. | Prevents concurrent recording of the same appointment and completion of an unrelated appointment. There is no database donor/date unique constraint across separate appointments. |
| Gender-based interval enforcement | The SRS mentions donor eligibility without defining clinical interval verification on donation intake. | Next appointment booking and staff donation recording both strictly enforce a gender-based waiting period following an accepted donation: 3 calendar months for male donors and 4 calendar months for female donors. Intake queries (`getRegisteredDonors`) filter out donors whose cooldown period has not elapsed or whose appointment is completed. | Enforces the configured project interval consistently; it does not establish medical fitness or clinical safety. |

## Scope and traceability

These are implementation additions to the requirements around appointment slot management (US-009), appointment booking and scheduling rules (US-004), appointment lifecycle management (US-013), completed donation recording and interval verification (US-011), stock additions (US-005), inventory status adjustments (US-014), and role permissions (US-002 and US-017). They do not replace or renumber SRS requirements.

The approval workflow is represented in the Prisma schema and exposed through the staff/admin dashboard. Related checks are documented in the VAL-002, VAL-003, and VAL-004 validation notes, the RG, LA and LC regression cases in testplan_document/test_plan-v5.md, and the associated unit and integration suites.

Because the schema adds the `operation_approvals` table and related enums, developers must regenerate Prisma Client and synchronize their local database schema before running this branch. Use the setup commands in the README; do not reset a database containing data you need to keep.

## Request stock and dashboard consistency review

The November 2026 consistency fixes preserve the frozen SRS and SAD and the existing approval policy. Blood request approval remains separate from allocation. Operational stock proposals remain pending until an administrator applies them; administrators may add stock directly.

| Area | Clarification or correction | Reason |
|---|---|---|
| Request tracking | Failed requester and review-list loads display an error with a refresh action. Allocated requests have a fulfilled badge and an explicit staff filter. | A failed load must not imply that no requests exist, and successful allocation must not look like rejection. |
| Submission handling | Request and stock forms ignore duplicate submissions while a call is in flight. Stock success handling uses the returned inventory or proposal shape rather than a potentially stale displayed role. | Prevents rapid duplicate writes and avoids reporting a successful proposal as a network failure. This is a local UI guard, not server-wide idempotency. |
| Operational review | Overlapping approval/rejection calls from one mounted panel are blocked. Both decisions notify dependent dashboard panels. | Keeps the review queue and dependent inventory/slot views consistent. Existing transactional server checks remain authoritative. |
| Dashboard updates | Allocation refreshes inventory and the request-review panel. Recording a donation refreshes inventory. Authentication failures redirect to login; service failures show a retry message. | Avoids stale quantities, stale approved request rows, and a donor dashboard flash during login redirection. |
| Validation tooling | The frontend test launcher imports its existing configuration through Node and Vite builds load configuration natively. | Managed Windows execution can deny esbuild access to ancestor directories during config bundling. The test suites, JSX transformation, and application build remain enabled. CI already uses Node 22. |

Regression coverage and manual acceptance steps are in `testplan_document/test_plan-v5.md`. Existing Word test plans remain historical baselines. The local audit corrections require no additional database schema changes.

## Local consistency audit — 14 November 2026

- Refresh database-backed user identity before protected API routing. Role/profile changes apply to existing sessions on the next request, and deleted/deactivated accounts lose access. Database failures follow the error path rather than authorizing stale identity.
- Revalidate dashboard identity every 15 seconds and on window focus. Refresh data panels when returning to the dashboard window; this is not real-time push synchronization. Preserve login on temporary service failures and surface a retry message.
- Refresh donor directory/intake after user-management changes, and synchronize booking and appointment-management panels after booking, cancellation, or rescheduling.
- Show failed user/booking loads and guard overlapping role/status updates and booking/donation submissions. Return signed-in eligibility visitors to their dashboard and label the admin portal correctly.
- Reuse a cancelled donor-slot appointment when rebooking to satisfy the existing unique constraint. No schema, SRS, or SAD changes.
- At the local validation stage, changes were unpublished. The subsequent PR #224 update includes source and reports only; fictional sample data and credentials remain local. Browser inspection could not start in this environment; visual layout and real browser scheduling remain unverified.

## Frozen baseline traceability correction

Use srs_document/srs-v2.docx as the frozen FR register. Earlier RE working notes and some source comments use different numbering. Do not renumber the SRS to match those notes. This mapping governs the local audit.

| Behavior | Frozen SRS IDs | Evidence |
|---|---|---|
| Authentication, role navigation and current access | FR-002–FR-006, FR-038–FR-040 | US-002 session-refresh cases; frontend regressions |
| Donor profile and operational directory | FR-008–FR-010 | Profile and user-management local smoke checks |
| Booking, viewing, rescheduling, cancellation | FR-014–FR-017 | US-004/US-013 suites; local PostgreSQL booking race check |
| Staff appointment operations and donation intake | FR-018–FR-021; donor linkage FR-012 | US-011 suite; local dated-intake check |
| Stock addition, quantities, availability and status | FR-022–FR-026 | Inventory suites |
| Allocation and insufficient-stock protection | FR-027–FR-028, FR-037 | Allocation suites |
| Request submission, tracking and review | FR-029–FR-036 | Request suites |

TC-041–TC-051 were previously referenced incorrectly; the supplied Word plans end at TC-040. Current regression identifiers are RG-001–RG-014, LA-001–LA-007 and LC-001–LC-005 in the Markdown addendum.

## Implemented API differences from the frozen SAD

These mappings explain implementation differences; they do not edit the SAD contract.

| Planned SAD route | Implemented route or limitation |
|---|---|
| GET /api/v1/donors and /donors/:donorId | GET /api/v1/donor-information and /donor-information/:donorId for staff/admin |
| GET /api/v1/donors/:donorId/donations | GET /api/v1/donation-history for the signed-in donor |
| Rescheduling/cancellation under /api/v1/appointments/:id | PATCH /api/v1/appointment-management/:id/reschedule and /:id/cancel |
| POST /api/v1/inventory | POST /api/v1/inventory/stock; staff proposals need admin approval |
| POST /api/v1/inventory/adjustments | PATCH /api/v1/inventory/:bloodGroup; staff proposals need admin approval |
| GET /api/v1/inventory/transactions | Movements are persisted; no public history endpoint is implemented |
| GET /api/v1/inventory/availability with group/units parameters | Returns the eight-group catalog; no requested-quantity response contract is implemented |
| GET /api/v1/requests/me | GET /api/v1/requests/my |
| PATCH /api/v1/requests/:id/decision | PATCH /api/v1/requests/:id/review |
| POST /api/v1/requests/:id/allocations | POST /api/v1/allocations/:requestId |
| Staff GET /api/v1/appointments and PATCH /appointments/:id/status | No general staff appointment-list/status endpoint. Completion occurs through dated donation intake. This remains a design gap. |

## Transaction corrections verified locally

LC-001: booking reserves capacity with a conditional atomic increment inside the appointment transaction. A lost reservation or cancelled-record claim rolls back capacity. Unique-key booking conflicts return a controlled validation error.

LC-002/LC-003: donation intake matches the slot date and claims a still-scheduled appointment before recording donation/inventory changes. A lost concurrent claim returns 409 and rolls back. No schema fields or clinical rules are added.

Remaining limitations: concurrent creation of overlapping slots, concurrent intake across separate same-day appointments for one donor, and general staff appointment management need separate review. Browser appearance and scheduling are not certified by automated checks.
