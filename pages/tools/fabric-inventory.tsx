// pages/tools/fabric-inventory.tsx

import Head from "next/head";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import supabase from "../../lib/supabaseClient";
import VendorTabs from "../../components/inventory/VendorTabs";
import FabricItemsTable, { FabricItem } from "../../components/inventory/FabricItemsTable";
import LotManager, { FabricLot }        from "../../components/inventory/LotManager";
import ShrinkageTests                    from "../../components/inventory/ShrinkageTests";
import UsageLogger                       from "../../components/inventory/UsageLogger";
import UsageLogs                         from "../../components/inventory/UsageLogs";
import FinishedLots                      from "../../components/inventory/FinishedLots";

export default function FabricInventoryPage() {
  const [vendorId, setVendorId]         = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<FabricItem | null>(null);
  const [selectedLot, setSelectedLot]   = useState<FabricLot | null>(null);
  const [view, setView]                 = useState<"inventory"|"logs"|"finished">("inventory");
  const [lotRefresh, setLotRefresh]     = useState(0);

  // clear selections on vendor switch
  useEffect(() => {
    setSelectedItem(null);
    setSelectedLot(null);
  }, [vendorId]);

  // Excel export
  const exportExcel = async () => {
    if (!vendorId) return;

    const { data: rawItems } = await supabase
      .from("fabric_items")
      .select("id,sku,description")
      .eq("vendor_id", vendorId);
    const items = rawItems ?? [];
    const itemMap = Object.fromEntries(items.map(i => [i.id, i]));

    const itemIds = items.map(i => i.id);
    const { data: rawLots } = await supabase
      .from("fabric_lots")
      .select("id,lot_number,total_yards,rolls,fabric_item_id")
      .in("fabric_item_id", itemIds);
    const lots = rawLots ?? [];

    const lotIds = lots.map(l => l.id);
    const { data: rawTests } = await supabase
      .from("shrinkage_tests")
      .select("lot_id,width_pct,length_pct,test_date")
      .in("lot_id", lotIds)
      .order("test_date", { ascending: false });
    const tests = rawTests ?? [];

    // build shrink map
    const shrinkMap: Record<string,{w:number,l:number}> = {};
    tests.forEach(t => {
      if (!shrinkMap[t.lot_id]) {
        shrinkMap[t.lot_id] = { w: t.width_pct, l: t.length_pct };
      }
    });

    const rows = lots.map(l => {
      const itm = itemMap[l.fabric_item_id] || { sku: "", description: "" };
      const sh  = shrinkMap[l.id] || { w: 0, l: 0 };
      return {
        SKU: itm.sku,
        DESCRIPTION: itm.description,
        "TOTAL YDS": l.total_yards,
        "LOT#": l.lot_number,
        ROLLS: l.rolls,
        SHRINKAGE: `${sh.w.toFixed(2)}×${sh.l.toFixed(2)}`,
      };
    });

    const ws = (XLSX.utils as any).json_to_sheet(rows);
    const wb: XLSX.WorkBook = { SheetNames: ["Inventory"], Sheets: { Inventory: ws } };
    XLSX.writeFile(wb, `fabric_inventory_${vendorId}.xlsx`);
  };

  return (
    <>
      <Head>
        <title>Fabric Inventory</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <main className="max-w-5xl mx-auto px-4 space-y-8">
          <h1 className="text-3xl font-bold text-center">Fabric Inventory</h1>

          <VendorTabs activeVendorId={vendorId} onVendorChange={setVendorId} />

          {vendorId && (
            <div className="flex gap-2 bg-white p-4 rounded-lg shadow-md">
              <button
                onClick={() => setView("inventory")}
                className={`px-4 py-2 rounded-lg ${
                  view === "inventory" ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                Inventory
              </button>
              <button
                onClick={() => setView("logs")}
                className={`px-4 py-2 rounded-lg ${
                  view === "logs" ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                Usage Logs
              </button>
              <button
                onClick={() => setView("finished")}
                className={`px-4 py-2 rounded-lg ${
                  view === "finished" ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                Finished
              </button>
            </div>
          )}

          {vendorId && view === "inventory" && (
            <>
              {/* Export button */}
              <div className="flex justify-end">
                <button
                  onClick={exportExcel}
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  Export Excel
                </button>
              </div>

              {/* Items with search & add form */}
              <FabricItemsTable
                vendorId={vendorId}
                selectedItemId={selectedItem?.id}
                onSelectItem={itm => {
                  setSelectedItem(itm);
                  setSelectedLot(null);
                }}
              />

              {/* Lots with search & add form */}
              {selectedItem ? (
                <LotManager
                  fabricItemId={selectedItem.id}
                  fabricItem={selectedItem}
                  selectedLotId={selectedLot?.id}
                  onSelectLot={setSelectedLot}
                  refresh={lotRefresh}
                />
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-600">
                  Select an item above to manage lots
                </div>
              )}

              {/* Shrinkage tests and usage logger */}
              {selectedLot && (
                <ShrinkageTests
                  lotId={selectedLot.id}
                  lotNumber={selectedLot.lot_number}
                />
              )}
              <UsageLogger
                vendorId={vendorId}
                onUsageLogged={() => setLotRefresh(c => c + 1)}
              />
            </>
          )}

          {vendorId && view === "logs" && (
            <UsageLogs vendorId={vendorId} />
          )}

          {vendorId && view === "finished" && (
            <FinishedLots vendorId={vendorId} />
          )}
        </main>
      </div>
    </>
  );
}