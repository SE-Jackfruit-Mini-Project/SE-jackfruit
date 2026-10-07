# Donor Management Requirements

## 1. Overview

The Donor Management module provides the functionality required to register donors, manage donor profile information, provide donor eligibility information, and allow donors to view their completed donation history. Authorized blood bank staff can also access donor information required for system operations.

## 2. Scope

This module covers:

- Donor registration
- Donor profile viewing and updating
- Donor eligibility information
- Authorized staff access to donor information
- Donor donation history
- Association of completed donations with the corresponding donor

Authentication and role-based access are system-wide requirements and will be handled separately, but they apply to the functions in this module.

## 3. Functional Requirements

### FR-007 — Donor Registration

The system shall allow a donor to register as a donor by providing the required donor information.

### FR-008 — View Donor Profile

The system shall allow an authenticated donor to view their own profile information.

### FR-009 — Update Donor Profile

The system shall allow an authenticated donor to update permitted profile information.

### FR-010 — Staff Access to Donor Information

The system shall allow authorized blood bank staff to view donor information required for donor-related operations.

### FR-011 — Donor Eligibility Information

The system shall record and display donor eligibility information.

### FR-012 — Maintain Donor Donation Records

The system shall maintain completed donation records associated with the corresponding donor.

### FR-013 — View Donation History

The system shall allow an authenticated donor to view their completed donation history.

## 4. Business Rules

### BR-002 — Donor Account Before Appointment

A donor shall have a donor account before booking a donation appointment.

### BR-003 — Donor Eligibility

A donor shall satisfy the configured eligibility condition before booking a donation appointment.

The exact donor eligibility criteria are TBD and will be finalized during requirements/design review.

### BR-004 — Donation Linked to Donor

Every completed donation shall be associated with the donor who made the donation.

## 5. Related System-Wide Requirements

The following system-wide requirements apply to the Donor Management module:

- Authentication is required before accessing protected donor functions.
- Functionality shall be provided according to the authenticated user's role.
- Users shall not access functions that are not permitted for their role.

These requirements will be maintained under the system-wide Authentication and Access requirements.

## 6. Assumptions and TBD Items

The following details have not yet been finalized:

| Item | Status |
|---|---|
| Exact donor registration fields | TBD |
| Exact donor eligibility criteria | TBD |
| Whether eligibility is calculated automatically or recorded manually | TBD |
| Profile fields that a donor can update | TBD |
| Whether authorized staff can modify donor profile information | TBD |
| Exact donor identification mechanism | TBD |