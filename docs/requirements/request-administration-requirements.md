# Blood Requests and Administration Requirements

## 1. Overview

The Blood Requests and Administration module provides functionality for submitting blood requests, tracking request status, reviewing requests, approving or rejecting requests, allocating blood units, and managing system users and access.

## 2. Scope

This module covers:

- Blood request submission
- Blood group/type and quantity specification
- Request status management
- Requester request viewing
- Request status tracking
- Staff request review
- Request approval and rejection
- Blood unit allocation
- User management
- Role and access management
- User activation and deactivation

## 3. Functional Requirements

### FR-030 — Submit Blood Request

The system shall allow an authorized requester to submit a blood request.

### FR-031 — Specify Blood Group/Type and Quantity

The system shall require a blood request to specify the required blood group/type and quantity.

### FR-032 — Assign Request Status

The system shall assign an appropriate status to a submitted blood request.

### FR-033 — View Submitted Requests

The system shall allow a requester to view their submitted blood requests.

### FR-034 — View Request Status

The system shall allow a requester to view the status of their submitted blood requests.

### FR-035 — Staff View Requests

The system shall allow authorized blood bank staff to view blood requests requiring operational processing.

### FR-036 — Approve/Reject Blood Request

The system shall allow authorized blood bank staff to approve or reject a blood request.

### FR-037 — Update Request Status

The system shall update the status of a blood request when an authorized action is performed.

### FR-038 — Allocate Available Blood Units

The system shall allow authorized blood bank staff to allocate available blood units to an approved blood request.

### FR-039 — Update Inventory After Allocation

The system shall update the available inventory after blood units are allocated.

### FR-040 — Admin View Users

The system shall allow an administrator to view system users.

### FR-041 — Admin Manage Roles/Access

The system shall allow an administrator to manage permitted user roles and access.

### FR-042 — Admin Activate/Deactivate Users

The system shall allow an administrator to activate or deactivate user accounts.

## 4. Business Rules

### BR-006 — Blood Request Information

A blood request shall specify the required blood group/type and quantity.

### BR-007 — Request Approval

Only authorized blood bank staff shall approve or reject blood requests.

### BR-008 — Allocation

Only an approved blood request shall be eligible for blood allocation.

### BR-009 — Available Inventory

Blood allocation shall not exceed the available inventory.

### BR-010 — Inventory Update

Blood inventory shall be updated after successful allocation.

### BR-011 — Requester Access

A requester shall be able to view only their own submitted requests.

### BR-012 — Administration

An administrator shall manage permitted user roles and account access.

## 5. Assumptions and TBD Items

| Item | Status |
|---|---|
| Exact request status values | TBD |
| Exact request status transitions | TBD |
| Exact approval/rejection workflow | TBD |
| Rejection reason requirements | TBD |
| Exact allocation rules | TBD |
| Exact administrator permissions | TBD |
| Notification requirements | TBD |