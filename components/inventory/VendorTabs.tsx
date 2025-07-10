// components/inventory/VendorTabs.tsx

import { useEffect, useState } from "react";
import supabase from "../../lib/supabaseClient";

export default function VendorTabs({
  activeVendorId,
  onVendorChange,
}: {
  activeVendorId: string;
  onVendorChange: (id: string) => void;
}) {
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) setError(error.message);
      else if (data) {
        setVendors(data);
        if (!activeVendorId && data.length) {
          onVendorChange(data[0].id);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const addVendor = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from("vendors")
      .insert({ name: newName.trim() });
    if (error) setError(error.message);
    else {
      setNewName("");
      setShowAdd(false);
      const { data } = await supabase
        .from("vendors")
        .select("id, name")
        .order("name", { ascending: true });
      if (data) {
        setVendors(data);
        onVendorChange(data[0].id);
      }
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        {loading ? (
          <span className="text-gray-600">Loading vendors…</span>
        ) : (
          vendors.map((v) => (
            <button
              key={v.id}
              onClick={() => onVendorChange(v.id)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                v.id === activeVendorId
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {v.name}
            </button>
          ))
        )}

        <button
          onClick={() => setShowAdd((b) => !b)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          + Vendor
        </button>
      </div>

      {showAdd && (
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New vendor name"
            className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400"
          />
          <button
            onClick={addVendor}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Add
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  );
}