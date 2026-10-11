# SRS Working Contribution — Pavithra Reddy

**Project:** Blood Donation Management System\\
**Repository:** SE-jackfruit\\
**Phase:** Sprint 0 — Planning & Requirements Engineering\\
**Owner:** Pavithra Reddy (PES1UG24CS489)\\
**Contribution:** External interfaces, Donation and Appointment Management\\
**Status:** Working draft — team review required

> **Baseline alignment:** Functional requirement IDs and intended behavior are retained from the team RE files. Details marked TBD in the source requirements remain open and must be decided by the team. Acceptance criteria in this contribution are proposed verification guidance, not evidence that validation has passed.

## 3. External interfaces

### 3.1 User interfaces
- **IR-UI-001:** The system shall provide a login interface for users to authenticate.
- **IR-UI-002:** The system shall present functionality appropriate to the authenticated user's role.
- **IR-UI-003:** The system shall provide donor interfaces for profile management, eligibility information, appointment management, and donation history.
- **IR-UI-004:** The system shall provide requester interfaces for submitting blood requests and viewing their own request status.
- **IR-UI-005:** The system shall provide staff interfaces for appointment management, donation recording, inventory management, and request processing.
- **IR-UI-006:** The system shall provide administrator interfaces for user and role/access management.

### 3.2 Software interfaces
- **IR-SW-001:** The system shall use a persistent database to store system records.
- **IR-SW-002:** Application modules shall communicate through defined interfaces.
- **IR-SW-003:** The system shall expose or consume application APIs where required by the final architecture. API details shall be defined in the Software Architecture and Design document.

### 3.3 Communications interfaces
- **IR-COM-001:** Network communication carrying credentials or sensitive data shall use HTTPS in the deployed system.
- **IR-COM-002:** The web client and server shall communicate through interfaces defined by the implementation architecture.
- **IR-COM-003:** Notifications may be included only if the team confirms them as part of the final scope; no external notification provider is assumed in this baseline.

## 4. System features (detailed)

### 4.2 Donation and Appointment Management
**Description:** Supports appointment booking and management, staff appointment handling, completed-donation recording, and the link between accepted donations and inventory.

| Requirement ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-014 | The system shall allow an eligible donor to book a donation appointment. | High | A donor meeting configured eligibility conditions can book an available appointment; ineligible donors and unavailable slots are rejected. |
| FR-015 | The system shall allow an authenticated donor to view their donation appointments. | High | An authenticated donor can view their appointments; staff appointment viewing is covered by FR-018 and follows staff permissions. |
| FR-016 | The system shall allow a donor to reschedule an appointment when scheduling rules permit it. | High | A permitted reschedule updates the appointment; conflicts or disallowed changes are rejected clearly. |
| FR-017 | The system shall allow a donor to cancel an appointment when cancellation rules permit it. | High | A permitted cancellation changes appointment state and releases the slot according to defined rules. |
| FR-018 | The system shall allow authorized staff to view and manage appointments. | High | Authorized staff can perform permitted actions; other roles cannot access staff-only actions. |
| FR-019 | The system shall allow authorized staff to record a completed donation. | High | Authorized staff can save a completion record and receive confirmation. |
| FR-020 | The system shall associate each completed donation with the relevant donor. | High | The saved donation references the correct donor. |
| FR-021 | The system shall record donation information required by the agreed data model. | High | Required fields are validated and saved; incomplete or invalid records are rejected. |
| FR-022 | The system shall update inventory when a donation is accepted into inventory. | High | Inventory increases only when the defined acceptance condition is satisfied; the donation record and inventory change remain consistent. |

**Dependencies and open decisions**
- Define appointment slot duration, availability, capacity, and conflict handling.
- Define rescheduling and cancellation conditions.
- Confirm required donation record fields.
- Confirm who records donation completion and who confirms acceptance into inventory.
- Coordinate FR-022 with inventory requirements FR-023 to FR-029.

## Contribution checklist
- [ ] Confirm interface requirements match the selected architecture.
- [ ] Validate FR-014 to FR-022 and their preconditions.
- [ ] Resolve or document scheduling and donation-record questions.
- [ ] Cross-check inventory behavior with Vedanth's contribution.
- [ ] Submit through the agreed branch and pull-request workflow.

## References
- University-provided SRS Template for SE.
- Team's agreed Blood Donation Management System requirement baseline.
