"use client";
import { useState, useEffect } from "react";
import supabase from "../../lib/supabaseClient"; // using default export

interface RepairEntry {
  id: number;
  status: string;
  date: string;
  cut_number: string;
  customer: string;
  style: string;
  color: string;
  qty_repairs: number;
  seconds: number;
  total_repaired: number;
  balance: number;
  operators: string;
  last_updated: string;
}

export default function RepairsReport() {
  // States for loading, data, new record, and cell editing
  const [repairs, setRepairs] = useState<RepairEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [newEntry, setNewEntry] = useState({
    status: "",
    date: new Date().toISOString().slice(0, 10),
    cut_number: "",
    customer: "",
    style: "",
    color: "",
    qty_repairs: 0,
    seconds: 0,
    total_repaired: 0,
    operators: "",
  });

  // Instead of a whole-row edit, we track a single cell:
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: keyof RepairEntry } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Fetch repair records from Supabase
  useEffect(() => {
    async function fetchRepairs() {
      const { data, error } = await supabase
        .from("repairs")
        .select("*")
        .order("last_updated", { ascending: false });
      if (error) {
        console.error("Error fetching repairs:", error);
        setLoading(false);
        return;
      }
      if (data) {
        setRepairs(data);
        setLastUpdate(data.length ? data[0].last_updated : "");
      }
      setLoading(false);
    }
    fetchRepairs();
  }, []);

  // Handlers for New Entry Form
  const handleNewEntryChange = (field: keyof typeof newEntry, value: any) => {
    setNewEntry((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const { data, error } = await supabase
      .from("repairs")
      .insert([{ ...newEntry, last_updated: new Date().toISOString() }])
      .select();
    if (error) {
      console.error("Error adding repair:", error);
      return;
    }
    if (data && data.length > 0) {
      const entry: RepairEntry = data[0];
      setRepairs((prev) => [...prev, entry]);
      setLastUpdate(entry.last_updated);
    }
    // Reset the new entry fields.
    setNewEntry({
      status: "",
      date: new Date().toISOString().slice(0, 10),
      cut_number: "",
      customer: "",
      style: "",
      color: "",
      qty_repairs: 0,
      seconds: 0,
      total_repaired: 0,
      operators: "",
    });
  };

  // Delete a record
  const handleDelete = async (id: number) => {
    const confirmDelete = confirm("Are you sure you want to delete this record?");
    if (!confirmDelete) return;
    const { error } = await supabase.from("repairs").delete().eq("id", id);
    if (error) {
      console.error("Error deleting record:", error);
      return;
    }
    setRepairs((prev) => prev.filter((r) => r.id !== id));
  };

  // Save the change of an individual cell on blur or Enter key
const saveEditingCell = async () => {
  if (!editingCell) return;
  const { rowId, field } = editingCell;
  let updatedValue: any = editingValue;
  if (field === "qty_repairs" || field === "seconds" || field === "total_repaired") {
    updatedValue = Number(editingValue);
  }
  // Update Supabase with the updated value for this field:
  const { error } = await supabase
    .from("repairs")
    .update({ [field]: updatedValue, last_updated: new Date().toISOString() })
    .eq("id", rowId);
  if (error) {
    console.error("Error saving cell:", error);
    return;
  }
  setRepairs((prev) =>
    prev.map((r) =>
      r.id === rowId
        ? { ...r, [field]: updatedValue, last_updated: new Date().toISOString(), balance: r.qty_repairs - r.total_repaired }
        : r
    )
  );
  setLastUpdate(new Date().toISOString());
  setEditingCell(null);
  setEditingValue("");
};

  // Cancel editing without saving
  const cancelEditingCell = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  // Format last updated date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  };

  // Utility: determine input type based on field
  const getInputType = (field: keyof RepairEntry): string => {
    if (field === "date") return "date";
    if (field === "qty_repairs" || field === "seconds" || field === "total_repaired") return "number";
    return "text";
  };

  if (loading) return <div>Loading repairs...</div>;

  // Styling for the container "card", header, form, table, etc.
  const containerStyle: React.CSSProperties = {
    backgroundColor: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    padding: "30px",
    width: "95%",
    //maxWidth: "1200px",
    margin: "20px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  };

  const headerStyle: React.CSSProperties = {
    fontSize: "32px",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: "20px",
  };

  const lastUpdateStyle: React.CSSProperties = {
    textAlign: "right",
    fontSize: "14px",
    marginBottom: "20px",
  };

  const formStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "20px",
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "10px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  };

  const tableWrapperStyle: React.CSSProperties = {
    overflowX: "auto",
    marginBottom: "20px",
  };

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
  };

  const thStyle: React.CSSProperties = {
    padding: "10px",
    background: "#4CAF50",
    color: "white",
    textAlign: "left",
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px",
    borderBottom: "1px solid #ddd",
    textAlign: "left",
    cursor: "pointer",
  };

  const formatDateDMY = (dateStr: string): string => {
  // Ensure we only work with the first 10 characters, then split and reassemble
  return dateStr.slice(0, 10).split("-").reverse().join("-");
};

  return (
    <div style={containerStyle}>
      <h1 style={headerStyle}>Repairs Report</h1>
      <div style={lastUpdateStyle}>
        <strong>Last Update:</strong> {lastUpdate ? formatDate(lastUpdate) : "Never"}
      </div>

      {/* New Entry Form */}
      <div style={formStyle}>
        <input
          type="text"
          placeholder="Status"
          value={newEntry.status}
          onChange={(e) => handleNewEntryChange("status", e.target.value)}
          style={inputStyle}
        />
        <input
          type="date"
          value={newEntry.date}
          onChange={(e) => handleNewEntryChange("date", e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Cut #"
          value={newEntry.cut_number}
          onChange={(e) => handleNewEntryChange("cut_number", e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Customer"
          value={newEntry.customer}
          onChange={(e) => handleNewEntryChange("customer", e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Style"
          value={newEntry.style}
          onChange={(e) => handleNewEntryChange("style", e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Color"
          value={newEntry.color}
          onChange={(e) => handleNewEntryChange("color", e.target.value)}
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="Qty Repairs"
          value={newEntry.qty_repairs}
          onChange={(e) => handleNewEntryChange("qty_repairs", parseInt(e.target.value))}
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="Seconds"
          value={newEntry.seconds}
          onChange={(e) => handleNewEntryChange("seconds", parseInt(e.target.value))}
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="Total Repaired"
          value={newEntry.total_repaired}
          onChange={(e) => handleNewEntryChange("total_repaired", parseInt(e.target.value))}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Operators"
          value={newEntry.operators}
          onChange={(e) => handleNewEntryChange("operators", e.target.value)}
          style={inputStyle}
        />
        <button onClick={handleSubmit} style={buttonStyle}>
          Add Repair
        </button>
      </div>

      {/* Repairs Table */}
      <div style={tableWrapperStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Cut #</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Style</th>
              <th style={thStyle}>Color</th>
              <th style={thStyle}>Qty Repairs</th>
              <th style={thStyle}>Seconds</th>
              <th style={thStyle}>Total Repaired</th>
              <th style={thStyle}>Balance</th>
              <th style={thStyle}>Operators</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {repairs.map((entry) => (
              <tr key={entry.id}>
                {/* For each editable cell, if it’s the one currently being edited, show an input */}
                <td
                  style={tdStyle}
                  onClick={() => {
                    if (!editingCell) {
                      setEditingCell({ rowId: entry.id, field: "status" });
                      setEditingValue(entry.status);
                    }
                  }}
                >
                  {editingCell?.rowId === entry.id && editingCell.field === "status" ? (
                    <input
                      autoFocus
                      type={getInputType("status")}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={saveEditingCell}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditingCell();
                      }}
                      style={inputStyle}
                    />
                  ) : (
                    <span>{entry.status}</span>
                  )}
                </td>
                    <td
                    style={tdStyle}
                    onClick={() => {
                        if (!editingCell) {
                        // Use only the first 10 characters to avoid time zone conversion.
                        setEditingCell({ rowId: entry.id, field: "date" });
                        setEditingValue(entry.date.slice(0, 10));
                        }
                    }}
                    >
                    {editingCell?.rowId === entry.id && editingCell.field === "date" ? (
                        <input
                        autoFocus
                        type="date"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={saveEditingCell}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") saveEditingCell();
                        }}
                        style={inputStyle}
                        />
                    ) : (
                        // Display only the date part so it shows exactly “YYYY-MM-DD”
                        <span>{formatDateDMY(entry.date)}</span>
                    )}
                    </td>
                <td
                  style={tdStyle}
                  onClick={() => {
                    if (!editingCell) {
                      setEditingCell({ rowId: entry.id, field: "cut_number" });
                      setEditingValue(entry.cut_number);
                    }
                  }}
                >
                  {editingCell?.rowId === entry.id && editingCell.field === "cut_number" ? (
                    <input
                      autoFocus
                      type={getInputType("cut_number")}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={saveEditingCell}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditingCell();
                      }}
                      style={inputStyle}
                    />
                  ) : (
                    <span>{entry.cut_number}</span>
                  )}
                </td>
                <td
                  style={tdStyle}
                  onClick={() => {
                    if (!editingCell) {
                      setEditingCell({ rowId: entry.id, field: "customer" });
                      setEditingValue(entry.customer);
                    }
                  }}
                >
                  {editingCell?.rowId === entry.id && editingCell.field === "customer" ? (
                    <input
                      autoFocus
                      type={getInputType("customer")}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={saveEditingCell}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditingCell();
                      }}
                      style={inputStyle}
                    />
                  ) : (
                    <span>{entry.customer}</span>
                  )}
                </td>
                <td
                  style={tdStyle}
                  onClick={() => {
                    if (!editingCell) {
                      setEditingCell({ rowId: entry.id, field: "style" });
                      setEditingValue(entry.style);
                    }
                  }}
                >
                  {editingCell?.rowId === entry.id && editingCell.field === "style" ? (
                    <input
                      autoFocus
                      type={getInputType("style")}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={saveEditingCell}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditingCell();
                      }}
                      style={inputStyle}
                    />
                  ) : (
                    <span>{entry.style}</span>
                  )}
                </td>
                <td
                  style={tdStyle}
                  onClick={() => {
                    if (!editingCell) {
                      setEditingCell({ rowId: entry.id, field: "color" });
                      setEditingValue(entry.color);
                    }
                  }}
                >
                  {editingCell?.rowId === entry.id && editingCell.field === "color" ? (
                    <input
                      autoFocus
                      type={getInputType("color")}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={saveEditingCell}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditingCell();
                      }}
                      style={inputStyle}
                    />
                  ) : (
                    <span>{entry.color}</span>
                  )}
                </td>
                <td
                  style={tdStyle}
                  onClick={() => {
                    if (!editingCell) {
                      setEditingCell({ rowId: entry.id, field: "qty_repairs" });
                      setEditingValue(entry.qty_repairs.toString());
                    }
                  }}
                >
                  {editingCell?.rowId === entry.id && editingCell.field === "qty_repairs" ? (
                    <input
                      autoFocus
                      type={getInputType("qty_repairs")}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={saveEditingCell}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditingCell();
                      }}
                      style={inputStyle}
                    />
                  ) : (
                    <span>{entry.qty_repairs}</span>
                  )}
                </td>
                <td
                  style={tdStyle}
                  onClick={() => {
                    if (!editingCell) {
                      setEditingCell({ rowId: entry.id, field: "seconds" });
                      setEditingValue(entry.seconds.toString());
                    }
                  }}
                >
                  {editingCell?.rowId === entry.id && editingCell.field === "seconds" ? (
                    <input
                      autoFocus
                      type={getInputType("seconds")}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={saveEditingCell}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditingCell();
                      }}
                      style={inputStyle}
                    />
                  ) : (
                    <span>{entry.seconds}</span>
                  )}
                </td>
                <td
                  style={tdStyle}
                  onClick={() => {
                    if (!editingCell) {
                      setEditingCell({ rowId: entry.id, field: "total_repaired" });
                      setEditingValue(entry.total_repaired.toString());
                    }
                  }}
                >
                  {editingCell?.rowId === entry.id && editingCell.field === "total_repaired" ? (
                    <input
                      autoFocus
                      type={getInputType("total_repaired")}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={saveEditingCell}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditingCell();
                      }}
                      style={inputStyle}
                    />
                  ) : (
                    <span>{entry.total_repaired}</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <span>{entry.qty_repairs - entry.total_repaired}</span>
                </td>
                <td
                  style={tdStyle}
                  onClick={() => {
                    if (!editingCell) {
                      setEditingCell({ rowId: entry.id, field: "operators" });
                      setEditingValue(entry.operators);
                    }
                  }}
                >
                  {editingCell?.rowId === entry.id && editingCell.field === "operators" ? (
                    <input
                      autoFocus
                      type={getInputType("operators")}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={saveEditingCell}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditingCell();
                      }}
                      style={inputStyle}
                    />
                  ) : (
                    <span>{entry.operators}</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <button onClick={() => handleDelete(entry.id)} style={{ ...buttonStyle, backgroundColor: "#f44336" }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
