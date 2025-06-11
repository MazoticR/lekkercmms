"use client";
import { useEffect, useState } from "react";

//––––– API response interfaces –––––//
interface OrderItem {
  id: string;
  style_number: string;
  description: string;
  attr_2: string; // Color
  unit_price: string;
  amount: string;
  qty: string;
  size: string;
  project_id: string | null; // used for "Cut #"
}

interface Order {
  order_id: string;
  account_number: string; // using this field for Account
  customer_name: string;
  customer_po: string | null;
  date_due: string | null; // CancelDate
  division_id: string;
  total_amount: string;
  order_items: OrderItem[];
}

//––––– Intermediate aggregated row –––––//
interface FlattenedRow {
  order_id: string;
  account_number: string;
  customer_name: string;
  customer_po: string | null;
  date_due: string | null;
  division_id: string;
  style_number: string;
  description: string;
  color: string; // from attr_2
  unit_price: string;
  cut: string; // from project_id (or "N/A")
  total_qty: number;
  sizeDetails: Record<string, number>;
  sumAmount: number; // Sum of amounts for this group
}

//––––– Final row after splitting into Standard vs. Other –––––//
interface FinalRow extends FlattenedRow {
  breakdown: "Standard" | "Other";
}

//––––– STYLE OBJECTS –––––//
const containerStyle: React.CSSProperties = {
  padding: "20px",
  maxWidth: "90%",
  margin: "20px auto",
  backgroundColor: "#f9f9f9",
  borderRadius: "8px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
};

const tableContainerStyle: React.CSSProperties = {
  overflowX: "auto",
  marginBottom: "30px",
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  padding: "12px 15px",
  backgroundColor: "#4CAF50",
  color: "white",
  borderBottom: "2px solid #ddd",
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 15px",
  borderBottom: "1px solid #ddd",
  textAlign: "left",
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#4CAF50",
  color: "white",
  border: "none",
  padding: "10px 15px",
  borderRadius: "4px",
  cursor: "pointer",
  marginBottom: "10px",
};

const inputStyle: React.CSSProperties = {
  padding: "8px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  marginRight: "15px",
  width: "250px",
};

