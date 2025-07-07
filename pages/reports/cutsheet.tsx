// pages/reports/cutsheet.tsx
"use client";

import Head from 'next/head';
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

// ─────────────────────────────────────────────────────────────────
// Register Helvetica-Bold
Font.register({
  family: "Helvetica-Bold",
  fonts: [
    {
      src: "https://pdf-lib.js.org/assets/ubuntu/Ubuntu-Bold.ttf",
      fontWeight: "bold",
    },
  ],
});

// ─────────────────────────────────────────────────────────────────
// Styles & Constants

const API_TOKEN = "6002f37a06cc09759259a7c5eabff471";
const BOX_MARGIN = 8;

const styles = StyleSheet.create({
  page: {
    size: "A4",
    margin: 0,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.3,
  },
  container: {
    paddingHorizontal: BOX_MARGIN,
    paddingTop: BOX_MARGIN,
  },

  // Header / Title / Notes
  sectionHeaderBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000",
    padding: 6,
    marginBottom: 0, // no gap under header
  },
  sectionTitleBox: {
    width: "100%",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#000",
    padding: 6,
    marginTop: 0,
    marginBottom: 0,
  },
  sectionNotesBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000",
    padding: 6,
    marginTop: 0,
    marginBottom: 12,
  },

  headerContainer: { position: "relative", minHeight: 60 },
  headerLeft: { width: "50%" },
  headerRight: {
    position: "absolute",
    top: 0,
    left: "52%",
    width: "46%",
    alignItems: "flex-end",
  },
  block: { marginBottom: 4 },

  title: {
    fontSize: 16,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
  },
  notesText: { fontSize: 9 },

  // Sub-header before each style block
  subHeader: {
    width: "100%",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    flexWrap: "wrap",
    minWidth: 0,
    marginBottom: 4,
  },

  // Table styles
  tableWrapper: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#444",
    marginBottom: 20,
    overflow: "hidden",
  },
  table: { width: "100%" },
  tableRow: { flexDirection: "row", flexWrap: "nowrap" },

  th: {
    flexGrow: 1,
    padding: 4,
    backgroundColor: "#eee",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#aaa",
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    flexShrink: 1,
    flexWrap: "wrap",
    minWidth: 0,
  },
  td: {
    flexGrow: 1,
    padding: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#aaa",
    textAlign: "center",
    fontSize: 9,
    flexShrink: 1,
    flexWrap: "wrap",
    minWidth: 0,
  },
  thLast: { borderRightWidth: 0 },
  tdLast: { borderRightWidth: 0 },

  small: { fontSize: 7, color: "#333" },

  // Footer page number
  pageNum: {
    position: "absolute",
    fontSize: 8,
    bottom: BOX_MARGIN,
    right: BOX_MARGIN,
    color: "#666",
  },
});

// ─────────────────────────────────────────────────────────────────
// Types

type POItem = {
  style_number: string;
  description: string;
  unit_cost: string;
  qty: string;
  size: string;
  attr_2?: string;
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
  description: string;
  sizes: Record<string, { qty: number; cost: number }>;
};

// ─────────────────────────────────────────────────────────────────
// Fetch helper

async function fetchProxy<T>(route: string): Promise<T> {
  const time = Math.floor(Date.now() / 1000).toString();
  const qs = new URLSearchParams({ token: API_TOKEN, time }).toString();
  const res = await fetch(`/api/proxy/${route}?${qs}`);
  if (!res.ok) throw new Error(`Fetch ${route} failed: ${res.status}`);
  const json = await res.json();
  return (json.response?.[0] ?? null) as T;
}

// ─────────────────────────────────────────────────────────────────
// PDF Document Component

