"use client";
import React, { useState } from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  PDFDownloadLink,
} from "@react-pdf/renderer";

// —————————————————————————————————————————————
// PDF STYLES
const pdfStyles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, lineHeight: 1.2 },
  headerRow: { flexDirection: "row", justifyContent: "space-between" },
  block: { marginBottom: 8 },
  title: { fontSize: 16, textAlign: "center", fontWeight: "bold", margin: 8 },
  notes: { fontSize: 9, marginBottom: 12 },
  tableContainer: {
    flexDirection: "column",
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
  },
  tableRow: { flexDirection: "row" },
  tableColHeader: {
    flex: 1,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    backgroundColor: "#eee",
    padding: 4,
    textAlign: "center",
    fontWeight: "bold",
  },
  tableCol: {
    flex: 1,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    padding: 4,
    textAlign: "center",
  },
});

// —————————————————————————————————————————————
// PROXY HELPER
const API_TOKEN = "6002f37a06cc09759259a7c5eabff471";

// Always call `/api/proxy/orders/<route>`
// and drop any leading "orders/" from the route argument.
async function fetchProxy(route: string, query: Record<string, string>) {
  // ensure we never pass an extra "orders/" prefix
  const cleanRoute = route.replace(/^orders\//, "");
  const qs = new URLSearchParams(query).toString();
  const url = `/api/proxy/${cleanRoute}?${qs}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Proxy ${url} failed: ${res.status}`);
  const json = await res.json();
  // detail endpoints always return { response: [ { … } ] }
  return json.response?.[0] || null;
}

// —————————————————————————————————————————————
// TYPES FOR GROUPING STYLES
type StyleGroup = {
  style: string;
  cost: number;
  sizes: Record<string, number>;
};

