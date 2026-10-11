# SRS Working Contribution — Tusti S

**Project:** Blood Donation Management System  
**Repository:** SE-jackfruit  
**Phase:** Sprint 0 — Planning & Requirements Engineering  
**Owner:** Tusti S (PES1UG24CS505)  
**Contribution:** Introduction, overall description, Donor Management  
**Status:** Working draft — team review required

> This is a contribution to the consolidated SRS, not a separate final SRS. Preserve the university template's eight top-level sections.

> **Baseline alignment:** The system scope, user classes, out-of-scope items, FR-007 to FR-013, and business rules are based on the team RE baseline and module file. Details marked TBD in the source files remain unresolved. Acceptance criteria are proposed verification guidance, not a record of completed validation.

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) defines the functional and non-functional requirements for the Blood Donation Management System. It provides a baseline for implementation, architecture/design, and testing.

### 1.2 Scope
The system is a web-based platform for managing donor information, donation appointments, recorded donations, blood inventory and availability, blood requests, and administrative access. It supports donors, hospital/requester users, blood bank staff, and administrators.

Out of scope: diagnosis or treatment recommendations, laboratory testing, physical blood collection, transportation, payments, emergency medical decisions, and external hospital/government integrations unless explicitly approved as a scope change.

### 1.3 Audience
Project team members, reviewers, testers, instructors, and stakeholders involved in defining, building, and validating the system.

### 1.4 Definitions and abbreviations
- **Donor:** A user who registers donor information and may book a donation appointment.
- **Requester:** An authorized hospital/requester user who submits blood requests.
- **Blood bank staff:** An authorized user who manages appointments, donation records, inventory, and requests.
- **Administrator:** A user who manages system users and role access.
- **FR:** Functional Requirement; **NFR:** Non-functional Requirement; **RTM:** Requirements Traceability Matrix; **SRS:** Software Requirements Specification.

## 2. Overall description

### 2.1 Product perspective
The system is a centralized web application with a browser-based user interface, application logic, and persistent data storage. Modules communicate through defined interfaces. Authentication and role-based authorization protect restricted operations.

### 2.2 Major product functions
- Account creation, login, authorization, and logout.
- Donor registration, profile management, eligibility information, and donation history.
- Appointment booking and management.
- Recording completed donations.
- Blood inventory management and availability lookup.
- Blood request submission, review, approval/rejection, and allocation.
- Administrative user and role management.

### 2.3 User classes and characteristics
- **Donor:** Manages permitted profile information, views eligibility information and donation history, and manages appointments.
- **Hospital/requester:** Submits blood requests and views the status of their own requests.
- **Blood bank staff:** Manages appointments, records donations, maintains inventory, reviews requests, and allocates available units.
- **Administrator:** Manages users and their roles/access.

### 2.4 Operating environment
A web application accessed through a modern browser over a network. Hosting platform, supported browser versions, and deployment environment are to be selected by the team and documented in the design specification.

### 2.5 Design and implementation constraints
- Enforce role-based access and protect sensitive information.
- Persist system records in a database.
- Preserve data consistency across inventory updates and allocations.
- Follow the submitted SRS, SAD, and Test Plan; document deviations.
- Use GitHub for version control, issue tracking, pull requests, and team coordination.

### 2.6 Assumptions and dependencies
- Users have access to a compatible browser and network connection.
- Authorized staff maintain accurate donation and inventory records.
- Eligibility criteria, inventory attributes, appointment rules, and request status transitions require team confirmation.
- External integrations are outside the baseline scope.

## 4. System features (detailed)

### 4.1 Donor Management
**Description:** Supports donor registration and profile access, eligibility information, and the donor's completed donation history.

| Requirement ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-007 | The system shall allow donor registration with the required donor information. | High | Valid registration is stored and confirmed; missing or invalid required fields are rejected with a clear message. |
| FR-008 | The system shall allow a donor to view their own profile. | High | An authenticated donor can view their profile but not another donor's profile through the donor interface. |
| FR-009 | The system shall allow a donor to update permitted profile fields. | High | Permitted changes are saved; restricted fields cannot be changed by the donor. |
| FR-010 | The system shall allow authorized staff to view donor information needed for their duties. | High | Authorized staff can access permitted information; unauthorized roles are denied. |
| FR-011 | The system shall record and display donor eligibility information. | High | Eligibility information is stored and displayed to permitted users; the eligibility source/rules are defined before implementation. |
| FR-012 | The system shall maintain completed donation records linked to the relevant donor. | High | A completed donation references the correct donor and can be retrieved consistently. |
| FR-013 | The system shall allow a donor to view their own completed donation history. | High | The donor sees only their own completed donation records. |

**Dependencies and open decisions**
- Confirm required registration fields and editable profile fields.
- Confirm whether eligibility is entered by authorized staff, calculated by the system, or both.
- Confirm which staff roles may view donor information and history.
- Confirm privacy rules and the minimum donor information shown to each role.

## Contribution checklist
- [ ] Confirm Sections 1 and 2 match the team's agreed scope.
- [ ] Validate FR-007 to FR-013 against the agreed requirements.
- [ ] Resolve or document open decisions.
- [ ] Cross-check terminology and role names with other contributions.
- [ ] Submit through the agreed branch and pull-request workflow.

## References
- University-provided SRS Template for SE.
- Team's agreed Blood Donation Management System requirement baseline.