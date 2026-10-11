# VAL-003: Initial Requirements Validation — Blood Inventory and Availability

**Project:** Blood Donation Management System (SE-jackfruit)  
**Phase:** Sprint 0 — Planning & Requirements Engineering  
**Owner:** Vedanth Kiran (PES1UG24CS523)  
**Requirements covered:** FR-023 to FR-029, related BR-005 and BR-008 to BR-010, and proposed cross-cutting NFR/security requirements listed in Vedanth’s SRS contribution

## Objective
Validate the proposed Blood Inventory and Availability requirements before they are finalized in the Software Requirements Specification (SRS).

## Scope
Validate staff inventory updates, inventory grouping, viewing inventory, checking availability, maintaining blood-unit status, inventory changes after allocation, and prevention of allocations exceeding available quantities.

## Validation checklist

### Inventory requirements from the RE baseline
- [ ] Confirm only authorized staff can add or modify inventory.
- [ ] Confirm the way inventory is categorized by blood group and type is defined.
- [ ] Confirm authorized users and their permissions for viewing availability are clear.
- [ ] Confirm blood-unit statuses and permitted status transitions are defined.
- [ ] Confirm the inventory effect of an accepted donation is consistent with the donation requirements.
- [ ] Confirm allocation decreases available inventory exactly as specified.
- [ ] Confirm the system prevents allocation when the requested quantity exceeds available inventory.
- [ ] Confirm simultaneous or repeated allocation attempts cannot produce inconsistent quantities.
- [ ] Review the overlap between FR-028 and FR-039, which both describe inventory updates after allocation; record a team decision without deleting or renumbering either requirement prematurely.
- [ ] Check requirements for clarity, completeness, consistency, feasibility, and testability.
- [ ] Record unresolved inventory-model decisions rather than assuming a design.

### Proposed cross-cutting NFR/security requirements (not yet baseline-approved)
- [ ] Review NFR-001 and NFR-002 and agree measurable performance/concurrency targets, or keep them explicitly TBD.
- [ ] Review NFR-003 to NFR-022 for necessity, clarity, feasibility, and testability; distinguish requirements supported by the RE baseline from additions proposed in the SRS.
- [ ] Review SO-001/SO-002 and SR-001/SR-005 for coverage, consistency, and testability before treating them as approved requirements.
- [ ] Confirm the audit-event scope for NFR-010 remains TBD until agreed.

## Validation procedure
1. Review FR-023 through FR-029 and the related business rules.
2. Walk through adding inventory, checking availability, and allocating units.
3. Check quantity constraints, status transitions, authorization, and consistency with donation/request workflows.
4. Record gaps or conflicting rules in the findings table.
5. Discuss findings with the team and update the shared requirements baseline.
6. Mark validation complete only when critical findings are resolved or explicitly recorded as open issues.

## Findings log

| Requirement ID | Finding / question | Severity | Resolution / decision | Status |
|---|---|---|---|---|
|  |  |  |  | Open |

## Acceptance criteria
- All assigned requirements have been checked against the validation checklist.
- Inventory quantities, statuses, and allocation constraints are unambiguous.
- Requirements are consistent with donation and request workflows.
- Open inventory-model decisions are documented.
- Requirements are suitable for inclusion in the SRS and later test-case design.

## Baseline alignment note
FR-023 to FR-029 and BR-005/BR-008 to BR-010 are in the uploaded RE files. NFR-001 to NFR-022, SO-001 to SO-002, and SR-001 to SR-005 are detailed proposals in the SRS contribution and require explicit team validation; their presence here does not imply approval. This checklist is not a completed validation report.

## Dependencies and open questions
- Confirm whether inventory is tracked as individual units or aggregated quantities.
- Confirm which attributes identify an inventory entry, including blood group/type and status.
- Confirm whether historical inventory movements must be retained.
- Confirm how concurrent allocation attempts should be handled.

## Completion record
**Validated by:** Vedanth Kiran  
**Date:** TBD  
**Outcome:** Pending  
**Related PR:** TBD
