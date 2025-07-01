// pages/reports/cutsheet.tsx
"use client";

import React, { useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";

// ─── Register bold font ─────────────────────────────────────────
Font.register({
  family: "Helvetica-Bold",
  fonts: [
    {
      src: "https://pdf-lib.js.org/assets/ubuntu/Ubuntu-Bold.ttf",
      fontWeight: "bold",
    },
  ],
});

// ─── Styles & Constants ─────────────────────────────────────────
const API_TOKEN = "6002f37a06cc09759259a7c5eabff471";
const ROWS_PER_PAGE = 12;

const styles = StyleSheet.create({
  page: {
    size: "A4",
    margin: 8,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.3,
  },

  headerContainer: {
    position: "relative",
    marginBottom: 8,
    minHeight: 60,
  },
  headerLeft: { width: "50%" },
  headerRight: {
    position: "absolute",
    top: 0,
    left: "49%",
    width: "46%",
    alignItems: "flex-end",
  },

  block: { marginBottom: 4 },

  title: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 6,
    fontFamily: "Helvetica-Bold",
  },
  notes: { fontSize: 9, marginBottom: 12 },

  // ── table wrapper gives full border ─────────────────────────────
  tableWrapper: {
    width: "95%",
    marginLeft: 5,        // 8pt on the left
    marginRight: 4,       // same 8pt on the right
    borderWidth: 1,
    borderColor: "#00000",
    borderStyle: "solid",
    marginBottom: 12,
    overflow: "hidden",
  },

  table: {
    width: "100%",
  // marginLeft: "auto",
 //  marginRight: "auto",
  },

  tableRow: { flexDirection: "row", flexWrap: "nowrap" },
  th: {
    padding: 4,
    backgroundColor: "#eee",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#aaa",
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    flexShrink: 0,
  },
  td: {
    padding: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#aaa",
    textAlign: "center",
    fontSize: 9,
    flexShrink: 0,
  },
  small: { fontSize: 7, color: "#333" },
  zebra: { backgroundColor: "#f9f9f9" },

  pageNum: {
    position: "absolute",
    fontSize: 8,
    bottom: 8,
    right: 15,
    color: "#666",
  },
});

// ─── Types ───────────────────────────────────────────────────────
type POItem = {
  style_number: string;
  unit_cost: string;
  qty: string;
  size: string;
  attr_2?: string; // color
};

type PO = {
  project_id: string;
  date_start_internal: string;
  date_due_internal: string;
  notes: string;
  division_id: string;
  vendor_id: string;
  purchase_order_items: POItem[];
};

type Division = {
  name: string;
  address_1: string;
  city: string;
  state: string;
  postal_code: string;
};

type Vendor = {
  vendor_name: string;
  address_1: string;
  city: string;
  state: string;
  postal_code: string;
};

type StyleGroup = {
  style: string;
  color: string;
  sizes: Record<string, { qty: number; cost: number }>;
};

// ─── Proxy helper ───────────────────────────────────────────────
async function fetchProxy<T>(route: string): Promise<T> {
  const time = Math.floor(Date.now() / 1000).toString();
  const qs = new URLSearchParams({ token: API_TOKEN, time }).toString();
  const res = await fetch(`/api/proxy/${route}?${qs}`);
  if (!res.ok) throw new Error(`Fetch ${route} failed: ${res.status}`);
  const json = await res.json();
  return (json.response?.[0] ?? null) as T;
}

