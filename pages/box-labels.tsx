// pages/box-labels.tsx
import Head from "next/head";
import { useState, useRef } from "react";
import type { NextPage } from "next";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const API_TOKEN = "6002f37a06cc09759259a7c5eabff471";

type BoxItem = {
  style: string;
  description: string;
  color: string;
  size: string;
  qty: number;
};

type BoxData = {
  boxNumber: number;
  totalBoxes: number;
  items: BoxItem[];
  styles: string[];
  colors: string[];
  sizes: Record<string, number>;
};

type ShipmentHeader = {
  customer: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  customer_po: string;
  date: string;
  trackingNumber: string;
};

type ShipmentData = {
  header: ShipmentHeader;
  boxes: Record<string, BoxData>;
};

const COMPANY_DATA: Record<
  string,
  { name: string; address1: string; address2: string }
> = {
  secura: {
    name: "SECURA INC",
    address1: "22922 LOS ALISOS BLVD STE K-359",
    address2: "MISSION VIEJO, CALIFORNIA 92691-2856",
  },
  libertad: {
    name: "LIBERTAD INC",
    address1: "22922 LOS ALISOS BLVD STE K-359",
    address2: "MISSION VIEJO, CALIFORNIA 92691-2856",
  },
};

const BoxLabelsPage: NextPage = () => {
  const [companyId, setCompanyId] = useState("secura");
  const [shipmentId, setShipmentId] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [shipmentData, setShipmentData] = useState<ShipmentData | null>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  function normalizePickTicketIds(ids: any): string[] {
    if (Array.isArray(ids)) return ids.filter(Boolean);
    if (typeof ids === "string")
      return ids.split(",").map((id) => id.trim()).filter(Boolean);
    return [String(ids)].filter(
      (id) => id && !["null", "undefined"].includes(id)
    );
  }

  function extractCustomerPOs(responses: any[]): string[] {
    const pos = new Set<string>();
    responses.forEach((r) => {
      const po = r?.response?.[0]?.customer_po?.trim();
      if (po) pos.add(po);
    });
    return Array.from(pos);
  }

  function processShipment(sh: any) {
    const boxes: Record<string, BoxData> = {};
    sh.boxes.forEach((b: any) => {
      boxes[b.box_number] = {
        boxNumber: b.box_number,
        totalBoxes: sh.boxes.length,
        items: [],
        styles: [],
        colors: [],
        sizes: {},
      };
      b.box_items.forEach((it: any) => {
        const qty = parseInt(it.qty);
        const box = boxes[b.box_number];
        box.items.push({
          style: it.style_number,
          description: it.description,
          color: it.attr_2,
          size: it.size,
          qty,
        });
        if (!box.styles.includes(it.style_number))
          box.styles.push(it.style_number);
        if (!box.colors.includes(it.attr_2)) box.colors.push(it.attr_2);
        box.sizes[it.size] = (box.sizes[it.size] || 0) + qty;
      });
    });

    const header: ShipmentHeader = {
      customer: sh.customer_name,
      address1: sh.address_1 || "",
      address2: sh.address_2 || "",
      city: sh.city || "",
      state: sh.state || "",
      zip: sh.postal_code || "",
      country: sh.country || "",
      customer_po: sh.customer_po || "N/A",
      date: sh.date,
      trackingNumber: sh.tracking_number || "N/A",
    };

    setShipmentData({ header, boxes });
  }

  async function fetchShipment() {
    if (!shipmentId.trim()) {
      setError("Ingresa un Shipment ID");
      return;
    }
    setError("");
    setShipmentData(null);
    setProcessing(true);

    try {
      const time = Math.floor(Date.now() / 1000);
      const resp = await fetch(
        `/api/proxy/shipments/${shipmentId}?token=${API_TOKEN}&time=${time}`
      );
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `Status ${resp.status}`);
      }
      const raw = await resp.json();
      console.log("🚀 RAW shipments response:", raw);

      const shipment = Array.isArray(raw.response)
        ? raw.response[0]
        : null;
      if (!shipment) throw new Error("No se encontró información.");

      let poList: string[] = [];
      if (shipment.selected_pick_ticket_ids) {
        const ids = normalizePickTicketIds(
          shipment.selected_pick_ticket_ids
        );
        const picks = await Promise.all(
          ids.map((id) =>
            fetch(
              `/api/proxy/pick_tickets/${id}?token=${API_TOKEN}&time=${time}`
            )
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null)
          )
        );
        console.log("🚀 RAW pick_tickets responses:", picks);
        poList = extractCustomerPOs(picks as any[]);
      }
      shipment.customer_po = poList.length ? poList.join(", ") : "N/A";
      processShipment(shipment);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  function printLabels() {
    window.print();
  }

  async function exportToPDF() {
    if (!shipmentData || !labelsRef.current || !pdfContainerRef.current)
      return;
    setProcessing(true);

    const clonesRoot = pdfContainerRef.current;
    clonesRoot.innerHTML = "";
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const labelEls = Array.from(
      labelsRef.current.querySelectorAll<HTMLElement>(".label")
    );
    const w = 101.6,
      h = 152.4,
      x = 10,
      y = 10;

    for (let i = 0; i < labelEls.length; i++) {
      if (i > 0) pdf.addPage();
      const clone = labelEls[i].cloneNode(true) as HTMLElement;
      clone.className = "label-pdf";
      clonesRoot.appendChild(clone);

      const canvas = await html2canvas(
        clone,
        {
            scale: 2,
            dpi: 150,
            useCORS: true,
            backgroundColor: null,
        } as any    // ← silence TS here
        );
      const img = canvas.toDataURL("image/png");
      pdf.addImage(img, "PNG", x, y, w, h);
      clonesRoot.removeChild(clone);
    }

    pdf.save("box-labels.pdf");
    setProcessing(false);
  }

  return (
    <>
      <Head>
        <title>Box Labels Generator</title>
      </Head>

      <style jsx global>{`
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
        }
        .no-print {
          display: block;
        }
        @media print {
          .no-print {
            display: none;
          }
        }
        .label {
          width: 101.6mm;
          height: 152.4mm;
          padding: 5mm;
          box-sizing: border-box;
          background: white;
          border: 1px solid #ddd;
          display: flex;
          flex-direction: column;
        }
        .label-header {
          height: 25mm;
          margin-bottom: 0;
          font-size: 12pt;
        }
        .label-cartons {
          height: 8mm;
          font-weight: bold;
          margin: 1mm 0;
        }
        .label-po {
          height: 8mm;
          font-weight: bold;
          margin: 0;
        }
        .label-divider {
          height: 1px;
          background-color: #000;
          margin: 1mm 0;
          width: 100%;
        }
        .label-style {
          display: flex;
          flex-direction: column;
          margin: 2mm 0 0;
          font-size: 10pt;
        }
        .label-style div {
          padding: 1mm 0;
          line-height: 1.2;
          border-bottom: 0.5px solid #eee;
        }
        .label-style div:last-child {
          border: none;
          margin-bottom: 0;
        }
        .label-ship-to {
          margin: 1mm 0 0;
          font-size: 12pt;
          line-height: 1.2;
        }
        .label-ship-to div {
          margin: 0.5mm 0;
        }
        .label-footer {
          margin: 1mm 0 0;
          font-size: 12pt;
          text-align: right;
          font-weight: bold;
        }
        .label-pdf {
          width: 101.6mm;
          height: 152.4mm;
          padding: 5mm;
          box-sizing: border-box;
        }
        .label-pdf-container {
          position: fixed;
          left: -9999px;
          top: 0;
          width: 86mm;
          height: 54mm;
        }
      `}</style>

      {/* CONTROLS */}
      <div className="no-print bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">
          Generador de etiquetas para cajas
        </h1>

        <div className="flex items-center space-x-4">
          <label htmlFor="company-select" className="font-medium text-gray-700">
            Company:
          </label>
          <select
            id="company-select"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="secura">Secura Inc</option>
            <option value="libertad">Libertad Inc</option>
          </select>
        </div>

        <div className="flex items-center space-x-4">
          <label htmlFor="shipmentId" className="font-medium text-gray-700">
            Shipment ID:
          </label>
          <input
            id="shipmentId"
            type="text"
            className="border border-gray-300 rounded-lg px-3 py-2 flex-1 focus:ring-2 focus:ring-blue-400"
            value={shipmentId}
            onChange={(e) => setShipmentId(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") fetchShipment();
            }}
          />
          <button
            onClick={fetchShipment}
            disabled={processing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:bg-gray-400"
          >
            Generar
          </button>
          <button
            onClick={printLabels}
            disabled={!shipmentData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 disabled:bg-gray-400"
          >
            Imprimir
          </button>
          <button
            onClick={exportToPDF}
            disabled={!shipmentData || processing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 disabled:bg-gray-400"
          >
            PDF
          </button>
        </div>

        {error && <div className="text-red-600 font-medium">{error}</div>}
        {processing && (
          <div className="text-gray-600">Processing shipment data…</div>
        )}
      </div>

      {/* LABELS */}
      <div ref={labelsRef} id="labels-container">
        {shipmentData &&
          Object.values(shipmentData.boxes).map((box) => {
            const totalQty = box.items.reduce((s, i) => s + i.qty, 0);
            const sizesDisplay = Object.entries(box.sizes)
              .map(([sz, q]) => `${sz}:${q}`)
              .join(" ");
            const company = COMPANY_DATA[companyId];

            return (
              <div className="label" key={box.boxNumber}>
                <div className="label-header">
                  <strong>FROM:</strong> {company.name}
                  <br />
                  {company.address1}
                  <br />
                  {company.address2}
                </div>
                <div className="label-po">
                  CUSTOMER PO#: {shipmentData.header.customer_po}
                </div>
                <div className="label-divider" />
                <div className="label-cartons">
                  CARTON: {box.boxNumber} of {box.totalBoxes}
                </div>
                <div className="label-style">
                  <div>
                    <strong>STYLE:</strong> {box.styles.join(", ")}
                  </div>
                  <div>
                    <strong>QTY:</strong> {totalQty}
                  </div>
                  <div>
                    <strong>SIZES:</strong> {sizesDisplay}
                  </div>
                  <div>
                    <strong>COLOR:</strong> {box.colors.join(", ")}
                  </div>
                </div>
                <div className="label-divider" />
                <div className="label-ship-to">
                  <div>
                    <strong>SHIP TO:</strong> {shipmentData.header.customer}
                  </div>
                  {shipmentData.header.address1 && (
                    <div>{shipmentData.header.address1}</div>
                  )}
                  {shipmentData.header.address2 && (
                    <div>{shipmentData.header.address2}</div>
                  )}
                  <div>
                    {shipmentData.header.city}, {shipmentData.header.state}{" "}
                    {shipmentData.header.zip}
                  </div>
                  {shipmentData.header.country && (
                    <div>{shipmentData.header.country}</div>
                  )}
                </div>
                <div className="label-footer">
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            );
          })}
      </div>

      {/* PDF clone container */}
      <div
        ref={pdfContainerRef}
        id="pdf-container"
        className="label-pdf-container"
      />
    </>
  );
};

export default BoxLabelsPage;
