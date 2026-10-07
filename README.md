# SE-jackfruit
# Blood Donation Management System

Software Engineering mini-project for the PES University JACKFRUIT Software Engineering Project.

## Team

| Member | SRN | Functional Area |
|---|---|---|
| Tusti S | PES1UG24CS505 | Donor Management |
| Pavithra Reddy | PES1UG24CS489 | Donation & Appointment Management |
| Vedanth Kiran | PES1UG24CS523 | Blood Inventory & Availability |
| Vrushant K P | PES1UG24CS542 | Blood Requests & Administration |

All members participate in requirements, design, implementation, testing, reviews, and documentation.

## System Scope

The system manages:

- User authentication and role-based access
- Donor registration, profiles, eligibility and donation history
- Donation appointments and completed donations
- Blood inventory and availability
- Blood requests, approval/rejection and allocation
- User and role administration

Out of scope: medical diagnosis/treatment, laboratory testing, physical blood collection/transportation, payments, and external system integration.

## Methodology

The project follows **Agile methodology** with weekly Scrum-style sprints.

```text
Requirements → SRS → Validation → Architecture → Design
      → Implementation → Testing → System Validation
      → Final Report & Demo
```

## Current Sprint

**Sprint 1 — Requirements, SRS & Initial Validation Specification**

Focus:
- Requirements Engineering
- SRS preparation
- Initial validation specification
- Independent requirements review

Implementation starts after requirements and design are established.

## GitHub Structure

```text
Epic → User Story → Task → Code/Documentation → Pull Request → Review → Merge
```

Requirement IDs use:

```text
FR-001   Functional Requirement
NFR-001  Non-Functional Requirement
BR-001   Business Rule
```

Use `TBD` when a requirement has not yet been finalized. Do not independently change approved requirement IDs.

## Branching

`main` contains the stable reviewed project state. Do not develop directly on `main`.

Branch naming convention:

```text
sprint<no>/<member-name>-<short-description>
```

Examples:

```text
sprint1/tusti-requirements
sprint1/pavithra-requirements
sprint1/vedanth-requirements
sprint1/vrushant-requirements
```

Use lowercase, hyphens, and short meaningful names.

## Commits

Use a Conventional Commit-style format:

```text
<type>: <short description>
```

Examples:

```text
docs: add donor management requirements
feat: implement donor registration
fix: validate donor contact number
test: add donor registration tests
```

Keep commits focused and meaningful.

## Pull Requests

Every completed work item should go through a PR and independent review.

```text
Work → Commit → Push → PR → Independent Review → Merge
```

- PR author must not approve their own PR.
- Review feedback must be addressed before merging.
- Only **Tusti (Team Lead)** merges PRs into `main`.
- PRs should reference the related GitHub issue.

PR title format:

```text
<ISSUE-ID>: <short description>
```

Example:

```text
RE-001: Define Donor Management Requirements
```

## Documentation Structure

```text
docs/
├── requirements/
├── srs/
├── architecture/
├── design/
├── validation/
├── tests/
└── reviews/
```

## Sprint 1 Deliverables

| Member | Deliverables |
|---|---|
| Tusti | RE-001, SRS-001, REV-001, VAL-001 |
| Pavithra | RE-002, SRS-002, REV-002, VAL-002 |
| Vedanth | RE-003, SRS-003, REV-003, VAL-003 |
| Vrushant | RE-004, SRS-004, REV-004, VAL-004 |

The project maintains one shared requirements baseline so that all team members work from the same approved requirements.
