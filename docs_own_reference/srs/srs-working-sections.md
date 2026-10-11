# SRS Working Contribution — Vedanth Kiran

**Project:** Blood Donation Management System  
**Repository:** SE-jackfruit  
**Phase:** Sprint 0 — Planning & Requirements Engineering  
**Owner:** Vedanth Kiran (PES1UG24CS523)  
**Contribution:** Inventory and Availability, NFRs, security objectives and requirements  
**Status:** Working draft — team review required

## 4. System features (detailed)

### 4.3 Blood Inventory and Availability
**Description:** Supports staff inventory maintenance and availability lookup. Allocation must not exceed available quantities.

| Requirement ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-023 | The system shall allow authorized staff to add blood units to inventory. | High | Authorized staff can add a valid entry; invalid entries are rejected. |
| FR-024 | The system shall maintain available inventory quantities by blood group and type. | High | Quantities can be retrieved by configured categories and reflect recorded changes. |
| FR-025 | The system shall allow authorized users to view blood inventory information. | High | Authorized users can view inventory information within their permissions; unauthorized access is denied. |
| FR-026 | The system shall allow authorized users to check availability by blood group and type. | High | A valid query returns available quantity or a clear no-availability result. |
| FR-027 | The system shall maintain inventory record or blood-unit status according to the agreed inventory model. | High | Only permitted status transitions are accepted and persisted. |
| FR-028 | The system shall update inventory when units are allocated to an approved request. | High | Successful allocation decreases available quantity by the allocated amount. |
| FR-029 | The system shall prevent an allocation from exceeding available quantity. | High | An excessive allocation is rejected and inventory remains unchanged. |

**Baseline alignment and status**

The RE baseline explicitly defines FR-023 to FR-029. The NFR-001 to NFR-022, SO-001 to SO-002, and SR-001 to SR-005 below are detailed SRS proposals that must be reviewed and validated by the team; the source RE baseline lists the corresponding cross-cutting topics and TBDs but does not itself enumerate these IDs. Do not mark these proposed requirements as approved until the team validates them.

**Dependencies and open decisions**
- Decide whether inventory is tracked as individual units or aggregated quantities.
- Define inventory attributes, including blood group/type and status.
- Decide whether historical inventory movements are retained.
- Coordinate donation acceptance with FR-022 and allocation with FR-038 to FR-039. FR-028 and FR-039 currently overlap in describing inventory updates after allocation; preserve both IDs pending team decision on whether they are separate requirements or should be cross-referenced.
- Define handling of concurrent or repeated allocation attempts.

## 5. Non-functional requirements (detailed)

> These are the agreed baseline IDs. Values marked TBD must be resolved by the team; do not invent performance numbers.

