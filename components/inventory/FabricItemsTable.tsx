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
  const [items, setItems]     = useState<FabricItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");

  const [newSKU, setNewSKU]   = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("fabric_items")
        .select("id,sku,description")
        .eq("vendor_id", vendorId)
        .order("sku", { ascending: true });
      if (error) setError(error.message);
      else setItems(data || []);
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
      // reload
      const { data } = await supabase
        .from("fabric_items")
        .select("id,sku,description")
        .eq("vendor_id", vendorId)
        .order("sku", { ascending: true });
      setItems(data || []);
    }
    setLoading(false);
  };

  const filtered = items.filter(
    i =>
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      (i.description || "")
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-xl font-semibold">Fabric Items</h2>
        <input
          type="text"
          placeholder="Search SKU or description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-1/3 focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Add Item Form */}
      <form
        onSubmit={e => {
          e.preventDefault();
          addItem();
        }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <input
          type="text"
          placeholder="SKU"
          value={newSKU}
          onChange={e => setNewSKU(e.target.value)}
          className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="text"
          placeholder="Description"
          value={newDesc}
          onChange={e => setNewDesc(e.target.value)}
          className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          Add Item
        </button>
      </form>

      {error && <p className="text-red-600">{error}</p>}

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs uppercase text-gray-500">
                SKU
              </th>
              <th className="px-4 py-2 text-left text-xs uppercase text-gray-500">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filtered.map(it => (
              <tr
                key={it.id}
                onClick={() => onSelectItem?.(it)}
                className={`cursor-pointer hover:bg-gray-100 ${
                  it.id === selectedItemId ? "bg-blue-50" : ""
                }`}
              >
                <td className="px-4 py-2">{it.sku}</td>
                <td className="px-4 py-2">{it.description || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}