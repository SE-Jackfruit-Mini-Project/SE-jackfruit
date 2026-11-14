import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Exercise rendered controls and asynchronous handlers with deterministic hook state.
// Browser layout, focus, and real React scheduling remain manual test-plan checks.
const hooks = vi.hoisted(() => ({ values: [], cursor: 0, effects: [], navigate: vi.fn() }));
vi.mock("react", async (load) => ({
  ...await load(),
  useState(initial) {
    const index = hooks.cursor++;
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.values[index], (value) => {
      hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value;
    }];
  },
  useRef(initial) {
    const index = hooks.cursor++;
    if (!(index in hooks.values)) hooks.values[index] = { current: initial };
    return hooks.values[index];
  },
  useEffect(callback) { hooks.effects.push(callback); },
}));
vi.mock("react-router-dom", () => ({ Link: "a", useNavigate: () => hooks.navigate }));

import { BloodRequests } from "../../src/requests/BloodRequests.jsx";
import { ReviewRequests } from "../../src/requests/ReviewRequests.jsx";
import { StockEntry } from "../../src/inventory/StockEntry.jsx";
import { OperationApprovals } from "../../src/admin/OperationApprovals.jsx";
import { Dashboard } from "../../src/dashboard/Dashboard.jsx";
import { AllocateRequests } from "../../src/inventory/AllocateRequests.jsx";
import { BloodAvailability } from "../../src/inventory/BloodAvailability.jsx";
import { RecordDonation } from "../../src/donations/RecordDonation.jsx";
import { ManageInventory } from "../../src/inventory/ManageInventory.jsx";
import { ManageUsers } from "../../src/admin/ManageUsers.jsx";
import { DonorInformation } from "../../src/donors/DonorInformation.jsx";
import { BookAppointment } from "../../src/appointments/BookAppointment.jsx";
import { ManageAppointments } from "../../src/appointments/ManageAppointments.jsx";
import { EligibilityPage } from "../../src/eligibility/EligibilityPage.jsx";
import { ManageSlots } from "../../src/slots/ManageSlots.jsx";

function render(Component, props = {}) {
  hooks.cursor = 0;
  hooks.effects = [];
  return Component(props);
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
function find(tree, type) { return nodes(tree).find((node) => node.type === type); }
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (tree && typeof tree === "object") return text(tree.props?.children);
  return tree == null ? "" : String(tree);
}
const reply = (body, ok = true) => ({ ok, status: ok ? 200 : 401, json: async () => body });
const submitEvent = { preventDefault() {} };
const requestItem = { id: "request-1", hospitalName: "City Hospital", bloodGroup: "A_POSITIVE", units: 1, urgency: "NORMAL", status: "ALLOCATED", createdAt: "2026-11-13" };
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

