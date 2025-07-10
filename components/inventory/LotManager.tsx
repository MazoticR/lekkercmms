import { useState, useEffect, useCallback } from "react";
import supabase from "../../lib/supabaseClient";
import { FabricItem } from "./FabricItemsTable";

export interface FabricLot {
  id: string;
  lot_number: string;
  received_at: string;
  total_yards: number;
  rolls: number;
  finished: boolean;
}

interface Props {
  fabricItemId: string;
  fabricItem?: FabricItem;
  onSelectLot?: (lot: FabricLot) => void;
  selectedLotId?: string;
  refresh?: number;
}

export default function LotManager({
  fabricItemId,
  fabricItem,
  onSelectLot,
  selectedLotId,
  refresh = 0,
}: Props) {
  const [lots, setLots] = useState<FabricLot[]>([]);
  const [usageMap, setUsageMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // form
  const [newLot, setNewLot]     = useState("");
  const [newDate, setNewDate]   = useState(new Date().toISOString().slice(0,10));
  const [newYards, setNewYards] = useState(0);
  const [newRolls, setNewRolls] = useState(1);

  // inline-edit
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editYards, setEditYards] = useState(0);
  const [editRolls, setEditRolls] = useState(1);

  const fetchLots = useCallback(async () => {
    if (!fabricItemId) return;
    setLoading(true);
    setError("");
    try {
      const { data: ldata, error: lerr } = await supabase
        .from("fabric_lots")
        .select("id,lot_number,received_at,total_yards,rolls,finished")
        .eq("fabric_item_id", fabricItemId)
        .eq("finished", false)
        .order("received_at", { ascending: false });
      if (lerr) throw lerr;
      setLots(ldata || []);

      const { data: udata, error: uerr } = await supabase
        .from("fabric_usages")
        .select("lot_id,qty_used")
        .eq("fabric_item_id", fabricItemId);
      if (uerr) throw uerr;
      const m: Record<string, number> = {};
      (udata || []).forEach(u => {
        if (u.lot_id) m[u.lot_id] = (m[u.lot_id]||0) + u.qty_used;
      });
      setUsageMap(m);
    } catch (e:any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fabricItemId]);

  useEffect(() => {
    fetchLots();
  }, [fetchLots, refresh]);

  const filtered = lots.filter(l =>
    l.lot_number.toLowerCase().includes(search.toLowerCase())
  );

  const addLot = async () => {
    if (!newLot.trim() || newYards<=0||newRolls<=0) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("fabric_lots").insert({
        fabric_item_id: fabricItemId,
        lot_number: newLot.trim(),
        received_at: newDate,
        total_yards: newYards,
        rolls: newRolls,
        finished: false,
      });
      if (error) throw error;
      setNewLot(""); setNewDate(new Date().toISOString().slice(0,10));
      setNewYards(0); setNewRolls(1);
      await fetchLots();
    } catch(e:any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const finishLot = async (id:string) => {
    setLoading(true);
    await supabase.from("fabric_lots").update({ finished: true }).eq("id", id);
    onSelectLot?.(null as any);
    await fetchLots();
    setLoading(false);
  };

  const saveEdit = async (lot:FabricLot) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("fabric_lots")
        .update({ total_yards: editYards, rolls: editRolls })
        .eq("id", lot.id);
      if (error) throw error;
      setEditingId(null);
      await fetchLots();
    } catch(e:any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!fabricItemId) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-xl font-semibold">
          Lots for <span className="font-medium">{fabricItem?.sku}</span>
        </h2>
        <input
          type="text"
          placeholder="Search Lot#…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-1/3 focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Add Lot */}
      <form
        onSubmit={e => { e.preventDefault(); addLot(); }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <input
          type="text"
          placeholder="Lot #"
          value={newLot}
          onChange={e => setNewLot(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="date"
          value={newDate}
          onChange={e => setNewDate(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="number"
          min={0}
          step={0.01}
          placeholder="Total Yards"
          value={newYards}
          onChange={e => setNewYards(parseFloat(e.target.value)||0)}
          className="border rounded px-3 py-2"
        />
        <input
          type="number"
          min={1}
          placeholder="Rolls"
          value={newRolls}
          onChange={e => setNewRolls(parseInt(e.target.value)||1)}
          className="border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 md:col-span-4"
        >
          Add Lot
        </button>
      </form>

      {error && <p className="text-red-600">{error}</p>}

      {/* Lots Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Lot#","Date","Yards","Used","Remain","Rolls","Edit","Finish"].map(h => (
                <th
                  key={h}
                  className="px-4 py-2 text-left text-xs uppercase text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filtered.map(lot => {
              const used = usageMap[lot.id]||0;
              const rem  = Math.max(lot.total_yards - used,0);
              const editing = editingId===lot.id;

              return (
                <tr key={lot.id} className="hover:bg-gray-50">
                  <td
                    className="px-4 py-2 cursor-pointer"
                    onClick={() => onSelectLot?.(lot)}
                  >
                    {lot.lot_number}
                  </td>
                  <td className="px-4 py-2">{lot.received_at}</td>
                  <td className="px-4 py-2">
                    {editing ? (
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={editYards}
                        onChange={e=>setEditYards(parseFloat(e.target.value)||0)}
                        className="w-20 border rounded px-1 py-1"
                      />
                    ) : (
                      lot.total_yards.toFixed(2)
                    )}
                  </td>
                  <td className="px-4 py-2">{used.toFixed(2)}</td>
                  <td className="px-4 py-2">{rem.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    {editing ? (
                      <input
                        type="number"
                        min={1}
                        value={editRolls}
                        onChange={e=>setEditRolls(parseInt(e.target.value)||1)}
                        className="w-16 border rounded px-1 py-1"
                      />
                    ) : (
                      lot.rolls
                    )}
                  </td>
                  <td className="px-4 py-2 space-x-2">
                    {editing ? (
                      <>
                        <button
                          onClick={()=>saveEdit(lot)}
                          disabled={loading}
                          className="text-green-600 hover:underline"
                        >
                          Save
                        </button>
                        <button
                          onClick={()=>setEditingId(null)}
                          className="text-gray-600 hover:underline"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={e=>{e.stopPropagation(); setEditingId(lot.id); setEditYards(lot.total_yards); setEditRolls(lot.rolls)}}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={e=>{e.stopPropagation(); finishLot(lot.id)}}
                      className="text-red-600 hover:underline"
                    >
                      Finish
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}