// ─── PDF Document Component ─────────────────────────────────────
function CutSheetDoc({
  po,
  div,
  ven,
}: {
  po: PO;
  div: Division;
  ven: Vendor;
}) {
  // Group by style+color
  const grouped = po.purchase_order_items.reduce<
    Record<string, StyleGroup>
  >((acc, it) => {
    const color = it.attr_2 ?? "";
    const key = `${it.style_number}___${color}`;
    if (!acc[key]) {
      acc[key] = { style: it.style_number, color, sizes: {} };
    }
    const qty = parseFloat(it.qty) || 0;
    const cost = parseFloat(it.unit_cost) || 0;
    const cur = acc[key].sizes[it.size] ?? { qty: 0, cost };
    acc[key].sizes[it.size] = { qty: cur.qty + qty, cost };
    return acc;
  }, {});

  const rows = Object.values(grouped) as StyleGroup[];
  const sizes = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r.sizes)))
  );

  // paginate
  const pages: StyleGroup[][] = [];
  for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
    pages.push(rows.slice(i, i + ROWS_PER_PAGE));
  }

  // compute column width
  const colCount = 2 + sizes.length + 2; // style, color, sizes…, total, amt
  const colWidth = `${(100 / colCount).toFixed(2)}%`;

  // grand totals
  let grandQty = 0;
  let grandAmt = 0;
  rows.forEach((r) =>
    sizes.forEach((sz) => {
      const e = r.sizes[sz];
      if (e) {
        grandQty += e.qty;
        grandAmt += e.qty * e.cost;
      }
    })
  );

  return (
    <Document>
      {pages.map((slice, pi) => (
        <Page key={pi} style={styles.page}>

          {/* show header/title/notes only on page 1 */}
          {pi === 0 && (
            <>
              <View style={styles.headerContainer}>
                <View style={styles.headerLeft}>
                  <Text style={styles.block}>
                    <Text style={{ fontFamily: "Helvetica-Bold" }}>
                      Division:
                    </Text>{" "}
                    {div.name}
                  </Text>
                  <Text>
                    {div.address_1}, {div.city}, {div.state}{" "}
                    {div.postal_code}
                  </Text>
                  <Text
                    style={[
                      styles.block,
                      { fontFamily: "Helvetica-Bold" },
                    ]}
                  >
                    Vendor: {ven.vendor_name}
                  </Text>
                  <Text>
                    {ven.address_1}, {ven.city}, {ven.state}{" "}
                    {ven.postal_code}
                  </Text>
                </View>
                <View style={styles.headerRight}>
                  <Text style={styles.block}>
                    <Text style={{ fontFamily: "Helvetica-Bold" }}>
                      Cut Ticket:
                    </Text>{" "}
                    {po.project_id}
                  </Text>
                  <Text>
                    <Text style={{ fontFamily: "Helvetica-Bold" }}>
                      Start:
                    </Text>{" "}
                    {po.date_start_internal}
                  </Text>
                  <Text>
                    <Text style={{ fontFamily: "Helvetica-Bold" }}>
                      Due:
                    </Text>{" "}
                    {po.date_due_internal}
                  </Text>
                </View>
              </View>

              <Text style={styles.title}>Cut Sheet</Text>
              <Text style={styles.notes}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>
                  Notes:
                </Text>
                {"\n"}
                {po.notes}
              </Text>
            </>
          )}

          {/* table wrapper + inner table */}

          <View style={styles.tableWrapper}>
            <View style={styles.table}>
              {/* headers */}
              <View style={styles.tableRow}>
                <Text style={[styles.th, { width: colWidth }]}>
                  Style
                </Text>
                <Text style={[styles.th, { width: colWidth }]}>
                  Color
                </Text>
                {sizes.map((sz) => (
                  <Text
                    key={sz}
                    style={[styles.th, { width: colWidth }]}
                  >
                    {sz}
                  </Text>
                ))}
                <Text style={[styles.th, { width: colWidth }]}>
                  Total
                </Text>
                <Text style={[styles.th, { width: colWidth }]}>
                  Amt
                </Text>
              </View>
         

              {/* rows */}
              {slice.map((r, ri) => {
                let rowQty = 0,
                  rowAmt = 0;
                sizes.forEach((sz) => {
                  const e = r.sizes[sz];
                  if (e) {
                    rowQty += e.qty;
                    rowAmt += e.qty * e.cost;
                  }
                });
                return (
                  <View
                    key={`${r.style}___${r.color}`}
                    style={[
                      styles.tableRow,
                      ri % 2 === 1 ? styles.zebra : {},
                    ]}
                  >
                    <Text
                      style={[styles.td, { width: colWidth }]}
                    >
                      {r.style}
                    </Text>
                    <Text
                      style={[styles.td, { width: colWidth }]}
                    >
                      {r.color}
                    </Text>

                    {sizes.map((sz) => {
                      const e = r.sizes[sz] ?? { qty: 0, cost: 0 };
                      return (
                        <View
                          key={sz}
                          style={[styles.td, { width: colWidth }]}
                        >
                          <Text>{e.qty || ""}</Text>
                          <Text style={styles.small}>
                            ${e.cost.toFixed(2)}
                          </Text>
                        </View>
                      );
                    })}

                    <Text
                      style={[styles.td, { width: colWidth }]}
                    >
                      {rowQty}
                    </Text>
                    <Text
                      style={[styles.td, { width: colWidth }]}
                    >
                      ${rowAmt.toFixed(2)}
                    </Text>
                  </View>
                );
              })}

              {/* grand total on last page */}
              {pi === pages.length - 1 && (
                <View style={styles.tableRow}>
                  <Text
                    style={[styles.th, { width: colWidth }]}
                  >
                    TOTAL
                  </Text>
                  <Text
                    style={[styles.th, { width: colWidth }]}
                  >
                    —
                  </Text>
                  {sizes.map((sz) => {
                    const tot = rows.reduce(
                      (s, r) => s + (r.sizes[sz]?.qty || 0),
                      0
                    );
                    return (
                      <Text
                        key={`tot-${sz}`}
                        style={[styles.th, { width: colWidth }]}
                      >
                        {tot}
                      </Text>
                    );
                  })}
                  <Text
                    style={[styles.th, { width: colWidth }]}
                  >
                    {grandQty}
                  </Text>
                  <Text
                    style={[styles.th, { width: colWidth }]}
                  >
                    ${grandAmt.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.pageNum}>
            Page {pi + 1} / {pages.length}
          </Text>
        </Page>
      ))}
    </Document>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export default function CutSheetPage() {
  const [poId, setPoId] = useState("");
  const [po, setPo] = useState<PO | null>(null);
  const [div, setDiv] = useState<Division | null>(null);
  const [ven, setVen] = useState<Vendor | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!poId) return;
    setLoading(true);
    setPdfDataUrl("");
    try {
      const poData = await fetchProxy<PO>(
        `purchase_orders/${poId}`
      );
      if (!poData) throw new Error("PO not found");
      setPo(poData);

      const divData = await fetchProxy<Division>(
        `divisions/${poData.division_id}`
      );
      setDiv(divData);

      const venData = await fetchProxy<Vendor>(
        `vendors/${poData.vendor_id}`
      );
      setVen(venData);

      const blob = await pdf(
        <CutSheetDoc po={poData} div={divData} ven={venData} />
      ).toBlob();
      const reader = new FileReader();
      reader.onload = () =>
        setPdfDataUrl(reader.result as string);
      reader.readAsDataURL(blob);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfDataUrl) return;
    const link = document.createElement("a");
    link.href = pdfDataUrl;
    link.download = `CutSheet_${poId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Cut Sheet Generator</h1>
      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="Enter PO ID"
          value={poId}
          onChange={(e) => setPoId(e.target.value)}
          disabled={loading}
          style={{
            padding: 8,
            width: 120,
            marginRight: 8,
          }}
        />
        <button
          onClick={loadData}
          disabled={loading || !poId}
        >
          {loading ? "Loading…" : "Load"}
        </button>
      </div>

      {pdfDataUrl && (
        <>
          <object
            data={pdfDataUrl}
            type="application/pdf"
            width="100%"
            height="800px"
            style={{ border: "1px solid #888" }}
          />
          <div
            style={{
              textAlign: "center",
              marginTop: 12,
            }}
          >
            <button
              onClick={handleDownload}
              style={{
                padding: "10px 20px",
                backgroundColor: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Download PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}