"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import supabase from "../../lib/supabaseClient"; // using default export
import { getCurrentUser, hasPermission } from "../../lib/auth";

// ------------------------
// Custom hook for debouncing a function call
function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number) {
  const timer = useRef<number | null>(null);
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
  return debouncedCallback;
}
// ------------------------

// STYLE OBJECTS
const containerStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  borderRadius: "12px",
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
  padding: "30px",
  width: "95%",
  margin: "20px auto",
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
};

const headerStyle: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: "bold",
  textAlign: "center",
  marginBottom: "20px",
};

const selectorsContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: "20px",
  marginBottom: "20px",
};

const selectStyle: React.CSSProperties = {
  padding: "8px",
  borderRadius: "4px",
  border: "1px solid #ccc",
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
  color: "#fff",
  textAlign: "center", // Center header text
};

const tdStyle: React.CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid #ddd",
  textAlign: "center", // Center cell content
  cursor: "pointer",
};

// ------------------------
// Data types and helper functions

export interface ReportRow {
  id?: number;
  report_date: string; // Format "YYYY-MM-DD"
  day: string;         // e.g., "Monday", "Tuesday", etc.
  markers: number;
  imported: number;
  bundled: number;
  fed_in_1st_operation: number;
  offline: number;
  tubular: number;
  sewing_operators_active: number;
  staging_offline: number;
  blanks: number;
  dye_house: number;
  staged_for_finishing: number;
  trim: number;
  inspect: number;
  neck_print: number;
  printing: number;
  packed_into_boxes: number;
  total: number;
  created_at?: string;
}

const defaultReportRow = (date: string, day: string): ReportRow => ({
  report_date: date,
  day,
  markers: 0,
  imported: 0,
  bundled: 0,
  fed_in_1st_operation: 0,
  offline: 0,
  tubular: 0,
  sewing_operators_active: 0,
  staging_offline: 0,
  blanks: 0,
  dye_house: 0,
  staged_for_finishing: 0,
  trim: 0,
  inspect: 0,
  neck_print: 0,
  printing: 0,
  packed_into_boxes: 0,
  total: 0,
});

function getDayName(date: Date): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[date.getDay()];
}

const generateReportRowsForMonth = (year: number, month: number): ReportRow[] => {
  const rows: ReportRow[] = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dayIndex = d.getDay();
    // Include Monday to Saturday only
    if (dayIndex >= 1 && dayIndex <= 6) {
      const dateStr = d.toISOString().split("T")[0];
      const dayName = getDayName(new Date(d));
      rows.push(defaultReportRow(dateStr, dayName));
    }
  }
  return rows;
};

const formatDate = (iso: string): string => {
  const [year, month, day] = iso.split("-");
  return `${day}-${month}-${year}`;
};

// ------------------------
// Main Component

