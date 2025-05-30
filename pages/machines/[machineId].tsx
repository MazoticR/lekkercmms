import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabaseClient';
import { MACHINE_STATUSES, MachineStatus } from '../../lib/constants';

interface Machine {
  id: number;
  machine_number: string;
  description: string;
  serial_number: string;
  status: MachineStatus;
  last_updated?: string;
}

interface MachinePart {
  id: number;
  machine_id: number;
  part_name: string;
  code: string;
  last_replaced_date: string | null;
  inventory_part_id: number | null;
  notes: string | null;
  times_replaced: number;
  cost: number | null;
  last_updated?: string;
}

interface InventoryPart {
  id: number;
  part_number: string;
  description: string | null;
  cost: number | null;
}

const MachineDetailPage = () => {
  const router = useRouter();
  const { machineId } = router.query;

  const [machine, setMachine] = useState<Machine | null>(null);
  const [parts, setParts] = useState<MachinePart[]>([]);
  const [inventoryParts, setInventoryParts] = useState<InventoryPart[]>([]);
  const [selectedInventoryPart, setSelectedInventoryPart] = useState<number | null>(null);
  const [lastReplacedDate, setLastReplacedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryPart[]>([]);
  const [editingPart, setEditingPart] = useState<MachinePart | null>(null);

  useEffect(() => {
    if (machineId) {
      fetchMachine();
      fetchParts();
      fetchInventoryParts();
    }
  }, [machineId]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    const results = inventoryParts.filter(part => 
      part.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (part.description && part.description.toLowerCase().includes(searchTerm.toLowerCase())))
      .slice(0, 5);
    
    setSearchResults(results);
  }, [searchTerm, inventoryParts]);

  const calculateTotalCost = () => {
    return parts.reduce((total, part) => {
      return total + (part.cost || 0);
    }, 0);
  };

  async function fetchMachine() {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .eq('id', machineId)
      .single();
    if (error) {
      console.error('Error fetching machine details:', error);
    } else {
      setMachine(data);
    }
  }

  async function fetchParts() {
    const { data, error } = await supabase
      .from('machine_parts')
      .select('*')
      .eq('machine_id', machineId)
      .order('last_updated', { ascending: false });
    if (error) {
      console.error('Error fetching machine parts:', error);
    } else {
      setParts(data || []);
    }
  }

  async function fetchInventoryParts() {
    const { data, error } = await supabase
      .from('inventory_parts')
      .select('id, part_number, description, cost')
      .order('part_number', { ascending: true });
    if (error) {
      console.error('Error fetching inventory parts:', error);
    } else {
      setInventoryParts(data || []);
    }
  }

  async function updateMachineTimestamp() {
    await supabase
      .from('machines')
      .update({ last_updated: new Date().toISOString() })
      .eq('id', machineId);
    fetchMachine(); // Refresh machine data
  }

  async function deletePart(partId: number) {
    if (!confirm('Are you sure you want to delete this part?')) return;
    
    const { error } = await supabase
      .from('machine_parts')
      .delete()
      .eq('id', partId);
    
    if (error) {
      console.error('Error deleting part:', error);
    } else {
      await updateMachineTimestamp();
      fetchParts();
    }
  }

  async function addOrUpdatePart(e: FormEvent) {
    e.preventDefault();
    if (!selectedInventoryPart) return;
    
    const selectedPart = inventoryParts.find(part => part.id === selectedInventoryPart);
    if (!selectedPart) return;

    const partData = {
      last_replaced_date: lastReplacedDate ? lastReplacedDate : null,
      notes: notes || null,
      cost: cost !== null ? cost : selectedPart.cost || null,
      last_updated: new Date().toISOString()
    };

    if (editingPart) {
      // Update existing part without incrementing times_replaced
      const { error } = await supabase
        .from('machine_parts')
        .update(partData)
        .eq('id', editingPart.id);
      
      if (error) {
        console.error('Error updating part:', error);
      } else {
        resetForm();
        await updateMachineTimestamp();
        fetchParts();
      }
    } else {
      // Handle new part or replacement
      const existingPart = parts.find(part => part.inventory_part_id === selectedInventoryPart);

      if (existingPart) {
        // Increment times_replaced only if this is a replacement
        const { error } = await supabase
          .from('machine_parts')
          .update({
            ...partData,
            times_replaced: (existingPart.times_replaced || 0) + 1
          })
          .eq('id', existingPart.id);
        
        if (error) {
          console.error('Error updating part:', error);
        } else {
          resetForm();
          await updateMachineTimestamp();
          fetchParts();
        }
      } else {
        // Add new part
        const newPart = {
          machine_id: machineId,
          part_name: selectedPart.part_number,
          code: selectedPart.description || '',
          inventory_part_id: selectedInventoryPart,
          times_replaced: 1,
          ...partData
        };

        const { error } = await supabase
          .from('machine_parts')
          .insert(newPart);
        
        if (error) {
          console.error('Error adding part:', error);
        } else {
          resetForm();
          await updateMachineTimestamp();
          fetchParts();
          
          await supabase.rpc('decrement_inventory', {
            part_id: selectedInventoryPart
          });
        }
      }
    }
  }

  function startEditPart(part: MachinePart) {
    setEditingPart(part);
    setSelectedInventoryPart(part.inventory_part_id);
    setSearchTerm(`${part.part_name} - ${part.code || ''}`);
    setLastReplacedDate(part.last_replaced_date || '');
    setNotes(part.notes || '');
    setCost(part.cost);
  }

  function cancelEditPart() {
    setEditingPart(null);
    resetForm();
  }

function resetForm() {
  setEditingPart(null);
  setSelectedInventoryPart(null);
  setLastReplacedDate('');
  setNotes('');
  setCost(null);
  setSearchTerm('');
}

  return (
    <div className="p-8 w-full min-w-fit overflow-x-auto">
      <button 
        onClick={() => router.push('/machines')} 
        className="flex items-center text-purple-600 hover:text-purple-800 mb-6 transition duration-200"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Machines
      </button>

      {machine ? (
        <div>
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Machine #{machine.machine_number}</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="text-gray-700">{machine.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Serial Number</p>
                    <p className="text-gray-700">{machine.serial_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Updated</p>
                    <p className="text-gray-700">
                      {machine.last_updated ? new Date(machine.last_updated).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                machine.status === 'operational' ? 'bg-green-100 text-green-800' :
                machine.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {MACHINE_STATUSES.find(s => s.value === machine.status)?.label}
              </span>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-4">Machine Parts</h2>

          <form onSubmit={addOrUpdatePart} className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by part number or description"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedInventoryPart(null);
                  }}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                    {searchResults.map((part) => (
                      <div
                        key={part.id}
                        className={`p-2 hover:bg-gray-100 cursor-pointer ${
                          selectedInventoryPart === part.id ? 'bg-purple-100' : ''
                        }`}
                        onClick={() => {
                          setSelectedInventoryPart(part.id);
                          setSearchTerm(`${part.part_number} - ${part.description || ''}`);
                          setCost(part.cost);
                          setSearchResults([]);
                        }}
                      >
                        <div className="font-medium">{part.part_number}</div>
                        <div className="text-sm text-gray-600">{part.description}</div>
                        <div className="text-sm text-green-600">
                          {part.cost ? `$${part.cost.toFixed(2)}` : 'No price set'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="date"
                placeholder="Last Replaced Date"
                value={lastReplacedDate}
                onChange={(e) => setLastReplacedDate(e.target.value)}
                className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Cost"
                value={cost || ''}
                onChange={(e) => setCost(e.target.value ? parseFloat(e.target.value) : null)}
                className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button 
              type="submit" 
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition duration-200"
              disabled={!selectedInventoryPart}
            >
              {editingPart ? 'Update Part' : 
       parts.some(p => p.inventory_part_id === selectedInventoryPart) ? 'Replace Part' : 'Add Part'}
            </button>
                {editingPart && (
                    <button
                      type="button"
                      onClick={cancelEditPart}
                      className="ml-2 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded transition duration-200"
                    >
                      Cancel
                    </button>
               )}
          </form>

          <div className="bg-white rounded-lg shadow-md overflow-x-auto w-full">
            <div className="min-w-[800px]">
              <table className=" table-container min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Replaced</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Times Replaced</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parts.length > 0 ? (
                    parts.map((part) => (
                      <tr key={part.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {part.part_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {part.code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {part.cost ? `$${part.cost.toFixed(2)}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {part.last_replaced_date
                            ? new Date(part.last_replaced_date).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {part.times_replaced || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {part.last_updated ? new Date(part.last_updated).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {part.notes || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditPart(part);
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  Edit
                                </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePart(part.id);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                        No parts found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 text-right">
            <div className="inline-block bg-gray-50 px-4 py-2 rounded-lg">
              <span className="font-medium">Total Parts Cost: </span>
              <span className="text-green-600 font-bold">
                ${calculateTotalCost().toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading machine details...</p>
        </div>
      )}
    </div>
  );
};

export default MachineDetailPage;