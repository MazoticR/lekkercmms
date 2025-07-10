// components/inventory/FinishedLots.tsx

import { useState, useEffect } from "react";
import supabase from "../../lib/supabaseClient";

interface FinishedRow {
  id: string;
  sku: string;
  description: string|null;
  lot_number: string;
  total_yards: number;
  width_pct: number|null;
  length_pct: number|null;
}

export default function FinishedLots({ vendorId }: { vendorId: string }) {
  const [rows, setRows]     = useState<FinishedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!vendorId) return;
    (async () => {
      setLoading(true);
      setError("");

      // 1) fetch finished lots for this vendor
      const { data: lots, error: lotErr } = await supabase
        .from("fabric_lots")
        .select("id,lot_number,total_yards,fabric_item_id")
        .eq("finished", true);
      if (lotErr) { setError(lotErr.message); setLoading(false); return; }

      const itemIds = Array.from(new Set(lots.map((l:any) => l.fabric_item_id)));
      // 2) fetch items
      const { data: items } = await supabase
        .from("fabric_items")
        .select("id,sku,description")
        .in("id", itemIds);
      const itemMap = Object.fromEntries((items||[]).map((i:any) => [i.id, i]));

      // 3) latest shrinkage
      const { data: tests } = await supabase
        .from("shrinkage_tests")
        .select("lot_id,width_pct,length_pct,test_date")
        .order("test_date", { ascending: false });
      const sMap: Record<string,{w:number,l:number}> = {};
      (tests||[]).forEach((t:any) => {
        if (!sMap[t.lot_id]) sMap[t.lot_id] = { w: t.width_pct, l: t.length_pct };
      });

      setRows(lots.map((l:any) => {
        const item = itemMap[l.fabric_item_id] || { sku:"",description:null };
        const shrink = sMap[l.id] || { w:0, l:0 };
        return {
          id: l.id,
          sku: item.sku,
          description: item.description,
          lot_number: l.lot_number,
          total_yards: l.total_yards,
          width_pct: shrink.w,
          length_pct: shrink.l,
        };
      }));
      setLoading(false);
    })();
  }, [vendorId]);

  const rollback = async (id:string) => {
    await supabase.from("fabric_lots").update({ finished: false }).eq("id", id);
    setRows(rows.filter(r => r.id !== id));
  };

  return (
    <section className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Finished Lots</h2>

      {loading ? (
        <p>Loading…</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : rows.length === 0 ? (
        <p>No manually finished lots.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["SKU","Desc","Lot#","Yards","Shrink W×L","Rollback"].map(h=>(
                  <th key={h} className="px-4 py-2 text-left text-xs uppercase text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {rows.map(r => {
                const w = r.width_pct!=null ? r.width_pct.toFixed(2) : "—";
                const l = r.length_pct!=null? r.length_pct.toFixed(2): "—";
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{r.sku}</td>
                    <td className="px-4 py-2">{r.description||"—"}</td>
                    <td className="px-4 py-2">{r.lot_number}</td>
                    <td className="px-4 py-2">{r.total_yards.toFixed(2)}</td>
                    <td className="px-4 py-2">{`${w}×${l}`}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => rollback(r.id)}
                        className="text-blue-600 hover:underline"
                      >
                        Rollback
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}