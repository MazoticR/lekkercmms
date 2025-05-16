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
  const [minQuantity, setMinQuantity] = useState(1);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [editingPart, setEditingPart] = useState<InventoryPart | null>(null);
  const [editQuantity, setEditQuantity] = useState(0);

  useEffect(() => {
    fetchParts();
  }, []);

  async function fetchParts() {
    const { data, error } = await supabase
      .from('inventory_parts')
      .select('*')
      .order('part_number', { ascending: true });
      
    if (error) {
      console.error('Error fetching inventory:', error);
      showNotification('Failed to load inventory', 'error');
    } else {
      setParts(data || []);
    }
  }

  async function addPart(e: React.FormEvent) {
    e.preventDefault();
    if (!partNumber.trim()) {
      showNotification('Part number is required', 'error');
      return;
    }

    // Check if part exists to accumulate quantity
    const existingPart = parts.find(p => p.part_number === partNumber.trim());
    const newQuantity = existingPart ? existingPart.quantity + (quantity || 0) : (quantity || 0);

    const { data, error } = await supabase
      .from('inventory_parts')
      .upsert(
        {
          part_number: partNumber.trim(),
          description: description.trim() || null,
          quantity: newQuantity,
          cost: cost || null,
          min_quantity: minQuantity || 1,
          last_updated: new Date().toISOString()
        },
        {
          onConflict: 'part_number',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving part:', error);
      showNotification(`Error: ${error.message}`, 'error');
    } else {
      const action = existingPart ? 'Updated' : 'Added';
      showNotification(`${action} part ${partNumber}`, 'success');
      resetForm();
      fetchParts();
    }
  }

  function resetForm() {
    setPartNumber('');
    setDescription('');
    setQuantity(0);
    setCost(null);
    setMinQuantity(1);
  }

  function showNotification(message: string, type: 'success' | 'error') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }

  function openEditModal(part: InventoryPart) {
    setEditingPart(part);
    setEditQuantity(part.quantity);
  }

  async function saveModifiedPart() {
    if (!editingPart) return;

    const { error } = await supabase
      .from('inventory_parts')
      .update({
        quantity: editQuantity,
        last_updated: new Date().toISOString()
      })
      .eq('id', editingPart.id);

    if (error) {
      console.error('Error updating quantity:', error);
      showNotification('Failed to update quantity', 'error');
    } else {
      showNotification(`Updated quantity for ${editingPart.part_number}`, 'success');
      setEditingPart(null);
      fetchParts();
    }
  }

  return (
    <div className="p-8 relative">
      {/* Notification System */}
      {notification && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 flex items-center ${
            notification.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-4 text-lg font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Modify Modal */}
      {editingPart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              Modify {editingPart.part_number}
            </h3>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                value={editQuantity}
                onChange={(e) => setEditQuantity(Number(e.target.value))}
                min="0"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setEditingPart(null)}
                className="px-4 py-2 border border-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={saveModifiedPart}
                className="px-4 py-2 bg-purple-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-6 text-gray-800">Inventory Management</h1>

      {/* Add/Update Part Form */}
      <form onSubmit={addPart} className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Part Number *"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            required
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="number"
            placeholder="Quantity to Add"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            min="0"
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="number"
            placeholder="Cost"
            value={cost || ''}
            onChange={(e) => setCost(e.target.value ? parseFloat(e.target.value) : null)}
            step="0.01"
            min="0"
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="number"
            placeholder="Min Quantity"
            value={minQuantity}
            onChange={(e) => setMinQuantity(Number(e.target.value))}
            min="1"
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition duration-200"
        >
          {parts.some(p => p.part_number === partNumber) ? 'Add Stock' : 'Add New Part'}
        </button>
      </form>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {parts.length > 0 ? (
              parts.map((part) => (
                <tr 
                  key={part.id} 
                  className={part.quantity <= part.min_quantity ? 'bg-red-50' : 'hover:bg-gray-50'}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{part.part_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{part.description || 'N/A'}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    part.quantity <= part.min_quantity ? 'text-red-600 font-bold' : 'text-gray-500'
                  }`}>
                    {part.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {part.cost ? `$${part.cost.toFixed(2)}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {part.min_quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(part.last_updated).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => openEditModal(part)}
                      className="text-purple-600 hover:text-purple-800 underline"
                    >
                      Modify
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">No inventory parts found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}