export default function DailyFactoryFlowReport() {
  // Role-based editing: get current user and determine if editing is allowed
  const currentUser = getCurrentUser();
  const canEdit = Boolean(currentUser && hasPermission(currentUser, ["manager", "admin", "editor"]));

  // Month & Year selectors
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonthNum, setSelectedMonthNum] = useState<number>(6); // June
  const selectedMonth = `${selectedYear}-${String(selectedMonthNum).padStart(2, "0")}`;

  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const startDate = `${selectedMonth}-01`;
      const lastDay = new Date(selectedYear, selectedMonthNum, 0).getDate();
      const endDate = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("daily_factory_flow_reports")
        .select("*")
        .gte("report_date", startDate)
        .lte("report_date", endDate);
      if (error) console.error("Error fetching data:", error);
      const defaultRows = generateReportRowsForMonth(selectedYear, selectedMonthNum);
      const mergedRows = defaultRows.map((row) => {
        const existing = data?.find((d: ReportRow) => d.report_date === row.report_date);
        return existing ? { ...row, ...existing } : row;
      });
      setReportRows(mergedRows);
      setLoading(false);
    }
    fetchData();
  }, [selectedMonth, selectedYear, selectedMonthNum]);

  // Debounced asynchronous update
  const updateRow = async (updatedRow: ReportRow) => {
    const { error } = await supabase
      .from("daily_factory_flow_reports")
      .upsert(updatedRow);
    if (error) {
      console.error("Error updating row:", error);
    } else {
      setReportRows((prevRows) =>
        prevRows.map((row) =>
          row.report_date === updatedRow.report_date ? updatedRow : row
        )
      );
    }
  };

  const debouncedUpdateRow = useDebounce((row: ReportRow) => {
    updateRow(row);
  }, 500);

  const handleInputChange = (report_date: string, field: keyof ReportRow, value: number) => {
    const updatedRows = reportRows.map((row) =>
      row.report_date === report_date ? { ...row, [field]: value } : row
    );
    setReportRows(updatedRows);
    const updatedRow = updatedRows.find((r) => r.report_date === report_date);
    if (updatedRow) debouncedUpdateRow(updatedRow);
  };

  // Group rows by week (each group starts on Monday)
  const groups: { week: ReportRow[] }[] = [];
  let currentGroup: ReportRow[] = [];
  const sortedRows = [...reportRows].sort((a, b) => a.report_date.localeCompare(b.report_date));
  sortedRows.forEach((row) => {
    if (row.day === "Monday" && currentGroup.length > 0) {
      groups.push({ week: [...currentGroup] });
      currentGroup = [row];
    } else {
      currentGroup.push(row);
    }
  });
  if (currentGroup.length > 0) groups.push({ week: [...currentGroup] });

  const overallTotals = reportRows.reduce(
    (acc, row) => ({
      markers: acc.markers + row.markers,
      imported: acc.imported + row.imported,
      bundled: acc.bundled + row.bundled,
      fed_in_1st_operation: acc.fed_in_1st_operation + row.fed_in_1st_operation,
      offline: acc.offline + row.offline,
      tubular: acc.tubular + row.tubular,
      sewing_operators_active: acc.sewing_operators_active + row.sewing_operators_active,
      staging_offline: acc.staging_offline + row.staging_offline,
      blanks: acc.blanks + row.blanks,
      dye_house: acc.dye_house + row.dye_house,
      staged_for_finishing: acc.staged_for_finishing + row.staged_for_finishing,
      trim: acc.trim + row.trim,
      inspect: acc.inspect + row.inspect,
      neck_print: acc.neck_print + row.neck_print,
      printing: acc.printing + row.printing,
      packed_into_boxes: acc.packed_into_boxes + row.packed_into_boxes,
      total: acc.total + row.total,
    }),
    {
      markers: 0,
      imported: 0,
      bundled: 0,
      fed_in_1st_operation: 0,
      offline: 0,
      tubular: 0,
      sewing_operators_active: 0,
      staging_offline: 0,
      blanks: 0,
      dye_house: 0,
      staged_for_finishing: 0,
      trim: 0,
      inspect: 0,
      neck_print: 0,
      printing: 0,
      packed_into_boxes: 0,
      total: 0,
    }
  );

  // Column definitions (15 columns)
  const columnsArray = [
    { key: "imported", label: "Imported" },
    { key: "bundled", label: "Bundled" },
    { key: "fed_in_1st_operation", label: "Fed in 1st Operation" },
    { key: "offline", label: "Offline" },
    { key: "tubular", label: "Tubular" },
    { key: "sewing_operators_active", label: "Sewing operators/active" },
    { key: "staging_offline", label: "Staging Offline" },
    { key: "blanks", label: "Blanks" },
    { key: "dye_house", label: "Dye House" },
    { key: "staged_for_finishing", label: "Staged for Finishing" },
    { key: "trim", label: "Trim" },
    { key: "inspect", label: "Inspect" },
    { key: "neck_print", label: "Neck Print" },
    { key: "printing", label: "Printing" },
    { key: "packed_into_boxes", label: "Packed into Boxes" },
  ];

  // Total number of columns: Day, Date, Markers, 15 additional columns, and Total $
  const totalColumns = 19;

  return (
    <div style={containerStyle}>
      {/* Global styles to remove number input spinners */}
      <style jsx global>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      <h1 style={headerStyle}>Daily Factory Flow Report</h1>

      {/* Month and Year selectors */}
      <div style={selectorsContainerStyle}>
        <div>
          <label style={{ marginRight: "8px" }}>Month:</label>
          <select
            value={selectedMonthNum}
            onChange={(e) => setSelectedMonthNum(parseInt(e.target.value))}
            style={selectStyle}
          >
            {[
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ].map((month, index) => (
              <option key={index + 1} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ marginRight: "8px" }}>Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={selectStyle}
          >
            {Array.from({ length: 10 }, (_, i) => {
              const year = 2020 + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", fontSize: "18px" }}>Loading data...</p>
      ) : (
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Day</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Markers</th>
                {columnsArray.map((col) => (
                  <th key={col.key} style={thStyle}>{col.label}</th>
                ))}
                <th style={thStyle}>Total $</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, groupIndex) => (
                <React.Fragment key={groupIndex}>
                  {group.week.map((row) => (
                    <tr key={row.report_date}>
                      <td style={tdStyle}>{row.day}</td>
                      <td style={tdStyle}>{formatDate(row.report_date)}</td>
                      <td style={tdStyle}>
                        {canEdit ? (
                          <input
                            type="number"
                            value={row.markers}
                            onChange={(e) => {
                              const newVal = parseFloat(e.target.value);
                              handleInputChange(row.report_date, "markers", newVal);
                            }}
                            onFocus={(e) => e.target.select()}
                            style={{
                              ...tdStyle,
                              width: "100%",
                              padding: "8px",
                              textAlign: "center",
                            }}
                          />
                        ) : (
                          <span>{row.markers}</span>
                        )}
                      </td>
                      {columnsArray.map((col) => (
                        <td key={col.key} style={tdStyle}>
                          {canEdit ? (
                            <input
                              type="number"
                              value={row[col.key as keyof ReportRow] as number}
                              onChange={(e) => {
                                const newVal = parseFloat(e.target.value);
                                handleInputChange(row.report_date, col.key as keyof ReportRow, newVal);
                              }}
                              onFocus={(e) => e.target.select()}
                              style={{
                                ...tdStyle,
                                width: "100%",
                                padding: "8px",
                                textAlign: "center",
                              }}
                            />
                          ) : (
                            <span>{row[col.key as keyof ReportRow]}</span>
                          )}
                        </td>
                      ))}
                      <td style={tdStyle}>
                        {canEdit ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span style={{ marginRight: "4px" }}>$</span>
                            <input
                              type="number"
                              value={row.total}
                              onChange={(e) => {
                                const newVal = parseFloat(e.target.value);
                                handleInputChange(row.report_date, "total", newVal);
                              }}
                              onFocus={(e) => e.target.select()}
                              style={{
                                width: "100%",
                                padding: "8px",
                                border: "none",
                                outline: "none",
                                textAlign: "center",
                              }}
                            />
                          </div>
                        ) : (
                          <span>${row.total.toFixed(2)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* WEEK TOTAL row: a single cell spanning all columns */}
                  <tr style={{ background: "#e5e7eb", fontWeight: "bold" }}>
                    <td style={{ ...tdStyle, textAlign: "center" }} colSpan={totalColumns}>
                      WEEK TOTAL: ${group.week.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
              {/* Global totals row */}
              <tr style={{ background: "#d1d5db", fontWeight: "bold" }}>
                <td style={{ ...tdStyle, textAlign: "center" }}>TOTAL</td>
                <td style={tdStyle}></td>
                <td style={tdStyle}>{overallTotals.markers.toFixed(2)}</td>
                {columnsArray.map((col) => (
                  <td key={col.key} style={tdStyle}>
                    {(overallTotals[col.key as keyof typeof overallTotals] as number).toFixed(2)}
                  </td>
                ))}
                <td style={tdStyle}>${overallTotals.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
