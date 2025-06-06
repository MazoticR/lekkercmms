import { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';
import { Database } from '../types/db_types';
import Head from 'next/head';

type InventoryPart = Database['inventory_parts']['Row'];
type AffectedMachine = {
  id: number;
  machine_number: string | null;
  description: string | null;
};

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
  const [editingPart, setEditingPart] = useState<Partial<InventoryPart> | null>(null);
  const [editingField, setEditingField] = useState<keyof InventoryPart | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: number;
    affectedMachines: AffectedMachine[];
  } | null>(null);

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

    const existingPart = parts.find(p => p.part_number === partNumber.trim());
    const newQuantity = existingPart ? existingPart.quantity + (quantity || 0) : (quantity || 0);

    const { data, error } = await supabase
      .from('inventory_parts')
      .upsert(
        {
          part_number: partNumber.trim(),
          description: existingPart ? existingPart.description : description.trim() || null,
          quantity: newQuantity,
          cost: existingPart ? existingPart.cost : cost || null,
          min_quantity: existingPart ? existingPart.min_quantity : minQuantity || 1,
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
      const action = existingPart ? 'Added stock to' : 'Added new part';
      showNotification(`${action} ${partNumber}`, 'success');
      resetForm();
      fetchParts();
    }
  }

  async function prepareDelete(id: number) {
    const { data: machineParts, error } = await supabase
      .from('machine_parts')
      .select('id, machine_id')
      .eq('inventory_part_id', id);

    if (error) {
      console.error(error);
      showNotification('Failed to check dependencies', 'error');
      return;
    }

    const affectedMachines = await Promise.all(
      (machineParts || []).map(async (part) => {
        const { data: machine } = await supabase
          .from('machines')
          .select('machine_number, description')
          .eq('id', part.machine_id)
          .single();

        return {
          id: part.id,
          machine_number: machine?.machine_number || null,
          description: machine?.description || null
        };
      })
    );

    setConfirmDelete({
      id,
      affectedMachines
    });
  }

  async function deletePart() {
    if (!confirmDelete) return;

    try {
      // First break the relationship in machine_parts
      const { error: clearError } = await supabase
        .from('machine_parts')
        .update({ inventory_part_id: null })
        .eq('inventory_part_id', confirmDelete.id);

      if (clearError) throw clearError;

      // Then delete the inventory part
      const { error: deleteError } = await supabase
        .from('inventory_parts')
        .delete()
        .eq('id', confirmDelete.id);

      if (deleteError) throw deleteError;

      showNotification(
        'Part deleted (kept in machine history)',
        'success'
      );
      fetchParts();
    } catch (error) {
      console.error('Deletion error:', error);
      showNotification('Failed to delete part', 'error');
    } finally {
      setConfirmDelete(null);
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

  function startEditing(part: InventoryPart, field: keyof InventoryPart) {
    setEditingPart(part);
    setEditingField(field);
  }

  async function saveEdit() {
    if (!editingPart || !editingField) return;

    const updateData = {
      [editingField]: editingPart[editingField],
      last_updated: new Date().toISOString()
    };

    const { error } = await supabase
      .from('inventory_parts')
      .update(updateData)
      .eq('id', editingPart.id);

    if (error) {
      console.error('Error updating part:', error);
      showNotification('Failed to update part', 'error');
    } else {
      showNotification(`Updated ${editingField} for ${editingPart.part_number}`, 'success');
      setEditingPart(null);
      setEditingField(null);
      fetchParts();
    }
  }

  function handleFieldChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editingPart || !editingField) return;

    const value = editingField === 'quantity' || editingField === 'min_quantity'
      ? parseInt(e.target.value) || 0
      : editingField === 'cost'
      ? parseFloat(e.target.value) || null
      : e.target.value;

    setEditingPart({
      ...editingPart,
      [editingField]: value
    });
  }

  return (
    <div className="p-8 relative">
      <Head>
        <title>Inventory</title>
      </Head>

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

      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-2">Confirm Delete</h3>
            
            {confirmDelete.affectedMachines.length > 0 ? (
              <>
                <p className="mb-2">This part is used by:</p>
                <ul className="list-disc pl-5 mb-4 max-h-40 overflow-y-auto">
                  {confirmDelete.affectedMachines.map(m => (
                    <li key={m.id} className="py-1">
                      {m.machine_number || 'Unknown machine'}
                      {m.description && ` - ${m.description}`}
                    </li>
                  ))}
                </ul>
                <p className="mb-4">
                  The part will be removed from inventory but kept in machine history records.
                </p>
              </>
            ) : (
              <p className="mb-4">No machines are using this part.</p>
            )}

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={deletePart}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-6 text-gray-800">Inventory Management</h1>

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
            {parts.map((part) => (
              <tr 
                key={part.id} 
                className={part.quantity <= part.min_quantity ? 'bg-red-50' : 'hover:bg-gray-50'}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {part.part_number}
                </td>

                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                  onClick={() => startEditing(part, 'description')}
                >
                  {editingPart?.id === part.id && editingField === 'description' ? (
                    <input
                      type="text"
                      value={editingPart.description || ''}
                      onChange={handleFieldChange}
                      onBlur={saveEdit}
                      autoFocus
                      className="w-full p-1 border border-gray-300 rounded"
                    />
                  ) : (
                    part.description || 'N/A'
                  )}
                </td>

                <td 
                  className={`px-6 py-4 whitespace-nowrap text-sm cursor-pointer ${
                    part.quantity <= part.min_quantity ? 'text-red-600 font-bold' : 'text-gray-500'
                  }`}
                  onClick={() => startEditing(part, 'quantity')}
                >
                  {editingPart?.id === part.id && editingField === 'quantity' ? (
                    <input
                      type="number"
                      value={editingPart.quantity}
                      onChange={handleFieldChange}
                      onBlur={saveEdit}
                      autoFocus
                      min="0"
                      className="w-full p-1 border border-gray-300 rounded"
                    />
                  ) : (
                    part.quantity
                  )}
                </td>

                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                  onClick={() => startEditing(part, 'cost')}
                >
                  {editingPart?.id === part.id && editingField === 'cost' ? (
                    <input
                      type="number"
                      value={editingPart.cost || ''}
                      onChange={handleFieldChange}
                      onBlur={saveEdit}
                      autoFocus
                      step="0.01"
                      min="0"
                      className="w-full p-1 border border-gray-300 rounded"
                    />
                  ) : (
                    part.cost ? `$${part.cost.toFixed(2)}` : 'N/A'
                  )}
                </td>

                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                  onClick={() => startEditing(part, 'min_quantity')}
                >
                  {editingPart?.id === part.id && editingField === 'min_quantity' ? (
                    <input
                      type="number"
                      value={editingPart.min_quantity}
                      onChange={handleFieldChange}
                      onBlur={saveEdit}
                      autoFocus
                      min="1"
                      className="w-full p-1 border border-gray-300 rounded"
                    />
                  ) : (
                    part.min_quantity
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(part.last_updated).toLocaleString()}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => prepareDelete(part.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}