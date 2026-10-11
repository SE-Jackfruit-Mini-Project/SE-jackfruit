# Donation and Appointment Management Requirements

## 1. Overview

The Donation and Appointment Management module provides functionality for donors to book and manage donation appointments and for authorized blood bank staff to manage appointments and record completed blood donations.

## 2. Scope

This module covers:

- Booking donation appointments
- Viewing appointments
- Rescheduling appointments
- Cancelling appointments
- Staff management of appointments
- Recording completed donations
- Associating completed donations with donors
- Recording donation information
- Updating blood inventory after an accepted donation

## 3. Functional Requirements

### FR-014 — Book Donation Appointment

The system shall allow an eligible donor to book a donation appointment.

### FR-015 — View Appointments

The system shall allow an authenticated donor to view their donation appointments.

### FR-016 — Reschedule Donation Appointment

The system shall allow an authenticated donor to reschedule a permitted donation appointment.

### FR-017 — Cancel Donation Appointment

The system shall allow an authenticated donor to cancel a permitted donation appointment.

### FR-018 — Staff Manage Appointments

The system shall allow authorized blood bank staff to view and manage donation appointments.

### FR-019 — Record Completed Donation

The system shall allow authorized blood bank staff to record a completed blood donation.

### FR-020 — Link Donation to Donor

The system shall associate each completed donation with the corresponding donor.

### FR-021 — Record Donation Information

The system shall record the information required for a completed donation.

### FR-022 — Update Inventory After Donation

The system shall update blood inventory when a completed donation is accepted.

## 4. Business Rules

The following business rules apply:

- A donor must have a donor account before booking an appointment.
- A donor must satisfy the configured eligibility condition before booking an appointment.
- A completed donation must be associated with the donor who made the donation.
- An accepted donation increases the appropriate blood inventory.

Exact appointment scheduling rules and donation attributes are TBD.

## 5. Related System-Wide Requirements

The module shall follow:

- Authentication requirements
- Role-based authorization requirements
- Input validation requirements
- Data consistency requirements

## 6. Assumptions and TBD Items

| Item | Status |
|---|---|
| Exact appointment slot rules | TBD |
| Appointment duration | TBD |
| Appointment status values | TBD |
| Exact donation information fields | TBD |
| Donation acceptance criteria | TBD |
| Rules for modifying completed donations | TBD |