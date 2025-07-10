// components/inventory/UsageLogs.tsx

import { useState, useEffect } from "react";
import supabase from "../../lib/supabaseClient";

interface UsageLog {
  id: string;
  usage_date: string;
  qty_used: number;
  notes: string | null;
  sku: string;
  lot_number: string | null;
}

interface Props {
  vendorId: string;
}

export default function UsageLogs({ vendorId }: Props) {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!vendorId) return;

    (async () => {
      setLoading(true);
      setError("");

      // 1) fetch all items for this vendor
      const { data: items, error: itemsErr } = await supabase
        .from("fabric_items")
        .select("id, sku")
        .eq("vendor_id", vendorId);
      if (itemsErr) {
        setError(itemsErr.message);
        setLoading(false);
        return;
      }
      const itemMap = Object.fromEntries(
        (items || []).map((i) => [i.id, i.sku])
      );
      const itemIds = (items || []).map((i) => i.id);

      // 2) fetch usages for those items
      const { data: usages, error: usagesErr } = await supabase
        .from("fabric_usages")
        .select("id, usage_date, qty_used, notes, fabric_item_id, lot_id")
        .in("fabric_item_id", itemIds)
        .order("usage_date", { ascending: false });
      if (usagesErr) {
        setError(usagesErr.message);
        setLoading(false);
        return;
      }

      // 3) fetch lot numbers for any lot_id in usages
      const lotIds = Array.from(
        new Set((usages || []).map((u) => u.lot_id).filter(Boolean))
      ) as string[];
      const { data: lots, error: lotsErr } = await supabase
        .from("fabric_lots")
        .select("id, lot_number")
        .in("id", lotIds);
      if (lotsErr) {
        setError(lotsErr.message);
        setLoading(false);
        return;
      }
      const lotMap = Object.fromEntries(
        (lots || []).map((l) => [l.id, l.lot_number])
      );

      // 4) assemble logs
      const formatted: UsageLog[] = (usages || []).map((u) => ({
        id: u.id,
        usage_date: u.usage_date,
        qty_used: u.qty_used,
        notes: u.notes,
        sku: itemMap[u.fabric_item_id] || "—",
        lot_number: u.lot_id ? lotMap[u.lot_id] || "—" : "—",
      }));

      setLogs(formatted);
      setLoading(false);
    })();
  }, [vendorId]);

  return (
    <section className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Usage Logs</h2>

      {loading ? (
        <p>Loading logs…</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : logs.length === 0 ? (
        <p>No usage logged yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Date", "SKU", "Lot #", "Qty Used", "Notes"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{log.usage_date}</td>
                  <td className="px-4 py-2">{log.sku}</td>
                  <td className="px-4 py-2">{log.lot_number}</td>
                  <td className="px-4 py-2">{log.qty_used}</td>
                  <td className="px-4 py-2">{log.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}