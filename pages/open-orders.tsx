"use client";
import { useEffect, useState } from "react";
import  supabase  from "../lib/supabaseClient"; // ensure this points to your Supabase client
import Head from 'next/head';

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
  client: string;
  libertad_po: string;
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
  client: string;
  libertad_po: string;
}

//––––– Final row after splitting into Standard vs. Other –––––//
interface FinalRow extends FlattenedRow {
  breakdown: "Standard" | "Other";
}

//––––– STYLE OBJECTS (Prettier styling) –––––//
const containerStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  borderRadius: "12px",
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
  padding: "30px",
  width: "95%",     // wider layout
  maxWidth: "none",
  margin: "20px auto",
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
};

const headerStyle: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "30px",
  fontSize: "28px",
  color: "#333",
};

const controlsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "20px",
};

const toggleStyle: React.CSSProperties = {
  display: "flex",
  gap: "15px",
};

const inputStyle: React.CSSProperties = {
  padding: "8px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  width: "250px",
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#4CAF50",
  color: "#fff",
  border: "none",
  padding: "10px 15px",
  borderRadius: "6px",
  cursor: "pointer",
  marginBottom: "10px",
};

const tableContainerStyle: React.CSSProperties = {
  overflowX: "auto",
  marginBottom: "30px",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  padding: "12px 15px",
  background: "linear-gradient(90deg, #4CAF50, #45A049)",
  color: "#fff",
  borderBottom: "2px solid #ddd",
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 15px",
  borderBottom: "1px solid #ddd",
  textAlign: "left",
};

//––––– Helper to generate a composite key –––––//
// We'll use order_id, style_number, cut and color to uniquely identify an order row.
const generateOrderKey = (row: FinalRow): string =>
  `${row.order_id}-${row.style_number}-${row.cut}-${row.color}`;

//––––– Canonical Sizes Setup –––––//
const standardSizeOrder = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
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

const otherSizeOrder = ["XS/S", "S/M", "M/L", "L/XL"];

