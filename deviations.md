# SRS Deviations and Implementation Additions

This file records implementation decisions that extend or clarify the frozen SRS. The SRS and SAD remain unchanged; this record explains where the delivered workflow goes beyond their baseline and why.

## Operational change approval

| Area | SRS baseline | Implemented behavior | Reason |
|---|---|---|---|
| Appointment slots | The SRS describes staff slot management but does not define an administrator approval step for creating or deleting slots. | Staff submit slot creation and deletion proposals. A proposal remains pending until an administrator approves or rejects it. Administrators may create or delete eligible slots directly. | Adds a review step before staff changes affect donor-facing availability and clarifies the division of responsibility between staff and administrators. |
| Blood inventory | The SRS describes staff stock additions and inventory corrections but does not specify administrator approval. | Staff submit proposals for adding blood units and for positive or negative inventory adjustments. Pending or rejected proposals do not change availability. Approval applies the requested change and records an inventory movement. Administrators may make these changes directly. | Provides administrative oversight for stock changes while retaining staff ability to identify and request operational updates. |
| Approval records | The SRS does not define a persistent workflow for operational proposals. | The implementation adds an `OperationApproval` record with action, payload, status, requester, reviewer, decision note, and timestamps. Applying an approved change and recording its decision occur in the same database transaction. Repeated decisions cannot apply the operation twice. | Provides an auditable decision history and protects data consistency if an operation fails or is submitted for review more than once. |
| Slot deletion | The SRS does not define deletion behavior or how appointment history should be handled. | A slot can be deleted only if it has no appointment records. Slots with appointment history are retained. | Prevents removal of records needed to preserve booking and donation history. |

## Scope and traceability

These are implementation additions to the requirements around appointment slot management (US-009), stock additions (US-005), inventory status adjustments (US-014), and role permissions (US-002 and US-017). They do not replace or renumber SRS requirements.

The approval workflow is represented in the Prisma schema and exposed through the staff/admin dashboard. Related checks are documented in the VAL-002, VAL-003, and VAL-004 validation notes, test-plan cases TC-041 through TC-047, and the associated unit and integration suites.

Because the schema adds the `operation_approvals` table and related enums, developers must regenerate Prisma Client and synchronize their local database schema before running this branch. Use the setup commands in the README; do not reset a database containing data you need to keep.
