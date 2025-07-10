// components/inventory/ShrinkageTests.tsx

import { useState, useEffect } from "react";
import supabase from "../../lib/supabaseClient";

export interface ShrinkageTest {
  id: string;
  test_date: string;
  width_pct: number;
  length_pct: number;
  notes: string | null;
}

interface Props {
  lotId: string;
  lotNumber?: string;
}

export default function ShrinkageTests({
  lotId,
  lotNumber,
}: Props) {
  const [tests, setTests]     = useState<ShrinkageTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [newDate, setNewDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [newW, setNewW]       = useState<number>(0);
  const [newL, setNewL]       = useState<number>(0);
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    if (!lotId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("shrinkage_tests")
        .select("id, test_date, width_pct, length_pct, notes")
        .eq("lot_id", lotId)
        .order("test_date", { ascending: false });
      if (error) setError(error.message);
      else setTests(data || []);
      setLoading(false);
    })();
  }, [lotId]);

  const addTest = async () => {
    if (newW <= 0 && newL <= 0) return;
    setLoading(true);
    const { error } = await supabase.from("shrinkage_tests").insert({
      lot_id: lotId,
      test_date: newDate,
      width_pct: newW,
      length_pct: newL,
      notes: newNotes.trim() || null,
    });
    if (error) setError(error.message);
    else {
      setNewW(0);
      setNewL(0);
      setNewNotes("");
      // reload
      const { data } = await supabase
        .from("shrinkage_tests")
        .select("id, test_date, width_pct, length_pct, notes")
        .eq("lot_id", lotId)
        .order("test_date", { ascending: false });
      if (data) setTests(data);
    }
    setLoading(false);
  };

  if (!lotId) return null;
  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
      <h2 className="text-xl font-semibold border-b pb-2">
        Shrinkage Tests for Lot <span className="font-medium">{lotNumber}</span>
      </h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTest();
        }}
        className="grid grid-cols-1 md:grid-cols-5 gap-4"
      >
        <div>
          <label className="block text-sm text-gray-700">Date</label>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">W% shrink</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={newW}
            onChange={(e) => setNewW(parseFloat(e.target.value) || 0)}
            className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400"
            placeholder="5.00"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">L% shrink</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={newL}
            onChange={(e) => setNewL(parseFloat(e.target.value) || 0)}
            className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400"
            placeholder="2.00"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-700">Notes</label>
          <input
            type="text"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400"
            placeholder="Optional"
          />
        </div>
        <div className="md:col-span-5 text-right">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
          >
            {loading ? "Adding…" : "Add Test"}
          </button>
        </div>
      </form>

      {error && <p className="text-red-600">{error}</p>}

      {tests.length === 0 ? (
        <p className="text-gray-600">No shrinkage tests yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Date", "W%","L%","Notes"].map((h) => (
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
              {tests.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{t.test_date}</td>
                  <td className="px-4 py-2">{t.width_pct.toFixed(2)}</td>
                  <td className="px-4 py-2">{t.length_pct.toFixed(2)}</td>
                  <td className="px-4 py-2">{t.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}