//––––– COMPONENT –––––//
export default function OpenOrdersTable() {
  const [rows, setRows] = useState<FinalRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  // Default Secura is Division "2"; Development uses "4".
  const [selectedDivision, setSelectedDivision] = useState<string>("2");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // States for the persisted override fields.
  const [lineNotes, setLineNotes] = useState<Record<string, string>>({});
  const [travCutDates, setTravCutDates] = useState<Record<string, string>>({});
  const [travAllDates, setTravAllDates] = useState<Record<string, string>>({});
  const [searchField, setSearchField] = useState<keyof FinalRow>("order_id"); // Ensures only valid keys are used



  const API_TOKEN = "6002f37a06cc09759259a7c5eabff471";

  //––––– FETCH ORDERS & AGGREGATE DATA –––––//
  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError("");
      try {
        const time = Math.floor(Date.now() / 1000);
        const params = new URLSearchParams();
        params.append("token", API_TOKEN);
        params.append("time", time.toString());
        // Only orders with qty_open > 0.
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
            const key = `${order.order_id}|${item.style_number}|${item.project_id || "N/A"}|${item.attr_2}`;
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
                client: order.client || "N/A", // Capture Client
                libertad_po: order.libertad_po || "N/A", // Capture Libertad PO
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

        // Remove groups that contain a "SERVICE" size.
        flattenedRows = flattenedRows.filter(
          (row) => !Object.keys(row.sizeDetails).some((size) => size === "SERVICE")
        );

        // Split rows into Standard and Other based on our mapping.
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

  //––––– FETCH SUPABASE OVERRIDES –––––//
  // Once our rows have loaded, we can fetch persisted override values from Supabase.
  useEffect(() => {
    async function fetchOverrides() {
      if (rows.length === 0) return;
      // Build an array of composite keys for all visible rows.
      const keys = rows.map((row) => generateOrderKey(row));
      const { data, error } = await supabase
        .from("order_field_overrides")
        .select("*")
        .in("order_key", keys);
      if (error) {
        console.error("Error fetching overrides:", error);
      } else if (data) {
        // data is an array of records; update states accordingly.
        const ln: Record<string, string> = {};
        const tc: Record<string, string> = {};
        const ta: Record<string, string> = {};
        data.forEach((record: any) => {
          ln[record.order_key] = record.linenote || "";
          tc[record.order_key] = record.trav_cut || "";
          ta[record.order_key] = record.trav_all || "";
        });
        setLineNotes(ln);
        setTravCutDates(tc);
        setTravAllDates(ta);
      }
    }
    fetchOverrides();
  }, [rows]);

  //––––– FILTERING –––––//
  let filteredRows = rows.filter((row) => row.division_id === selectedDivision);
        if (searchTerm.trim() !== "") {
          const term = searchTerm.trim().toLowerCase();
          filteredRows = filteredRows.filter((row) => {
            if (searchField === "customer_name") {
              return row.customer_name.toLowerCase().includes(term) || row.client.toLowerCase().includes(term);
            }
            const value = row[searchField as keyof FinalRow];
            return value && value.toString().toLowerCase().includes(term);
          });
        }

  const standardRows = filteredRows.filter((r) => r.breakdown === "Standard");
  const otherRows = filteredRows.filter((r) => r.breakdown === "Other");

  // Use the fixed orders for columns.
  const standardSizesColumns = standardSizeOrder.filter((size) =>
    standardRows.some((row) => row.sizeDetails[size] !== undefined)
  );
  const otherSizesColumns = otherSizeOrder.filter((size) =>
    otherRows.some((row) => row.sizeDetails[size] !== undefined)
  );

  const rowKey = (row: FinalRow, idx: number) =>
    `${row.order_id}-${row.style_number}-${row.cut}-${row.breakdown}-${idx}`;

  //––––– SUPABASE UPDATING FUNCTIONS –––––//
  const updateOverride = async (
    key: string,
    newData: { linenote?: string; trav_cut?: string; trav_all?: string }
  ) => {
    const { error } = await supabase
      .from("order_field_overrides")
      .upsert({
        order_key: key,
        ...newData,
      });
    if (error) {
      console.error("Error updating override:", error);
    }
  };

  const handleLineNoteChange = (key: string, value: string) => {
    setLineNotes((prev) => ({ ...prev, [key]: value }));
    updateOverride(key, { linenote: value });
  };

  const handleTravCutChange = (key: string, value: string) => {
    setTravCutDates((prev) => ({ ...prev, [key]: value }));
    updateOverride(key, { trav_cut: value });
  };

  const handleTravAllChange = (key: string, value: string) => {
    setTravAllDates((prev) => ({ ...prev, [key]: value }));
    updateOverride(key, { trav_all: value });
  };

  //––––– RENDER TABLE HEADER –––––//
  const renderTableHeader = (sizeColumns: string[]) => (
    <tr>
      <th style={thStyle}>Account</th>
      <th style={thStyle}>Customer Name</th>
      <th style={thStyle}>CustomerPO</th>
      <th style={thStyle}>Client</th>
      <th style={thStyle}>Libertad PO</th>
      <th style={thStyle}>Order</th>
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

      <Head>
      <title>Open Orders</title>

      </Head>
      {/* Division Toggle + Search */}
      <div style={controlsStyle}>
        <div style={toggleStyle}>
          <label>
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
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <select 
                value={searchField} 
                onChange={(e) => setSearchField(e.target.value as keyof FinalRow)}
                style={{ padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }}
            >
                <option value="order_id">Order ID</option>
                <option value="customer_name">Customer Name</option>
                <option value="style_number">Style</option>
                <option value="color">Color</option>
                <option value="cut">Cut</option>
            </select>

            <input
                type="text"
                placeholder={`Search by ${searchField.replace("_", " ")}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", width: "250px" }}
            />
            </div>
      </div>
      <h1 style={headerStyle}>Open Orders Details (Division #{selectedDivision})</h1>

      {/* Standard Sizes Breakdown */}
      {standardRows.length > 0 && (
        <>
          <h2 style={{ marginBottom: "10px", color: "#333" }}>Standard Sizes Breakdown</h2>
          <button style={buttonStyle} onClick={() => exportTableToCSV("standardTable", "Standard_Sizes_Breakdown.csv")}>
            Export to Excel
          </button>
          <div style={tableContainerStyle}>
            <table id="standardTable" style={tableStyle}>
              <thead>{renderTableHeader(standardSizesColumns)}</thead>
              <tbody>
                {standardRows.map((row, idx) => {
                  const key = generateOrderKey(row);
                  return (
                    <tr key={rowKey(row, idx)} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9f9f9" }}>
                      <td style={tdStyle}>{row.account_number || "N/A"}</td>
                      <td style={tdStyle}>{row.customer_name}</td>
                      <td style={tdStyle}>{row.customer_po || "N/A"}</td>
                      <td style={tdStyle}>{row.client || "N/A"}</td>
                      <td style={tdStyle}>{row.libertad_po || "N/A"}</td>
                      <td style={tdStyle}>{row.order_id}</td>              
                      <td style={tdStyle}>{row.style_number}</td>
                      <td style={tdStyle}>{row.description}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{row.total_qty}</td>
                      <td style={tdStyle}>{row.color}</td>
                      <td style={tdStyle}>{row.date_due}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{row.cut}</td>
                      <td style={tdStyle}>
                        <select value={lineNotes[key] || ""} onChange={(e) => handleLineNoteChange(key, e.target.value)}>
                          <option value="">Select</option>
                          <option value="New Order">New Order</option>
                          <option value="Fabric">Fabric</option>
                          <option value="Development">Development</option>
                          <option value="Cut">Cut</option>
                          <option value="Ready to receive">Ready to receive</option>
                          <option value="Bundling">Bundling</option>
                          <option value="Sewing">Sewing</option>
                          <option value="Staging">Staging</option>
                          <option value="Dye">Dye</option>
                          <option value="Screenprinting">Screenprinting</option>
                          <option value="Neckprint">Neckprint</option>
                          <option value="Packaging">Packaging</option>
                          <option value="Shipped">Shipped</option>
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
                      <td style={{ ...tdStyle, textAlign: "right" }}>{"$" + row.unit_price}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{"$" + row.sumAmount.toFixed(2)}</td>
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
          <h2 style={{ marginBottom: "10px", color: "#333" }}>Other Sizes Breakdown</h2>
          <button style={buttonStyle} onClick={() => exportTableToCSV("otherTable", "Other_Sizes_Breakdown.csv")}>
            Export to Excel
          </button>
          <div style={tableContainerStyle}>
            <table id="otherTable" style={tableStyle}>
              <thead>{renderTableHeader(otherSizesColumns)}</thead>
              <tbody>
                {otherRows.map((row, idx) => {
                  const key = generateOrderKey(row);
                  return (
                    <tr key={rowKey(row, idx)} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9f9f9" }}>
                      <td style={tdStyle}>{row.account_number || "N/A"}</td>
                      <td style={tdStyle}>{row.customer_name}</td>
                      <td style={tdStyle}>{row.customer_po || "N/A"}</td>
                      <td style={tdStyle}>{row.client || "N/A"}</td>
                      <td style={tdStyle}>{row.libertad_po || "N/A"}</td>
                      <td style={tdStyle}>{row.order_id}</td> 
                      <td style={tdStyle}>{row.style_number}</td>
                      <td style={tdStyle}>{row.description}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{row.total_qty}</td>
                      <td style={tdStyle}>{row.color}</td>
                      <td style={tdStyle}>{row.date_due}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{row.cut}</td>
                      <td style={tdStyle}>
                        <select value={lineNotes[key] || ""} onChange={(e) => handleLineNoteChange(key, e.target.value)}>
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
                      <td style={{ ...tdStyle, textAlign: "right" }}>{"$" + row.unit_price}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{"$" + row.sumAmount.toFixed(2)}</td>
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

//––––– Utility function to export a table as CSV –––––//
function exportTableToCSV(tableId: string, filename: string) {
  const table = document.getElementById(tableId);
  if (!table) return;
  let csv = "";
  const rows = table.querySelectorAll("tr");
  rows.forEach((row) => {
    const rowData: string[] = [];
    row.querySelectorAll("th, td").forEach((cell) => {
      let text = "";
        const selectElement = cell.querySelector("select");
        if (selectElement) {
          text = selectElement.value; // Get only the selected value, not all options
        } else {
          text = cell.textContent || "";
        }
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
