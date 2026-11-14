import { useEffect, useState } from "react";

const groups = ["A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"];
const label = group => group.replace("_POSITIVE", "+").replace("_NEGATIVE", "-");

export function InventoryHistory({ refreshKey = 0 }) {
  const [transactions, setTransactions] = useState([]);
  const [bloodGroup, setBloodGroup] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        const query = new URLSearchParams({ page: String(page) });
        if (bloodGroup) query.set("bloodGroup", bloodGroup);
        const response = await fetch("/api/v1/inventory/transactions?" + query, { credentials: "include" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load inventory history.");
        if (active) { setTransactions(result.transactions || []); setHasMore(Boolean(result.hasMore)); }
      } catch (failure) { if (active) setError(failure.message || "Could not load inventory history."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [refreshKey, bloodGroup, page, reload]);
  return (
    <section style={{ background: "#fff", padding: "24px", borderRadius: "16px", border: "1px solid #e7dcd3" }}>
      <h3 style={{ marginTop: 0 }}>Inventory Movement History</h3>
      <p>Applied stock changes, newest first. Pending and rejected proposals do not change inventory.</p>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <label>Blood group <select aria-label="History blood group" value={bloodGroup} onChange={event => { setBloodGroup(event.target.value); setPage(1); }}>
          <option value="">All blood groups</option>{groups.map(group => <option key={group} value={group}>{label(group)}</option>)}
        </select></label>
        <button type="button" disabled={loading} onClick={() => setReload(value => value + 1)}>Refresh history</button>
      </div>
      {error && <p className="form-message error" role="alert">{error}</p>}
      {loading ? <p>Loading inventory history…</p> : error ? null : transactions.length === 0 ? <p>No movements on this page.</p> : (
        <div style={{ overflowX: "auto", marginTop: "16px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead><tr>{["Date", "Group", "Type", "Units", "Recorded by", "Reason"].map(title => <th key={title} scope="col" style={{ padding: "8px" }}>{title}</th>)}</tr></thead>
            <tbody>{transactions.map(item => <tr key={item.id} style={{ borderTop: "1px solid #e7dcd3" }}>
              <td style={{ padding: "8px" }}>{new Date(item.createdAt).toLocaleString()}</td><td style={{ padding: "8px" }}>{label(item.inventory.bloodGroup)}</td>
              <td style={{ padding: "8px" }}>{item.type.replaceAll("_", " ")}</td><td style={{ padding: "8px" }}>{item.delta > 0 ? "+" : ""}{item.delta}</td>
              <td style={{ padding: "8px" }}>{item.actor?.fullName || "System"}</td><td style={{ padding: "8px" }}>{item.reason || "—"}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "16px" }}>
        <button type="button" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Previous movements</button>
        <span>Page {page}</span>
        <button type="button" disabled={!hasMore || loading || Boolean(error)} onClick={() => setPage(value => value + 1)}>Next movements</button>
      </div>
    </section>
  );
}
