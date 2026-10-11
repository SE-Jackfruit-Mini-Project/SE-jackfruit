# VAL-002: Initial Requirements Validation — Donation and Appointment Management

**Project:** Blood Donation Management System (SE-jackfruit)  
**Phase:** Sprint 0 — Planning & Requirements Engineering  
**Owner:** Pavithra Reddy (PES1UG24CS489)  
**Requirements covered:** FR-014 to FR-022 and related BR-002 to BR-005

## Objective

Validate the proposed Donation and Appointment Management requirements before they are finalized in the Software Requirements Specification (SRS).

## Scope

Validate appointment booking, viewing, rescheduling, and cancellation; staff appointment management; recording completed donations; linking donations to donors; recording donation details; and updating inventory when a donation is accepted into inventory.

## Validation checklist

- [ ] Confirm only an eligible, registered donor can book an appointment, according to the agreed rules.
- [ ] Confirm appointment viewing is restricted to the appropriate user roles and records.
- [ ] Confirm rescheduling and cancellation conditions are defined.
- [ ] Confirm staff appointment-management permissions are clear.
- [ ] Confirm only authorized staff can record a completed donation.
- [ ] Confirm each completed donation is associated with the correct donor.
- [ ] Confirm required donation information is defined.
- [ ] Confirm the condition for accepting a donation into inventory is explicit.
- [ ] Confirm inventory updates occur only when the stated acceptance condition is met.
- [ ] Confirm FR-022 and FR-023 distinguish accepted donations from other stock additions and prevent duplicate inventory counting.
- [ ] Check requirements for clarity, completeness, consistency, feasibility, and testability.
- [ ] Record unresolved scheduling rules and assumptions rather than inventing them.

## Baseline alignment note

FR-014 to FR-022 and the related donation/appointment business rules are based on `appointment-donation-requirements.md` and the project baseline. Appointment slot rules, appointment status values, donation fields, and donation acceptance criteria remain TBD in the source requirements.

FR-022 covers inventory increases resulting from accepted donations. The merged inventory requirements clarify that FR-023 covers stock additions other than accepted donations. This distinction prevents the same donation from being counted twice. FR-022 has been cross-checked against FR-023 to FR-029.

This checklist is a validation plan, not a completed validation report.

## Validation procedure

1. Review FR-014 through FR-022 against the agreed project scope.
2. Walk through the appointment lifecycle and completed-donation workflow.
3. Check permissions, preconditions, state changes, and failure cases.
4. Record gaps or conflicting rules in the findings table.
5. Discuss findings with the team and update the shared requirements baseline.
6. Mark validation complete only when critical findings are resolved or explicitly recorded as open issues.

## Findings log

| Requirement ID | Finding / question | Severity | Resolution / decision | Status |
|---|---|---|---|---|
| FR-014, BR-003 | Exact eligibility criteria and how eligibility is determined remain TBD. | To be assessed | Team decision required | Open |
| FR-016–FR-017 | Rescheduling and cancellation conditions remain TBD. | To be assessed | Team decision required | Open |
| FR-019–FR-021 | Required donation fields and donation acceptance criteria need clarification. | To be assessed | Team decision required | Open |
| FR-012, FR-020 | Both requirements address completed-donation records associated with donors; their relationship should be reviewed. | To be assessed | Team review | Open |
| FR-022–FR-023 | Accepted donations and other stock additions must not be counted twice. | To be assessed | Merged inventory requirements distinguish the two cases. | Checked |

## Acceptance criteria

- All assigned requirements have been checked against the validation checklist.
- Appointment and donation workflows have clear preconditions and outcomes.
- Authorization and inventory-update conditions are explicit.
- Unresolved scheduling or donation rules are documented.
- Requirements are suitable for inclusion in the SRS and later test-case design.

## Dependencies and open questions

- Define appointment slot availability and conflict handling.
- Confirm permitted rescheduling and cancellation conditions.
- Confirm the required donation record fields.
- Confirm who records acceptance of a donation into inventory and under what conditions.
- Review the relationship between FR-012 and FR-020 to confirm consistent handling of completed-donation records.

## Completion record

**Validated by:** Pavithra Reddy  
**Date:** TBD  
**Outcome:** Pending  
**Related PR:** TBD