| ID | Requirement | Category | Acceptance / verification |
|---|---|---|---|
| NFR-001 | The system shall meet a defined response-time target for normal UI operations. | Performance | **TBD:** Set measurable target and test conditions before final approval. |
| NFR-002 | The system shall support a defined number of concurrent users under the agreed workload. | Performance | **TBD:** Set user count, workload, and measurement method. |
| NFR-003 | Inventory-changing operations shall be consistent so partial updates do not leave donation, request, and inventory records contradictory. | Reliability / data integrity | Test successful and failed changes and verify persisted state remains consistent. |
| NFR-004 | The system shall authenticate users before allowing access to protected functions. | Security | Unauthenticated access to protected functions is denied. |
| NFR-005 | The system shall enforce role-based authorization for protected actions and data. | Security | Permitted actions succeed and unauthorized role/action combinations are denied. |
| NFR-006 | The system shall store passwords using secure password hashing and shall not store plaintext passwords. | Security | Stored credentials do not contain plaintext passwords. |
| NFR-007 | The system shall validate user input before processing or persisting it. | Security / robustness | Invalid input is rejected safely with no unintended state change. |
| NFR-008 | The system shall protect sensitive user information from unauthorized access. | Privacy / security | Unauthorized roles cannot retrieve protected data. |
| NFR-009 | The deployed system shall use HTTPS for network communication carrying credentials or sensitive data. | Communications security | Verify HTTPS configuration in deployment. |
| NFR-010 | The system shall record agreed security- and business-relevant audit events. | Auditability | Verify selected events produce records with agreed fields. **Event scope/fields: TBD.** |
| NFR-011 | The system shall preserve data consistency across related records and operations. | Data integrity | Verify consistency after successful operations and handled failures. |
| NFR-012 | The system shall prevent duplicate processing where repetition could create duplicate records or inventory changes. | Reliability | Repeat an operation and verify no unintended duplicate effect occurs. |
| NFR-013 | The system shall present an appropriate error state when an operation cannot be completed. | Usability / robustness | Failure scenarios show a clear error and do not falsely report success. |
| NFR-014 | The system shall present navigation and actions appropriate to the user's role. | Usability / access control | Each role sees permitted navigation and cannot perform protected actions directly. |
| NFR-015 | The system shall provide clear validation messages for invalid or missing input. | Usability | Invalid-input tests identify the issue clearly enough for correction. |
| NFR-016 | The system shall clearly display appointment and blood-request status to permitted users. | Usability | Displayed status matches the persisted record and is visible only to permitted users. |
| NFR-017 | The implementation shall organize functionality into modules with defined responsibilities. | Maintainability | Design review identifies module responsibilities and interfaces. |
| NFR-018 | The implementation shall separate presentation, business logic, and data access responsibilities. | Maintainability | Architecture/design review verifies separation. |
| NFR-019 | Changes to one module should minimize unintended changes to unrelated modules. | Maintainability | Review changes and regression tests for unrelated modules. |
| NFR-020 | Components shall be independently testable through defined interfaces where practical. | Testability | Tests can exercise component behavior through documented interfaces. |
| NFR-021 | The project shall include automated tests for agreed critical functionality. | Testability / quality | Automated tests exist and results are available for agreed critical paths. |
| NFR-022 | The repository shall run configured automated checks through GitHub Actions for relevant pull requests or commits. | Process / quality | Workflow runs and reports its result for configured events. |

## 5.1 Security

### 5.1.1 Security objectives
- **SO-001 — Prevent unauthorized access:** Only authenticated users with the required role can access protected functionality and data.
- **SO-002 — Protect sensitive information and data integrity:** Prevent unauthorized disclosure or modification of sensitive information and protect donation, request, and inventory record consistency.

### 5.1.2 Security requirements

| ID | Requirement | Priority | Acceptance / verification |
|---|---|---|---|
| SR-001 | The system shall require authentication before protected functions can be accessed. | High | Unauthenticated attempts are denied. |
| SR-002 | The system shall enforce server-side role-based authorization for protected operations and records. | High | Unauthorized role/action requests are denied, including direct requests bypassing the UI. |
| SR-003 | The system shall store passwords using secure password hashing and shall not store plaintext passwords. | High | Stored credential records do not expose plaintext passwords. |
| SR-004 | The deployed system shall use HTTPS to protect credentials and sensitive data in transit. | High | HTTPS is enabled and HTTP is redirected or rejected according to deployment configuration. |
| SR-005 | The system shall validate untrusted input and safely handle invalid input without unauthorized data changes or exposure of sensitive internal details. | High | Invalid-input and authorization tests fail safely and return appropriate errors. |

## Contribution checklist
- [ ] Validate FR-023 to FR-029 and cross-module requirements.
- [ ] Agree measurable targets for NFR-001 and NFR-002.
- [ ] Define audit-event scope for NFR-010.
- [ ] Map SO/SR requirements to NFRs and planned tests.
- [ ] Submit through the agreed branch and pull-request workflow.

## References
- University-provided SRS Template for SE.
- Team's agreed Blood Donation Management System requirement baseline.
