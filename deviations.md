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
| Slot overlap and duplicate prevention | The SRS defines slot creation rules without explicit validation against pending staff proposals or client-side form guards. | When creating appointment slots, neither staff nor administrators can create coincident or overlapping slots for the same date and time window. The frontend slot creation form validates input against existing slots before submission, and backend services reject attempts to create or propose slots that coincide with existing slots or currently pending slot creation proposals (409 conflict). Approving a proposal automatically rejects conflicting pending proposals. | Guarantees schedule integrity, prevents scheduling conflicts, and ensures duplicate or coincident slots cannot be created or proposed concurrently. |

## Donation intake lifecycle and gender-based waiting period

| Area | SRS baseline | Implemented behavior | Reason |
|---|---|---|---|
| Single draw per appointment slot | The SRS leaves exact appointment lifecycle and donation intake rules as TBD (FR-019, FR-020). | Healthcare staff cannot draw blood from the same person for the same appointment slot or date more than once. Recording an accepted or unaccepted donation transitions the donor's scheduled appointment to `COMPLETED`. | Prevents duplicate blood draws and ensures an appointment slot cannot be reused or recorded multiple times. |
| Gender-based interval enforcement | The SRS mentions donor eligibility without defining clinical interval verification on donation intake. | Next appointment booking and staff donation recording both strictly enforce a gender-based waiting period following an accepted donation: 3 calendar months for male donors and 4 calendar months for female donors. Intake queries (`getRegisteredDonors`) filter out donors whose cooldown period has not elapsed or whose appointment is completed. | Protects donor health and prevents unsafe blood collection within the clinical recovery interval. |

## Scope and traceability

These are implementation additions to the requirements around appointment slot management (US-009), appointment booking and scheduling rules (US-004), appointment lifecycle management (US-013), completed donation recording and interval verification (US-011), stock additions (US-005), inventory status adjustments (US-014), and role permissions (US-002 and US-017). They do not replace or renumber SRS requirements.

The approval workflow is represented in the Prisma schema and exposed through the staff/admin dashboard. Related checks are documented in the VAL-002, VAL-003, and VAL-004 validation notes, test-plan cases TC-041 through TC-051, and the associated unit and integration suites.

Because the schema adds the `operation_approvals` table and related enums, developers must regenerate Prisma Client and synchronize their local database schema before running this branch. Use the setup commands in the README; do not reset a database containing data you need to keep.

## Request stock and dashboard consistency review

The November 2026 consistency fixes preserve the frozen SRS and SAD and the existing approval policy. Blood request approval remains separate from allocation. Operational stock proposals remain pending until an administrator applies them; administrators may add stock directly.

| Area | Clarification or correction | Reason |
|---|---|---|
| Request tracking | Failed requester and review-list loads display an error with a refresh action. Allocated requests have a fulfilled badge and an explicit staff filter. | A failed load must not imply that no requests exist, and successful allocation must not look like rejection. |
| Submission handling | Request and stock forms ignore duplicate submissions while a call is in flight. Stock success handling uses the returned inventory or proposal shape rather than a potentially stale displayed role. | Prevents rapid duplicate writes and avoids reporting a successful proposal as a network failure. This is a local UI guard, not server-wide idempotency. |
| Operational review | Overlapping approval/rejection calls from one mounted panel are blocked. Both decisions notify dependent dashboard panels. | Keeps the review queue and dependent inventory/slot views consistent. Existing transactional server checks remain authoritative. |
| Dashboard updates | Allocation refreshes inventory and the request-review panel. Recording a donation refreshes inventory. No dashboard is shown after session loading fails. | Avoids stale quantities, stale approved request rows, and a donor dashboard flash during login redirection. |
| Validation tooling | The frontend test launcher imports its existing configuration through Node and Vite builds load configuration natively. | Managed Windows execution can deny esbuild access to ancestor directories during config bundling. The test suites, JSX transformation, and application build remain enabled. CI already uses Node 22. |

Regression coverage and manual acceptance steps are in `testplan_document/test_plan-v5.md`. Existing Word test plans remain historical baselines. These corrections add no database schema changes beyond those already present on GitHub main.
