# SRS Working Contribution — Vrushant K P

**Project:** Blood Donation Management System  
**Repository:** SE-jackfruit  
**Phase:** Sprint 0 — Planning & Requirements Engineering  
**Owner:** Vrushant K P (PES1UG24CS542)  
**Contribution:** Authentication, Blood Requests, Administration, Business Rules  
**Status:** Working draft — team review required

> **Baseline alignment:** FR-001 to FR-006 and FR-030 to FR-042 correspond to the IDs in `project-requirements-baseline.md`. Details about permitted account-creation roles, request statuses/transitions, rejection reasons, allocation rules, administrator permissions, and notifications remain TBD as stated in the source RE files. Acceptance criteria are proposed checks, not completed validation results.

## 4. System features (detailed)

### 4.1 Authentication and Access Control
**Description:** Supports account creation for permitted roles, login, authentication for protected functions, role-based access, and logout.

| Requirement ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-001 | The system shall allow account creation for roles permitted by the agreed account-creation policy. | High | Permitted accounts can be created with valid information; unpermitted account creation is rejected. |
| FR-002 | The system shall allow registered users to log in using valid credentials. | High | Valid credentials establish an authenticated session; invalid credentials do not. |
| FR-003 | The system shall require authentication before allowing access to protected functions. | High | Unauthenticated access to protected functions is denied. |
| FR-004 | The system shall provide functionality according to the authenticated user's role. | High | Users can access only functions assigned to their role. |
| FR-005 | The system shall prevent users from performing actions or accessing records outside their permissions. | High | Unauthorized attempts are denied, including attempts that bypass the UI. |
| FR-006 | The system shall allow an authenticated user to log out. | High | After logout, protected functions require authentication again. |

### 4.4 Blood Requests and Administration
**Description:** Supports blood request submission and tracking, staff review and allocation, and administrative user management.

| Requirement ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-030 | The system shall allow an authorized requester to submit a blood request. | High | A valid request is saved and receives a request identifier. |
| FR-031 | A blood request shall specify the required blood group/type and quantity. | High | Missing required values or invalid quantities are rejected clearly. |
| FR-032 | The system shall assign a status to each submitted blood request. | High | A new request receives the agreed initial status. |
| FR-033 | The system shall allow a requester to view their own submitted requests. | High | A requester can retrieve their own requests but not another requester's records. |
| FR-034 | The system shall allow a requester to view the status of their own requests. | High | The displayed status matches the persisted status. |
| FR-035 | The system shall allow authorized staff to view blood requests within their permissions. | High | Authorized staff can retrieve requests; unauthorized users cannot access staff-only views. |
| FR-036 | The system shall allow authorized staff to approve or reject a request. | High | Only authorized staff can decide, and the decision is recorded. |
| FR-037 | The system shall update a request's status when an authorized decision or permitted workflow action occurs. | High | Status changes to an allowed value and is persisted. |
| FR-038 | The system shall allow authorized staff to allocate available inventory to an approved request. | High | Allocation is allowed only for an approved request and available quantity. |
| FR-039 | The system shall update inventory after a successful allocation. | High | Available inventory decreases by the allocated quantity and related records remain consistent. |
| FR-040 | The system shall allow administrators to view user accounts. | High | Authorized administrators can view permitted user records; other roles cannot. |
| FR-041 | The system shall allow administrators to manage user roles and access. | High | Only authorized administrators can change role/access assignments and the changes take effect. |
| FR-042 | The system shall allow administrators to activate or deactivate user accounts. | High | Only authorized administrators can change activation state and the state is enforced. |

## 6.5 Business rules

| Rule ID | Business rule |
|---|---|
| BR-001 | Access to system functionality shall be determined by the user's assigned role. |
| BR-002 | A donor account is required before a donor can book an appointment. |
| BR-003 | A donor must satisfy configured eligibility conditions before booking an appointment. Detailed criteria require team confirmation. |
| BR-004 | Every completed donation record shall be linked to the relevant donor. |
| BR-005 | A donation shall increase available inventory only when accepted into inventory under the agreed workflow. |
| BR-006 | A blood request must include blood group/type and quantity. |
| BR-007 | Only authorized staff may approve or reject blood requests. |
| BR-008 | Only an approved request may proceed to inventory allocation. |
| BR-009 | The quantity allocated to a request must not exceed available inventory. |
| BR-010 | A successful allocation shall update available inventory. |
| BR-011 | A requester may view only their own submitted requests and associated status information. |
| BR-012 | Only an authorized administrator may manage user roles/access or activate/deactivate accounts. |

## Contribution checklist
- [ ] Validate FR-001 to FR-006 and FR-030 to FR-042.
- [ ] Confirm request statuses and allowed transitions with the team.
- [ ] Confirm account-creation policy and administrative permissions.
- [ ] Cross-check BR-005 and BR-009/BR-010 with donation and inventory requirements.
- [ ] Submit through the agreed branch and pull-request workflow.

## References
- University-provided SRS Template for SE.
- Team's agreed Blood Donation Management System requirement baseline.
