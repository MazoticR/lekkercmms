// components/inventory/UsageLogger.tsx
import { useState, useEffect } from "react";
import supabase from "../../lib/supabaseClient";

interface FabricItem { id: string; sku: string; description: string|null; }
interface FabricLot  { id: string; lot_number: string; total_yards: number; rolls: number; }

export default function UsageLogger({
  vendorId,
  onUsageLogged,
}: {
  vendorId: string;
  onUsageLogged?: () => void;
}) {
  const [items, setItems]           = useState<FabricItem[]>([]);
  const [lots,  setLots]            = useState<FabricLot[]>([]);
  const [usageMap, setUsageMap]     = useState<Record<string,number>>({});
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingLots, setLoadingLots]    = useState(false);
  const [submitting, setSubmitting]      = useState(false);
  const [error, setError]                = useState("");

  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedLotId,  setSelectedLotId]  = useState("");
  const [usageDate,      setUsageDate]      = useState(new Date().toISOString().slice(0,10));
  const [qtyUsed,        setQtyUsed]        = useState(0);
  const [notes,          setNotes]          = useState("");

  // load items
  useEffect(() => {
    async function load() {
      setLoadingItems(true);
      const { data, error } = await supabase
        .from("fabric_items")
        .select("id, sku, description")
        .eq("vendor_id", vendorId)
        .order("sku", { ascending: true });
      if (error) setError(error.message);
      else setItems(data||[]);
      setLoadingItems(false);
    }
    if (vendorId) load();
  }, [vendorId]);

  // load lots + usages
  useEffect(() => {
    if (!selectedItemId) {
      setLots([]); setUsageMap({}); setSelectedLotId("");
      return;
    }
    async function load() {
      setLoadingLots(true);
      setError("");

      // lots
      const { data: ld, error: le } = await supabase
        .from("fabric_lots")
        .select("id, lot_number, total_yards, rolls")
        .eq("fabric_item_id", selectedItemId)
        .order("received_at", { ascending: false });
      if (le) setError(le.message);
      else setLots(ld||[]);

      // usages
      const { data: ud, error: ue } = await supabase
        .from("fabric_usages")
        .select("lot_id, qty_used")
        .eq("fabric_item_id", selectedItemId);
      if (ue) setError(ue.message);
      else {
        const m: Record<string,number> = {};
        (ud||[]).forEach((u:any) => {
          if (u.lot_id) m[u.lot_id] = (m[u.lot_id]||0) + u.qty_used;
        });
        setUsageMap(m);
      }

      setLoadingLots(false);
    }
    load();
  }, [selectedItemId]);

  // submit
  const submitUsage = async () => {
    if (!selectedItemId || qtyUsed <= 0) {
      setError("Select item & enter valid qty");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("fabric_usages").insert({
      usage_date: usageDate,
      fabric_item_id: selectedItemId,
      lot_id: selectedLotId||null,
      qty_used: qtyUsed,
      notes: notes.trim()||null,
    });
    if (error) setError(error.message);
    else {
      setSelectedItemId("");
      setSelectedLotId("");
      setQtyUsed(0);
      setNotes("");
      onUsageLogged?.();
    }
    setSubmitting(false);
  };

  return (
    <section className="bg-white p-6 rounded-lg shadow-md space-y-6">
      <h2 className="text-xl font-semibold">Log Fabric Usage</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Item */}
        <div>
          <label className="block mb-1">Item</label>
          <select
            value={selectedItemId}
            onChange={e=>setSelectedItemId(e.target.value)}
            disabled={loadingItems}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">— select item —</option>
            {items.map(it=>(
              <option key={it.id} value={it.id}>
                {it.sku}{it.description?` — ${it.description}`:""}
              </option>
            ))}
          </select>
        </div>

        {/* Lot: show remaining */}
        <div>
          <label className="block mb-1">Lot (optional)</label>
          <select
            value={selectedLotId}
            onChange={e=>setSelectedLotId(e.target.value)}
            disabled={!selectedItemId||loadingLots}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">FIFO (no specific lot)</option>
            {lots.map(l=> {
              const used = usageMap[l.id]||0;
              const rem  = Math.max(l.total_yards - used,0);
              return (
                <option key={l.id} value={l.id}>
                  {l.lot_number} ({rem.toFixed(2)})
                </option>
              );
            })}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block mb-1">Date</label>
          <input
            type="date"
            value={usageDate}
            onChange={e=>setUsageDate(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block mb-1">Qty Used</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={qtyUsed}
            onChange={e=>setQtyUsed(parseFloat(e.target.value)||0)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={e=>setNotes(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Optional"
          />
        </div>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <div className="text-right">
        <button
          onClick={submitUsage}
          disabled={submitting}
          className="px-5 py-2 bg-indigo-600 text-white rounded disabled:bg-gray-400"
        >
          {submitting ? "Saving…" : "Log Usage"}
        </button>
      </div>
    </section>
  );
}