function CutSheetDoc({
  po,
  div,
  ven,
}: {
  po: PO;
  div: Division;
  ven: Vendor;
}) {
  // Group items by style+color
  const grouped = po.purchase_order_items.reduce<
    Record<string, StyleGroup>
  >((acc, it) => {
    const color = it.attr_2 ?? "";
    const key = `${it.style_number}___${color}`;
    if (!acc[key]) {
      acc[key] = {
        style: it.style_number,
        color,
        description: it.description,
        sizes: {},
      };
    }
    const qty = parseFloat(it.qty) || 0;
    const cost = parseFloat(it.unit_cost) || 0;
    const cur = acc[key].sizes[it.size] ?? { qty: 0, cost };
    acc[key].sizes[it.size] = { qty: cur.qty + qty, cost };
    return acc;
  }, {});

  const rows = Object.values(grouped);
  const sizes = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r.sizes)))
  );

  // Compute column width: sizes + Total Qty + Amt
  const totalCols = sizes.length + 2;
  const colWidth = `${(100 / totalCols).toFixed(2)}%`;

  // Grand totals
  const totalsPerSize: Record<string, number> = {};
  let grandQty = 0,
    grandAmt = 0;
  rows.forEach((r) =>
    sizes.forEach((sz) => {
      const e = r.sizes[sz];
      if (e) {
        totalsPerSize[sz] = (totalsPerSize[sz] || 0) + e.qty;
        grandQty += e.qty;
        grandAmt += e.qty * e.cost;
      }
    })
  );

  return (



    <Document>
      <Page style={styles.page}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.sectionHeaderBox}>
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
          </View>

          {/* Title */}
          <View style={styles.sectionTitleBox}>
            <Text style={styles.title}>Cut Sheet</Text>
          </View>

          {/* Notes */}
          <View style={styles.sectionNotesBox}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Notes:</Text>
            <Text style={styles.notesText}>{po.notes}</Text>
          </View>

          {/* Per-style/color sections */}
          {rows.map((r) => {
            const rowQty = Object.values(r.sizes).reduce(
              (a, v) => a + v.qty,
              0
            );
            const rowAmt = Object.values(r.sizes).reduce(
              (a, v) => a + v.qty * v.cost,
              0
            );
            return (
              <View
                key={`${r.style}___${r.color}`}
                wrap={false}
                style={{ marginTop: 12 }}  // extra space when a block starts new page
              >
                {/* Sub-header */}
                <Text style={styles.subHeader}>
                  Style: {r.style} | Color: {r.color} | Description:{" "}
                  {r.description}
                </Text>

                {/* Size + Totals table */}
                <View style={styles.tableWrapper} wrap={false}>
                  <View style={styles.table}>
                    {/* Header row */}
                    <View style={styles.tableRow}>
                      {sizes.map((sz) => (
                        <Text
                          key={sz}
                          style={[styles.th, { width: colWidth }]}
                        >
                          {sz}
                        </Text>
                      ))}
                      <Text style={[styles.th, { width: colWidth }]}>
                        Total Qty
                      </Text>
                      <Text
                        style={[
                          styles.th,
                          { width: colWidth },
                          styles.thLast,
                        ]}
                      >
                        Amt
                      </Text>
                    </View>

                    {/* Data row */}
                    <View style={styles.tableRow}>
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
                      <View style={[styles.td, { width: colWidth }]}>
                        <Text>{rowQty}</Text>
                      </View>
                      <View
                        style={[
                          styles.td,
                          { width: colWidth },
                          styles.tdLast,
                        ]}
                      >
                        <Text>${rowAmt.toFixed(2)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Grand totals */}
          <View
            wrap={false}
            style={{ marginTop: 12 }}
          >
            <Text
              style={[styles.subHeader, { marginBottom: 4 }]}
            >
              GRAND TOTALS
            </Text>
            <View style={styles.tableWrapper} wrap={false}>
              <View style={styles.table}>
                <View style={styles.tableRow}>
                  {sizes.map((sz) => (
                    <Text
                      key={sz}
                      style={[styles.th, { width: colWidth }]}
                    >
                      {sz}
                    </Text>
                  ))}
                  <Text style={[styles.th, { width: colWidth }]}>
                    Total Qty
                  </Text>
                  <Text
                    style={[
                      styles.th,
                      { width: colWidth },
                      styles.thLast,
                    ]}
                  >
                    Amt
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  {sizes.map((sz) => (
                    <Text
                      key={sz}
                      style={[styles.td, { width: colWidth }]}
                    >
                      {totalsPerSize[sz] || ""}
                    </Text>
                  ))}
                  <Text style={[styles.td, { width: colWidth }]}>
                    {grandQty}
                  </Text>
                  <Text
                    style={[
                      styles.td,
                      { width: colWidth },
                      styles.tdLast,
                    ]}
                  >
                    ${grandAmt.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* fixed footer on every page */}
        <Text
          fixed
          style={styles.pageNum}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Component

export default function CutSheetPage() {
  const [poId, setPoId] = useState("");
  const [po, setPo] = useState<PO | null>(null);
  const [div, setDiv] = useState<Division | null>(null);
  const [ven, setVen] = useState<Vendor | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function loadData() {
    if (!poId) return;
    setLoading(true);
    setPdfDataUrl("");
    try {
      const poData = await fetchProxy<PO>(`purchase_orders/${poId}`);
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
      reader.onload = () => setPdfDataUrl(reader.result as string);
      reader.readAsDataURL(blob);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!pdfDataUrl || !po) return;
    const link = document.createElement("a");
    link.href = pdfDataUrl;
    link.download = `CutSheet_${po.project_id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div style={{ padding: BOX_MARGIN }}>
      <h1>Cut Sheet Generator</h1>

      {/* PO ID input & Load */}
      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="Enter PO ID"
          value={poId}
          onChange={(e) => setPoId(e.target.value)}
          disabled={loading}
          style={{ padding: 8, width: 120, marginRight: 8 }}
        />
        <button
          onClick={loadData}
          disabled={loading || !poId}
          style={{
            padding: "8px 16px",
            backgroundColor: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: loading || !poId ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Loading…" : "Load"}
        </button>
      </div>

      {/* PDF preview & download */}
      {pdfDataUrl && (
        <>
          <object
            data={pdfDataUrl}
            type="application/pdf"
            width="100%"
            height="800px"
            style={{ border: "1px solid #888" }}
          />
          <div style={{ textAlign: "center", marginTop: 12 }}>
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
