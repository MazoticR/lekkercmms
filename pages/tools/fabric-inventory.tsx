// pages/tools/fabric-inventory.tsx

import Head from "next/head";
import { useState, useEffect } from "react";
import VendorTabs from "../../components/inventory/VendorTabs";
import FabricItemsTable, { FabricItem } from "../../components/inventory/FabricItemsTable";
import LotManager, { FabricLot } from "../../components/inventory/LotManager";
import ShrinkageTests from "../../components/inventory/ShrinkageTests";
import UsageLogger from "../../components/inventory/UsageLogger";
import UsageLogs from "../../components/inventory/UsageLogs";
import FinishedLots from "../../components/inventory/FinishedLots";

export default function FabricInventoryPage() {
  const [vendorId, setVendorId]             = useState<string>("");
  const [selectedItem, setSelectedItem]     = useState<FabricItem | null>(null);
  const [selectedLot, setSelectedLot]       = useState<FabricLot | null>(null);
  const [view, setView]                     = useState<"inventory"|"logs"|"finished">("inventory");
  const [lotRefresh, setLotRefresh]         = useState(0);

  // Clear item & lot selection whenever the vendor changes
  useEffect(() => {
    setSelectedItem(null);
    setSelectedLot(null);
  }, [vendorId]);

  return (
    <>
      <Head>
        <title>Fabric Inventory</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <main className="max-w-5xl mx-auto px-4 space-y-8">
          <h1 className="text-3xl font-bold text-center">Fabric Inventory</h1>

          {/* Vendor selector */}
          <VendorTabs
            activeVendorId={vendorId}
            onVendorChange={setVendorId}
          />

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
                Logs
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
              <FabricItemsTable
                vendorId={vendorId}
                selectedItemId={selectedItem?.id}
                onSelectItem={(itm) => {
                  setSelectedItem(itm);
                  setSelectedLot(null);
                }}
              />

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
                  Select an item above to view lots
                </div>
              )}

              {selectedLot && (
                <ShrinkageTests
                  lotId={selectedLot.id}
                  lotNumber={selectedLot.lot_number}
                />
              )}

              <UsageLogger
                vendorId={vendorId}
                onUsageLogged={() => setLotRefresh((c) => c + 1)}
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