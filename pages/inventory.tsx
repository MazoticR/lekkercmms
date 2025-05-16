import { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';
import { Database } from '../types/db_types';

type InventoryPart = Database['inventory_parts']['Row'];

export default function InventoryPage() {
  const [parts, setParts] = useState<InventoryPart[]>([]);
  const [partNumber, setPartNumber] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [cost, setCost] = useState<number | null>(null);

  useEffect(() => { fetchParts(); }, []);

  async function fetchParts() {
    const { data, error } = await supabase
      .from('inventory_parts')
      .select('*')
      .order('last_updated', { ascending: false });
    if (error) console.error('Error fetching inventory:', error);
    else setParts(data || []);
  }

  async function addPart(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase
      .from('inventory_parts')
      .insert({ part_number: partNumber, description, quantity, cost });
    if (error) console.error('Error adding part:', error);
    else {
      setPartNumber('');
      setDescription('');
      setQuantity(0);
      setCost(null);
      fetchParts();
    }
  }

  async function updateQuantity(id: number, newQuantity: number) {
    const { error } = await supabase
      .from('inventory_parts')
      .update({ quantity: newQuantity, last_updated: new Date().toISOString() })
      .eq('id', id);
    if (error) console.error('Error updating quantity:', error);
    else fetchParts();
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Inventory Management</h1>
      
      {/* Add Part Form */}
      <form onSubmit={addPart} className="bg-white p-4 rounded shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Part Number"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            required
            className="p-2 border rounded"
          />
          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="p-2 border rounded"
          />
          <input
            type="number"
            placeholder="Cost"
            value={cost || ''}
            onChange={(e) => setCost(e.target.value ? parseFloat(e.target.value) : null)}
            className="p-2 border rounded"
          />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Add Part
        </button>
      </form>

      {/* Inventory Table */}
      <table className="min-w-full bg-white rounded-lg shadow overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-2 px-4 text-left">Part Number</th>
            <th className="py-2 px-4 text-left">Description</th>
            <th className="py-2 px-4 text-left">Quantity</th>
            <th className="py-2 px-4 text-left">Cost</th>
            <th className="py-2 px-4 text-left">Last Updated</th>
            <th className="py-2 px-4 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part) => (
            <tr key={part.id} className={part.quantity <= part.min_quantity ? 'bg-red-50' : ''}>
              <td className="py-2 px-4 border-b">{part.part_number}</td>
              <td className="py-2 px-4 border-b">{part.description || 'N/A'}</td>
              <td className={`py-2 px-4 border-b font-medium ${
                part.quantity <= part.min_quantity ? 'text-red-600' : ''
              }`}>
                {part.quantity}
              </td>
              <td className="py-2 px-4 border-b">{part.cost ? `$${part.cost.toFixed(2)}` : 'N/A'}</td>
              <td className="py-2 px-4 border-b">
                {new Date(part.last_updated).toLocaleString()}
              </td>
              <td className="py-2 px-4 border-b">
                <button
                  onClick={() => updateQuantity(part.id, part.quantity + 1)}
                  className="text-green-600 hover:text-green-800 mr-2"
                >
                  +1
                </button>
                <button
                  onClick={() => updateQuantity(part.id, part.quantity - 1)}
                  className="text-red-600 hover:text-red-800"
                >
                  -1
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}