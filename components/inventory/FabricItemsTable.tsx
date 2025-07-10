// components/inventory/FabricItemsTable.tsx

import { useState, useEffect } from "react";
import supabase from "../../lib/supabaseClient";

export interface FabricItem {
  id: string;
  sku: string;
  description: string | null;
}

interface Props {
  vendorId: string;
  onSelectItem?: (item: FabricItem) => void;
  selectedItemId?: string;
}

export default function FabricItemsTable({
  vendorId,
  onSelectItem,
  selectedItemId,
}: Props) {
  const [items, setItems]   = useState<FabricItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [newSKU, setNewSKU]   = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("fabric_items")
        .select("id, sku, description")
        .eq("vendor_id", vendorId)
        .order("sku", { ascending: true });
      if (error) setError(error.message);
      else if (data) setItems(data);
      setLoading(false);
    }
    if (vendorId) load();
  }, [vendorId]);

  const addItem = async () => {
    if (!newSKU.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("fabric_items").insert({
      vendor_id: vendorId,
      sku: newSKU.trim(),
      description: newDesc.trim() || null,
    });
    if (error) setError(error.message);
    else {
      setNewSKU("");
      setNewDesc("");
      const { data } = await supabase
        .from("fabric_items")
        .select("id, sku, description")
        .eq("vendor_id", vendorId)
        .order("sku", { ascending: true });
      if (data) setItems(data);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">
        Fabric Items
      </h2>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="SKU"
          value={newSKU}
          onChange={(e) => setNewSKU(e.target.value)}
          className="w-32 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="text"
          placeholder="Description"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={addItem}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Add Item
        </button>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      {loading ? (
        <p className="text-gray-600">Loading items…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  SKU
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {items.map((itm) => (
                <tr
                  key={itm.id}
                  onClick={() => onSelectItem?.(itm)}
                  className={`cursor-pointer hover:bg-gray-100 ${
                    itm.id === selectedItemId ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="px-4 py-2">{itm.sku}</td>
                  <td className="px-4 py-2">{itm.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}