//––––– UTILITY FUNCTION: EXPORT TABLE TO CSV –––––//
function exportTableToCSV(tableId: string, filename: string) {
  const table = document.getElementById(tableId);
  if (!table) return;
  let csv = "";
  const rows = table.querySelectorAll("tr");
  rows.forEach((row) => {
    const rowData: string[] = [];
    row.querySelectorAll("th, td").forEach((cell) => {
      let text = cell.textContent || "";
      text = text.replace(/"/g, '""');
      rowData.push(`"${text}"`);
    });
    csv += rowData.join(",") + "\n";
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

//––––– COMPONENT –––––//
export default function OpenOrdersTable() {
  const [rows, setRows] = useState<FinalRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  // Default Secura division ("2"); Development is now "4".
  const [selectedDivision, setSelectedDivision] = useState<string>("2");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // States for editable fields.
  const [lineNotes, setLineNotes] = useState<Record<string, string>>({});
  const [travCutDates, setTravCutDates] = useState<Record<string, string>>({});
  const [travAllDates, setTravAllDates] = useState<Record<string, string>>({});

  // Hard-coded token.
  const API_TOKEN = "6002f37a06cc09759259a7c5eabff471";

  // Define the canonical order and mapping for standard sizes.
  const standardSizeOrder = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
  // For any reported standard size (including variants), use this mapping:
  const standardMapping: Record<string, number> = {
    "XXS": 0,
    "XS": 1,
    "S": 2,
    "SM": 2,      // treat SM as S
    "M": 3,
    "L": 4,
    "XL": 5,
    "2XL": 6,
    "XXL": 6,     // treat XXL as 2XL
    "3XL": 7,
    "XXXL": 7,    // treat XXXL as 3XL
    "4XL": 8,
    "XXXXL": 8,   // treat XXXXL as 4XL
  };

  const getCanonicalStandard = (size: string): string => {
    if (standardMapping[size] !== undefined) {
      return standardSizeOrder[standardMapping[size]];
    }
    return size;
  };

  // Fixed order for the Other sizes breakdown.
  const otherSizeOrder = ["XS/S", "S/M", "M/L", "L/XL"];

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError("");
      try {
        const time = Math.floor(Date.now() / 1000);
        const params = new URLSearchParams();
        params.append("token", API_TOKEN);
        params.append("time", time.toString());
        // Only fetch orders with qty_open > 0.
        params.append("parameters[0][field]", "qty_open");
        params.append("parameters[0][operator]", ">");
        params.append("parameters[0][value]", "0");

        const res = await fetch(`/api/proxy/orders?${params.toString()}`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(`API Error: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        const orders: Order[] = data.response;

        let flattenedRows: FlattenedRow[] = [];

        orders.forEach((order) => {
          const groups = new Map<string, FlattenedRow>();
          order.order_items.forEach((item) => {
            const normalizedSize = item.size.trim().toUpperCase();
            const key = `${order.order_id}|${item.style_number}|${item.project_id || "N/A"}`;
            if (!groups.has(key)) {
              groups.set(key, {
                order_id: order.order_id,
                account_number: order.account_number || "N/A",
                customer_name: order.customer_name,
                customer_po: order.customer_po,
                date_due: order.date_due || "N/A",
                division_id: order.division_id,
                style_number: item.style_number,
                description: item.description,
                color: item.attr_2,
                unit_price: item.unit_price,
                cut: item.project_id || "N/A",
                total_qty: 0,
                sizeDetails: {},
                sumAmount: 0,
              });
            }
            const row = groups.get(key)!;
            const qty = parseFloat(item.qty) || 0;
            row.total_qty += qty;
            row.sizeDetails[normalizedSize] = (row.sizeDetails[normalizedSize] || 0) + qty;
            const amt = parseFloat(item.amount) || 0;
            row.sumAmount += amt;
          });
          flattenedRows.push(...groups.values());
        });

        // Filter out groups that contain the size "SERVICE".
        flattenedRows = flattenedRows.filter(
          (row) => !Object.keys(row.sizeDetails).some((size) => size === "SERVICE")
        );

        // Split each aggregated row into two rows:
        // • Standard: sizes that can be mapped into our canonical standard set.
        // • Other: sizes not in our mapping.
        const finalRows: FinalRow[] = [];
        flattenedRows.forEach((row) => {
          const standardSizes: Record<string, number> = {};
          const otherSizes: Record<string, number> = {};

          Object.entries(row.sizeDetails).forEach(([size, qty]) => {
            if (standardMapping[size] !== undefined) {
              const canonical = getCanonicalStandard(size);
              standardSizes[canonical] = (standardSizes[canonical] || 0) + qty;
            } else {
              otherSizes[size] = (otherSizes[size] || 0) + qty;
            }
          });
          if (Object.keys(standardSizes).length > 0) {
            const totalStandard = Object.values(standardSizes).reduce((a, b) => a + b, 0);
            finalRows.push({
              ...row,
              breakdown: "Standard",
              total_qty: totalStandard,
              sizeDetails: standardSizes,
            });
          }
          if (Object.keys(otherSizes).length > 0) {
            const totalOther = Object.values(otherSizes).reduce((a, b) => a + b, 0);
            finalRows.push({
              ...row,
              breakdown: "Other",
              total_qty: totalOther,
              sizeDetails: otherSizes,
            });
          }
        });

        setRows(finalRows);
      } catch (e) {
        console.error("Error fetching orders:", e);
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [API_TOKEN]);

  // Filter by selected division.
  let filteredRows = rows.filter((row) => row.division_id === selectedDivision);

  // Apply search filter.
  if (searchTerm.trim() !== "") {
    const term = searchTerm.trim().toLowerCase();
    filteredRows = filteredRows.filter(
      (row) =>
        row.account_number.toLowerCase().includes(term) ||
        row.order_id.toLowerCase().includes(term) ||
        row.customer_name.toLowerCase().includes(term) ||
        row.style_number.toLowerCase().includes(term)
    );
  }

  // Split filtered rows into Standard and Other.
  const standardRows = filteredRows.filter((r) => r.breakdown === "Standard");
  const otherRows = filteredRows.filter((r) => r.breakdown === "Other");

  // For the Standard table, use the fixed canonical order.
  const standardSizesColumns = standardSizeOrder.filter((size) =>
    standardRows.some((row) => row.sizeDetails[size] !== undefined)
  );
  // For the Other table, use our fixed order.
  const otherSizesColumns = otherSizeOrder.filter((size) =>
    otherRows.some((row) => row.sizeDetails[size] !== undefined)
  );

  // Generate a unique key for each row.
  const rowKey = (row: FinalRow, idx: number) =>
    `${row.order_id}-${row.style_number}-${row.cut}-${row.breakdown}-${idx}`;

  // Handlers for editable fields.
  const handleLineNoteChange = (key: string, value: string) =>
    setLineNotes((prev) => ({ ...prev, [key]: value }));
  const handleTravCutChange = (key: string, value: string) =>
    setTravCutDates((prev) => ({ ...prev, [key]: value }));
  const handleTravAllChange = (key: string, value: string) =>
    setTravAllDates((prev) => ({ ...prev, [key]: value }));

  // Render the fixed table header.
  const renderTableHeader = (sizeColumns: string[]) => (
    <tr>
      <th style={thStyle}>Account</th>
      <th style={thStyle}>Customer Name</th>
      <th style={thStyle}>Order</th>
      <th style={thStyle}>CustomerPO</th>
      <th style={thStyle}>Style</th>
      <th style={thStyle}>Description</th>
      <th style={thStyle}>TotalQty</th>
      <th style={thStyle}>Color</th>
      <th style={thStyle}>CancelDate</th>
      <th style={thStyle}>Cut #</th>
      <th style={thStyle}>Linenote</th>
      <th style={thStyle}>TravCut</th>
      <th style={thStyle}>TravAll</th>
      {sizeColumns.map((size) => (
        <th key={size} style={thStyle}>
          Size {size}
        </th>
      ))}
      <th style={thStyle}>UnitPrice</th>
      <th style={thStyle}>TotalAmount</th>
    </tr>
  );

  if (loading)
    return <div style={{ padding: "20px" }}>Loading open orders...</div>;
  if (error)
    return <div style={{ padding: "20px", color: "red" }}>Error: {error}</div>;

  return (
    <div style={containerStyle}>
      {/* Division Toggle and Search Bar */}
      <div style={{ marginBottom: "20px", display: "flex", alignItems: "center" }}>
        <div style={{ marginRight: "25px" }}>
          <label style={{ marginRight: "15px" }}>
            <input
              type="radio"
              value="2"
              checked={selectedDivision === "2"}
              onChange={(e) => setSelectedDivision(e.target.value)}
            />{" "}
            Secura (Division #2)
          </label>
          <label>
            <input
              type="radio"
              value="4"
              checked={selectedDivision === "4"}
              onChange={(e) => setSelectedDivision(e.target.value)}
            />{" "}
            Development (Division #4)
          </label>
        </div>
        <div>
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>
        Open Orders Details (Division #{selectedDivision})
      </h1>

      {/* Standard Sizes Breakdown */}
      {standardRows.length > 0 && (
        <>
          <h2 style={{ marginBottom: "10px" }}>Standard Sizes Breakdown</h2>
          <button style={buttonStyle} onClick={() => exportTableToCSV("standardTable", "Standard_Sizes_Breakdown.csv")}>
            Export to Excel
          </button>
          <div style={tableContainerStyle}>
            <table id="standardTable" style={tableStyle}>
              <thead>{renderTableHeader(standardSizesColumns)}</thead>
              <tbody>
                {standardRows.map((row, idx) => {
                  const key = rowKey(row, idx);
                  return (
                    <tr key={key} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f1f1f1" }}>
                      <td style={tdStyle}>{row.account_number || "N/A"}</td>
                      <td style={tdStyle}>{row.customer_name}</td>
                      <td style={tdStyle}>{row.order_id}</td>
                      <td style={tdStyle}>{row.customer_po || "N/A"}</td>
                      <td style={tdStyle}>{row.style_number}</td>
                      <td style={tdStyle}>{row.description}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{row.total_qty}</td>
                      <td style={tdStyle}>{row.color}</td>
                      <td style={tdStyle}>{row.date_due}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{row.cut}</td>
                      <td style={tdStyle}>
                        <select
                          value={lineNotes[key] || ""}
                          onChange={(e) => handleLineNoteChange(key, e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="Option 1">Option 1</option>
                          <option value="Option 2">Option 2</option>
                          <option value="Option 3">Option 3</option>
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="date"
                          value={travCutDates[key] || ""}
                          onChange={(e) => handleTravCutChange(key, e.target.value)}
                          style={{ padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="date"
                          value={travAllDates[key] || ""}
                          onChange={(e) => handleTravAllChange(key, e.target.value)}
                          style={{ padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }}
                        />
                      </td>
                      {standardSizesColumns.map((size) => (
                        <td key={size} style={{ ...tdStyle, textAlign: "right" }}>
                          {row.sizeDetails[size] !== undefined ? row.sizeDetails[size] : ""}
                        </td>
                      ))}
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        {"$" + row.unit_price}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        {"$" + row.sumAmount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Other Sizes Breakdown */}
      {otherRows.length > 0 && (
        <>
          <h2 style={{ marginBottom: "10px" }}>Other Sizes Breakdown</h2>
          <button style={buttonStyle} onClick={() => exportTableToCSV("otherTable", "Other_Sizes_Breakdown.csv")}>
            Export to Excel
          </button>
          <div style={tableContainerStyle}>
            <table id="otherTable" style={tableStyle}>
              <thead>{renderTableHeader(otherSizesColumns)}</thead>
              <tbody>
                {otherRows.map((row, idx) => {
                  const key = rowKey(row, idx);
                  return (
                    <tr key={key} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f1f1f1" }}>
                      <td style={tdStyle}>{row.account_number || "N/A"}</td>
                      <td style={tdStyle}>{row.customer_name}</td>
                      <td style={tdStyle}>{row.order_id}</td>
                      <td style={tdStyle}>{row.customer_po || "N/A"}</td>
                      <td style={tdStyle}>{row.style_number}</td>
                      <td style={tdStyle}>{row.description}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{row.total_qty}</td>
                      <td style={tdStyle}>{row.color}</td>
                      <td style={tdStyle}>{row.date_due}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{row.cut}</td>
                      <td style={tdStyle}>
                        <select
                          value={lineNotes[key] || ""}
                          onChange={(e) => handleLineNoteChange(key, e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="Option 1">Option 1</option>
                          <option value="Option 2">Option 2</option>
                          <option value="Option 3">Option 3</option>
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="date"
                          value={travCutDates[key] || ""}
                          onChange={(e) => handleTravCutChange(key, e.target.value)}
                          style={{ padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="date"
                          value={travAllDates[key] || ""}
                          onChange={(e) => handleTravAllChange(key, e.target.value)}
                          style={{ padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }}
                        />
                      </td>
                      {otherSizesColumns.map((size) => (
                        <td key={size} style={{ ...tdStyle, textAlign: "right" }}>
                          {row.sizeDetails[size] !== undefined ? row.sizeDetails[size] : ""}
                        </td>
                      ))}
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        {"$" + row.unit_price}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        {"$" + row.sumAmount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// Utility function to export a table as CSV.
/*function exportTableToCSV(tableId: string, filename: string) {
  const table = document.getElementById(tableId);
  if (!table) return;
  let csv = "";
  const rows = table.querySelectorAll("tr");
  rows.forEach((row) => {
    const rowData: string[] = [];
    row.querySelectorAll("th, td").forEach((cell) => {
      let text = cell.textContent || "";
      text = text.replace(/"/g, '""');
      rowData.push(`"${text}"`);
    });
    csv += rowData.join(",") + "\n";
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}*/