// —————————————————————————————————————————————
// PDF DOCUMENT
const CutSheetDoc = ({
  po,
  division,
  vendor,
}: {
  po: any;
  division: any;
  vendor: any;
}) => {
  // 1) Group items by style
  const grouped = (po.purchase_order_items as any[]).reduce<
    Record<string, StyleGroup>
  >((acc, item) => {
    const key = item.style_number as string;
    if (!acc[key])
      acc[key] = {
        style: key,
        cost: parseFloat(item.unit_cost) || 0,
        sizes: {},
      };
    const qty = parseFloat(item.qty) || 0;
    acc[key].sizes[item.size] = (acc[key].sizes[item.size] || 0) + qty;
    return acc;
  }, {});

  const rows = Object.values(grouped);

  // 2) All unique sizes
  const sizeList = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r.sizes)))
  );

  // 3) Totals per size
  const totalsPerSize: Record<string, number> = {};
  sizeList.forEach((sz) => {
    totalsPerSize[sz] = rows.reduce((sum, r) => sum + (r.sizes[sz] || 0), 0);
  });

  // 4) Grand totals
  const grandQty = rows.reduce(
    (sum, r) => sum + Object.values(r.sizes).reduce((a, b) => a + b, 0),
    0
  );
  const grandAmt = rows.reduce(
    (sum, r) =>
      sum +
      Object.values(r.sizes).reduce((a, b) => a + b, 0) * r.cost,
    0
  );

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* HEADER */}
        <View style={pdfStyles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={pdfStyles.block}>
              <Text style={{ fontWeight: "bold" }}>Division:</Text>{" "}
              {division.name}
            </Text>
            <Text>
              {division.address_1}, {division.city}, {division.state}{" "}
              {division.postal_code}
            </Text>
            <Text style={{ marginTop: 6, fontWeight: "bold" }}>
              Vendor: {vendor.vendor_name}
            </Text>
            <Text>
              {vendor.address_1}, {vendor.city}, {vendor.state}{" "}
              {vendor.postal_code}
            </Text>
          </View>
          <View style={{ flex: 1, textAlign: "right" }}>
            <Text style={pdfStyles.block}>
              <Text style={{ fontWeight: "bold" }}>Cut Ticket:</Text>{" "}
              {po.project_id}
            </Text>
            <Text>
              <Text style={{ fontWeight: "bold" }}>Start:</Text>{" "}
              {po.date_start_internal}
            </Text>
            <Text>
              <Text style={{ fontWeight: "bold" }}>Due:</Text>{" "}
              {po.date_due_internal}
            </Text>
          </View>
        </View>

        {/* TITLE & NOTES */}
        <Text style={pdfStyles.title}>Cut Sheet</Text>
        <Text style={pdfStyles.notes}>
          <Text style={{ fontWeight: "bold" }}>Notes:</Text>
          {"\n"}
          {po.notes}
        </Text>

        {/* TABLE */}
        <View style={pdfStyles.tableContainer}>
          {/* HEADERS */}
          <View style={pdfStyles.tableRow}>
            <Text style={pdfStyles.tableColHeader}>Style</Text>
            {sizeList.map((sz) => (
              <Text key={sz} style={pdfStyles.tableColHeader}>
                {sz}
              </Text>
            ))}
            <Text style={pdfStyles.tableColHeader}>Qty Total</Text>
            <Text style={pdfStyles.tableColHeader}>Amt Total</Text>
          </View>

          {/* ROWS */}
          {rows.map((r) => {
            const rowQty = Object.values(r.sizes).reduce((a, b) => a + b, 0);
            const rowAmt = rowQty * r.cost;
            return (
              <View style={pdfStyles.tableRow} key={r.style}>
                <Text style={pdfStyles.tableCol}>{r.style}</Text>
                {sizeList.map((sz) => (
                  <Text key={sz} style={pdfStyles.tableCol}>
                    {r.sizes[sz] || ""}
                  </Text>
                ))}
                <Text style={pdfStyles.tableCol}>{rowQty}</Text>
                <Text style={pdfStyles.tableCol}>
                  {rowAmt.toFixed(2)}
                </Text>
              </View>
            );
          })}

          {/* FOOTER TOTALS */}
          <View style={pdfStyles.tableRow}>
            <Text style={pdfStyles.tableColHeader}>TOTAL</Text>
            {sizeList.map((sz) => (
              <Text key={sz} style={pdfStyles.tableColHeader}>
                {totalsPerSize[sz]}
              </Text>
            ))}
            <Text style={pdfStyles.tableColHeader}>{grandQty}</Text>
            <Text style={pdfStyles.tableColHeader}>
              {grandAmt.toFixed(2)}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// —————————————————————————————————————————————
// MAIN PAGE
export default function CutSheetPage() {
  const [poId, setPoId] = useState("");
  const [po, setPo] = useState<any>(null);
  const [division, setDivision] = useState<any>(null);
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(false);

const loadData = async () => {
  const time = Math.floor(Date.now()/1000).toString();


    try {
      // 1) Purchase Order detail
  const listRes = await fetch(
    `/api/proxy/purchase_orders?` +
      new URLSearchParams({
        token: API_TOKEN,
        time,
        purchase_order_id: poId,
      }).toString()
  );
  const listJson = await listRes.json();
  const poData = listJson.response?.[0];
  if (!poData) {
    alert(`PO ${poId} not found`);
    return;
  }
  setPo(poData);


      // 2) Division detail
      const divData = await fetchProxy(`divisions/${poData.division_id}`, {
        token: API_TOKEN,
        time: Math.floor(Date.now() / 1000).toString(),
      });
      setDivision(divData);

      // 3) Vendor detail
      const venData = await fetchProxy(`vendors/${poData.vendor_id}`, {
        token: API_TOKEN,
        time: Math.floor(Date.now() / 1000).toString(),
      });
      setVendor(venData);
    } catch (err: any) {
      alert(err.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: 24 }}>
      <h1>Cut Sheet Generator</h1>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Enter PO ID"
          value={poId}
          onChange={(e) => setPoId(e.target.value)}
          style={{ padding: 8, width: 120, marginRight: 8 }}
        />
        <button onClick={loadData} disabled={loading || !poId}>
          {loading ? "Loading…" : "Load"}
        </button>
      </div>

      {po && division && vendor && (
        <PDFDownloadLink
          document={<CutSheetDoc po={po} division={division} vendor={vendor} />}
          fileName={`CutSheet_${poId}.pdf`}
          style={{
            padding: "10px 20px",
            backgroundColor: "#4CAF50",
            color: "#fff",
            textDecoration: "none",
            borderRadius: 4,
          }}
        >
          {({ loading }) => (loading ? "Preparing PDF…" : "Download Cut Sheet PDF")}
        </PDFDownloadLink>
      )}
    </div>
  );
}