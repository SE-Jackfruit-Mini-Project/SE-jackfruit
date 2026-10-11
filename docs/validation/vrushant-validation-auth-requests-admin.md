# VAL-004: Initial Requirements Validation — Authentication, Blood Requests, and Administration

**Project:** Blood Donation Management System (SE-jackfruit)  
**Phase:** Sprint 0 — Planning & Requirements Engineering  
**Owner:** Vrushant K P (PES1UG24CS542)  
**Requirements covered:** FR-001 to FR-006, FR-030 to FR-042, and related BR-001, BR-006 to BR-012

## Objective
Validate the proposed Authentication, Blood Requests, and Administration requirements before they are finalized in the Software Requirements Specification (SRS).

## Scope
Validate account creation, login, authentication before protected actions, role-based functionality, prevention of unauthorized access, logout, request submission and status viewing, staff review and allocation, and administrator user/role management.

## Validation checklist
- [ ] Confirm account creation is available only to permitted roles.
- [ ] Confirm protected functions require authentication.
- [ ] Confirm role permissions are defined and unauthorized access is prevented.
- [ ] Confirm logout ends the user's authenticated session as required.
- [ ] Confirm a blood request specifies the required blood group/type and quantity.
- [ ] Confirm request status values and allowed transitions are defined.
- [ ] Confirm requesters can access only their own submitted requests and statuses.
- [ ] Confirm only authorized staff can approve or reject requests.
- [ ] Confirm allocation is allowed only for approved requests.
- [ ] Confirm administrator permissions for viewing users, managing roles, and activating/deactivating accounts are clear.
- [ ] Check requirements for clarity, completeness, consistency, feasibility, and testability.
- [ ] Check consistency with the security requirements and business rules.
- [ ] Record unresolved rules instead of inventing behavior.

## Validation procedure
1. Review FR-001 through FR-006 and FR-030 through FR-042 alongside the business rules and security requirements.
2. Walk through login, role-restricted access, request submission, staff decision, allocation, and user administration.
3. Check permissions, preconditions, state transitions, and unauthorized or invalid actions.
4. Record gaps or conflicting rules in the findings table.
5. Discuss findings with the team and update the shared requirements baseline.
6. Mark validation complete only when critical findings are resolved or explicitly recorded as open issues.

## Findings log

| Requirement ID | Finding / question | Severity | Resolution / decision | Status |
|---|---|---|---|---|
|  |  |  |  | Open |

## Acceptance criteria
- All assigned requirements have been checked against the validation checklist.
- Authentication and role permissions are explicit.
- Request status transitions and allocation preconditions are clear.
- Administrator actions are restricted to the agreed role.
- Requirements are consistent with business and security rules.
- Requirements are suitable for inclusion in the SRS and later test-case design.

## Baseline alignment note
The source RE baseline lists FR-001 to FR-006 and FR-030 to FR-042, with BR-001 and BR-006 to BR-012 relevant to this validation. This checklist is a plan for validation, not evidence that validation has been completed.

## Dependencies and open questions
- Confirm the final list of roles permitted to create accounts.
- Confirm request status values and allowed transitions.
- Confirm whether notifications are included in the agreed scope.
- Confirm the intended behavior when an account is deactivated or a session expires.
- Confirm whether FR-028 and FR-039 are distinct: both currently describe inventory updates after allocation; preserve both IDs until the team decides how to handle the overlap.

## Completion record
**Validated by:** Vrushant K P  
**Date:** TBD  
**Outcome:** Pending  
**Related PR:** TBD
