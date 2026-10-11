# VAL-001: Initial Requirements Validation — Donor Management

**Project:** Blood Donation Management System (SE-jackfruit)  
**Phase:** Sprint 0 — Planning & Requirements Engineering  
**Owner:** Tusti S (PES1UG24CS505)  
**Requirements covered:** FR-007 to FR-013 and related BR-002 to BR-004

## Objective
Validate the proposed Donor Management requirements before they are finalized in the Software Requirements Specification (SRS). The goal is to identify missing, unclear, inconsistent, infeasible, or non-testable requirements.

## Scope
Validate requirements related to donor registration, viewing and updating donor profiles, staff access to donor information, eligibility information, and donation history.

## Validation checklist
- [ ] Confirm donor registration captures the information required by the agreed project scope.
- [ ] Confirm donors can view their own profiles.
- [ ] Confirm donors can update only the permitted profile fields.
- [ ] Confirm staff access to donor information is limited to authorized roles.
- [ ] Confirm eligibility information is defined clearly enough to implement and test.
- [ ] Confirm completed donations are linked to the correct donor.
- [ ] Confirm donors can view their own completed donation history.
- [ ] Check each requirement for clarity, completeness, consistency, feasibility, and testability.
- [ ] Check that each requirement has a unique ID and does not duplicate another requirement.
- [ ] Record unresolved questions or assumptions instead of silently guessing.

## Baseline alignment note
FR-007 to FR-013 and BR-002 to BR-004 are based on `donor-requirements.md` and the project baseline. Eligibility criteria, required registration fields, profile-edit permissions, and donor identification remain TBD in the source RE files. This checklist is a validation plan, not a completed validation report.

## Validation procedure
1. Review FR-007 through FR-013 against the agreed project scope and stakeholder needs.
2. Check that each requirement describes one clear, observable system behavior.
3. Identify missing conditions, role restrictions, inputs, outputs, and error cases.
4. Record each issue in the findings table below.
5. Discuss findings with the team and update the shared requirements baseline.
6. Mark the validation complete only after critical findings are resolved or explicitly recorded as open issues.

## Findings log

| Requirement ID | Finding / question | Severity | Resolution / decision | Status |
|---|---|---|---|---|
|  |  |  |  | Open |

## Acceptance criteria
- All assigned requirements have been reviewed against the checklist.
- Ambiguities and inconsistencies are resolved or documented as open issues.
- Role restrictions and expected behavior are explicit.
- Requirements are suitable for inclusion in the SRS and later test-case design.

## Dependencies and open questions
- Confirm the donor fields required for registration and profile updates.
- Confirm whether eligibility is entered by authorized staff, calculated by the system, or both.
- Confirm which staff roles may view donor information and donation history.

## Completion record
**Validated by:** Tusti S  
**Date:** TBD  
**Outcome:** Pending  
**Related PR:** TBD