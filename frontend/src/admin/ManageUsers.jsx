import { useState, useEffect } from "react";

const PERMITTED_ROLES = [
  { value: "DONOR", label: "Donor" },
  { value: "HOSPITAL_REQUESTER", label: "Hospital Requester" },
  { value: "STAFF", label: "Staff" },
  { value: "ADMIN", label: "Admin" },
];

export function ManageUsers({ currentAdminId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const response = await fetch("/api/v1/admin/users", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch {
      console.error("Failed to fetch system users.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId, newRole) {
    setUpdatingId(userId);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: result.message || "Failed to update role." });
        return;
      }

      setMessage({ type: "success", text: result.message });
      await fetchUsers();
    } catch {
      setMessage({ type: "error", text: "Network error while updating role." });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleStatusToggle(userId, currentStatus) {
    setUpdatingId(userId);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: result.message || "Failed to update account status." });
        return;
      }

      setMessage({ type: "success", text: result.message });
      await fetchUsers();
    } catch {
      setMessage({ type: "error", text: "Network error while updating status." });
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      u.fullName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term);
    return matchesRole && matchesSearch;
  });

  return (
    <section
      style={{
        background: "#fff",
        padding: "24px",
        borderRadius: "16px",
        border: "1px solid #e7dcd3",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: "20px" }}>
            User & Access Management
          </h3>
          <p style={{ margin: "4px 0 0", color: "#81716a", fontSize: "13px" }}>
            View system users, assign permitted roles, and activate or deactivate accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchUsers}
          style={{
            padding: "6px 14px",
            minHeight: "auto",
            fontSize: "12px",
            borderRadius: "8px",
            border: "1px solid #e7dcd3",
            background: "#f3ebe4",
            color: "#51413b",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "1 1 220px",
            minHeight: "40px",
            padding: "0 12px",
            fontSize: "13px",
            borderRadius: "8px",
            border: "1px solid #e7dcd3",
          }}
        />

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["ALL", "DONOR", "HOSPITAL_REQUESTER", "STAFF", "ADMIN"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              style={{
                padding: "6px 10px",
                minHeight: "auto",
                fontSize: "12px",
                borderRadius: "8px",
                border: "1px solid #e7dcd3",
                background: roleFilter === r ? "#862f2b" : "#fdfaf7",
                color: roleFilter === r ? "#fff" : "#51413b",
                fontWeight: roleFilter === r ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {r === "HOSPITAL_REQUESTER" ? "Hospital" : r}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div
          className={`form-message ${message.type}`}
          role="status"
          style={{ marginBottom: "16px" }}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#81716a", fontSize: "14px" }}>Loading system users…</p>
      ) : filteredUsers.length === 0 ? (
        <p style={{ color: "#81716a", fontSize: "14px" }}>No users match the selected criteria.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #f0e7df", color: "#81716a" }}>
                <th style={{ padding: "8px" }}>Name</th>
                <th style={{ padding: "8px" }}>Email</th>
                <th style={{ padding: "8px" }}>Role</th>
                <th style={{ padding: "8px" }}>Status</th>
                <th style={{ padding: "8px" }}>Registered</th>
                <th style={{ padding: "8px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isSelf = u.id === currentAdminId;
                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f5ede6" }}>
                    <td style={{ padding: "10px 8px", fontWeight: 600 }}>
                      {u.fullName} {isSelf && <span style={{ fontSize: "11px", color: "#862f2b" }}>(You)</span>}
                    </td>
                    <td style={{ padding: "10px 8px", fontSize: "13px", color: "#6b5c56" }}>
                      {u.email}
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <select
                        value={u.role}
                        disabled={isSelf || updatingId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid #e7dcd3",
                          background: "#fff",
                          font: "inherit",
                          fontSize: "13px",
                          cursor: isSelf ? "not-allowed" : "pointer",
                        }}
                      >
                        {PERMITTED_ROLES.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "bold",
                          background: u.isActive !== false ? "#d1fae5" : "#fee2e2",
                          color: u.isActive !== false ? "#065f46" : "#991b1b",
                        }}
                      >
                        {u.isActive !== false ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 8px", color: "#81716a", fontSize: "13px" }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <button
                        type="button"
                        disabled={isSelf || updatingId === u.id}
                        onClick={() => handleStatusToggle(u.id, u.isActive !== false)}
                        style={{
                          padding: "5px 12px",
                          minHeight: "auto",
                          fontSize: "12px",
                          fontWeight: 700,
                          borderRadius: "6px",
                          border: "1px solid",
                          borderColor: u.isActive !== false ? "#dc2626" : "#16a34a",
                          background: u.isActive !== false ? "#ef4444" : "#22c55e",
                          color: "#fff",
                          cursor: isSelf ? "not-allowed" : updatingId === u.id ? "wait" : "pointer",
                          opacity: isSelf ? 0.5 : 1,
                        }}
                        title={isSelf ? "Cannot deactivate your own account" : ""}
                      >
                        {u.isActive !== false ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