beforeEach(() => {
  vi.useFakeTimers();
  hooks.values = [];
  hooks.navigate.mockReset();
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal("window", { dispatchEvent: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("request tracking", () => {
  test.each([BloodRequests, ReviewRequests])("failed history loads show an error rather than an empty list", async (Component) => {
    fetch.mockResolvedValue(reply({ message: "Unavailable" }, false));
    render(Component);
    hooks.effects[0]();
    await settle();
    const tree = render(Component);
    expect(nodes(tree).some((node) => node.props?.role === "alert")).toBe(true);
    expect(text(tree)).not.toMatch(/No blood requests|No blood requests submitted/);
  });

  test("allocated requests are displayed as fulfilled rather than rejected", async () => {
    fetch.mockResolvedValue(reply({ requests: [requestItem] }));
    render(BloodRequests);
    hooks.effects[0]();
    await settle();
    const badge = nodes(render(BloodRequests)).find((node) => node.type === "span" && node.props.children === "ALLOCATED");
    expect(badge.props.style.color).toBe("#065f46");
  });

  test("review queue exposes the allocated status filter", async () => {
    fetch.mockResolvedValue(reply({ requests: [] }));
    let tree = render(ReviewRequests);
    nodes(tree).find((node) => node.type === "button" && node.props.children === "ALLOCATED").props.onClick();
    tree = render(ReviewRequests);
    hooks.effects[0]();
    await settle();
    expect(fetch).toHaveBeenCalledWith("/api/v1/requests?status=ALLOCATED", { credentials: "include" });
  });

  test("rapid request submissions send one POST and retain values on failure", async () => {
    let complete;
    fetch.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    const form = find(render(BloodRequests), "form");
    const first = form.props.onSubmit(submitEvent);
    await form.props.onSubmit(submitEvent);
    expect(fetch).toHaveBeenCalledTimes(1);
    complete(reply({ message: "Try again" }, false));
    await first;
    expect(text(render(BloodRequests))).toContain("Try again");
    expect(find(render(BloodRequests), "form")).toBeDefined();
  });
});

describe("stock submission", () => {
  test("a 202 proposal response is handled safely even if the displayed role is stale", async () => {
    const onAdded = vi.fn();
    fetch.mockResolvedValue(reply({ message: "Awaiting admin approval", approval: { id: "proposal-1" } }));
    await find(render(StockEntry, { userRole: "ADMIN", onAdded }), "form").props.onSubmit(submitEvent);
    expect(text(render(StockEntry, { userRole: "ADMIN", onAdded }))).toContain("Awaiting admin approval");
    expect(onAdded).not.toHaveBeenCalled();
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
  });

  test("applied inventory responses refresh stock even if the displayed role is stale", async () => {
    const onAdded = vi.fn();
    fetch.mockResolvedValue(reply({ message: "Added", inventory: { bloodGroup: "A_POSITIVE", availableUnits: 7 } }));
    await find(render(StockEntry, { userRole: "STAFF", onAdded }), "form").props.onSubmit(submitEvent);
    expect(onAdded).toHaveBeenCalledTimes(1);
    expect(text(render(StockEntry, { onAdded }))).toContain("A+ now has 7 units");
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  test("rapid submissions create one stock request and failed submissions unlock retry", async () => {
    let complete;
    fetch.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    const handler = find(render(StockEntry), "form").props.onSubmit;
    const first = handler(submitEvent);
    await handler(submitEvent);
    expect(fetch).toHaveBeenCalledTimes(1);
    complete(reply({ message: "Validation failed" }, false));
    await first;
    fetch.mockResolvedValue(reply({ message: "Proposed", approval: {} }));
    await find(render(StockEntry), "form").props.onSubmit(submitEvent);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("operational decisions and dashboard refresh", () => {
  const proposal = { id: "proposal-1", action: "ADD_STOCK", status: "PENDING", payload: { bloodGroup: "A_POSITIVE", units: 1, type: "PURCHASE" }, createdAt: "2026-11-13" };

  test.each(["Approve", "Reject"])("%s refreshes dependent views and blocks overlapping decisions", async (label) => {
    const onDecision = vi.fn();
    fetch.mockResolvedValueOnce(reply({ approvals: [proposal] }));
    render(OperationApprovals, { userRole: "ADMIN", onDecision });
    hooks.effects[0]();
    await settle();
    let complete;
    fetch.mockReturnValueOnce(new Promise((resolve) => { complete = resolve; }))
      .mockResolvedValue(reply({ approvals: [] }));
    const button = nodes(render(OperationApprovals, { userRole: "ADMIN", onDecision })).find((node) => node.type === "button" && node.props.children === label);
    button.props.onClick();
    button.props.onClick();
    expect(fetch).toHaveBeenCalledTimes(2);
    complete(reply({ approval: { ...proposal, status: label === "Approve" ? "APPROVED" : "REJECTED" } }));
    await settle();
    expect(onDecision).toHaveBeenCalledTimes(1);
  });

  test("failed approval leaves the proposal visible and does not signal success", async () => {
    const onDecision = vi.fn();
    fetch.mockResolvedValueOnce(reply({ approvals: [proposal] }));
    render(OperationApprovals, { userRole: "ADMIN", onDecision });
    hooks.effects[0]();
    await settle();
    fetch.mockResolvedValue(reply({ message: "Insufficient inventory" }, false));
    nodes(render(OperationApprovals, { userRole: "ADMIN", onDecision })).find((node) => node.props?.children === "Approve").props.onClick();
    await settle();
    const tree = render(OperationApprovals, { userRole: "ADMIN", onDecision });
    expect(text(tree)).toContain("Insufficient inventory");
    expect(onDecision).not.toHaveBeenCalled();
  });

  test("allocation and donation callbacks refresh all affected dashboard panels", async () => {
    fetch.mockResolvedValue(reply({ user: { id: "admin-1", role: "ADMIN" } }));
    render(Dashboard);
    hooks.effects[0]();
    await settle();
    let tree = render(Dashboard);
    find(tree, AllocateRequests).props.onAllocated();
    tree = render(Dashboard);
    expect(find(tree, ReviewRequests).props.refreshKey).toBe(1);
    expect(find(tree, BloodAvailability).props.refreshKey).toBe(1);
    expect(find(tree, ManageInventory).props.refreshKey).toBe(1);
    find(tree, RecordDonation).props.onRecorded();
    tree = render(Dashboard);
    expect(find(tree, BloodAvailability).props.refreshKey).toBe(2);
    find(tree, OperationApprovals).props.onDecision();
    tree = render(Dashboard);
    expect(find(tree, ManageSlots).props.refreshKey).toBe(1);
    expect(find(tree, BloodAvailability).props.refreshKey).toBe(3);
  });

  test("an unauthenticated session renders no donor dashboard", async () => {
    fetch.mockResolvedValue(reply({}, false));
    render(Dashboard);
    hooks.effects[0]();
    await settle();
    expect(render(Dashboard)).toBeNull();
    expect(hooks.navigate).toHaveBeenCalledWith("/login");
  });
});


describe("local consistency audit regressions", () => {
  test("service failures show a retry state without pretending the user logged out", async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 });
    render(Dashboard); hooks.effects[0](); await settle();
    expect(text(render(Dashboard))).toContain("Could not reach the service");
    expect(hooks.navigate).not.toHaveBeenCalled();
  });
  test("session polling replaces the dashboard after an administrator changes the role", async () => {
    fetch.mockResolvedValue(reply({ user: { id: "user-1", role: "DONOR" } }));
    render(Dashboard); const cleanup = hooks.effects[0](); await settle();
    fetch.mockResolvedValue(reply({ user: { id: "user-1", role: "ADMIN" } }));
    await vi.advanceTimersByTimeAsync(15000); await settle();
    expect(find(render(Dashboard), ManageUsers)).toBeDefined(); cleanup();
  });
  test("a failed user directory load is visible", async () => {
    fetch.mockRejectedValue(new Error("Server unavailable"));
    render(ManageUsers, { currentAdminId: "admin-1" }); hooks.effects[0](); await settle();
    expect(text(render(ManageUsers, { currentAdminId: "admin-1" }))).toContain("Server unavailable");
  });
  test("role changes notify dependent donor panels and block overlapping updates", async () => {
    const user = { id: "user-1", fullName: "Demo", email: "demo@example.test", role: "DONOR", isActive: true };
    const onChanged = vi.fn();
    fetch.mockResolvedValue(reply({ users: [user] }));
    render(ManageUsers, { currentAdminId: "admin-1", onChanged }); hooks.effects[0](); await settle();
    let complete;
    fetch.mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
    const select = find(render(ManageUsers, { currentAdminId: "admin-1", onChanged }), "select");
    const first = select.props.onChange({ target: { value: "STAFF" } });
    select.props.onChange({ target: { value: "ADMIN" } });
    expect(fetch).toHaveBeenCalledTimes(2);
    complete(reply({ message: "Updated" })); await first;
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
  test("booking load failures are visible", async () => {
    fetch.mockResolvedValue(reply({ message: "Unavailable" }, false));
    const props = { donor: { dateOfBirth: "2000-01-01", gender: "MALE" } };
    render(BookAppointment, props); hooks.effects[0](); await settle();
    expect(text(render(BookAppointment, props))).toContain("Could not load appointment data");
  });
  test("booking and cancellation notify both appointment panels", async () => {
    fetch.mockResolvedValue(reply({ user: { id: "donor-1", role: "DONOR", dateOfBirth: "2000-01-01", gender: "MALE", bloodGroup: "O_POSITIVE" } }));
    render(Dashboard); const cleanup = hooks.effects[0](); await settle();
    let tree = render(Dashboard);
    find(tree, BookAppointment).props.onBooked();
    tree = render(Dashboard);
    expect(find(tree, ManageAppointments).props.refreshKey).toBe(1);
    find(tree, ManageAppointments).props.onChanged();
    expect(find(render(Dashboard), BookAppointment).props.refreshKey).toBe(2); cleanup();
  });
  test("user changes refresh the staff donor directory and intake options", async () => {
    fetch.mockResolvedValue(reply({ user: { id: "admin-1", role: "ADMIN" } }));
    render(Dashboard); const cleanup = hooks.effects[0](); await settle();
    find(render(Dashboard), ManageUsers).props.onChanged();
    const tree = render(Dashboard);
    expect(find(tree, DonorInformation).props.refreshKey).toBe(1);
    expect(find(tree, RecordDonation).props.refreshKey).toBe(1); cleanup();
  });
  test("signed-in eligibility navigation returns to dashboard", async () => {
    fetch.mockResolvedValue(reply({ user: { id: "donor-1" } }));
    render(EligibilityPage); hooks.effects[0](); await settle();
    const tree = render(EligibilityPage);
    expect(text(tree)).toContain("Back to dashboard");
    expect(text(tree)).not.toContain("Create a donor account");
  });
});
