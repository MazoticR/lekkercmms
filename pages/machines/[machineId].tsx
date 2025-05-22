import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabaseClient';
import { MACHINE_STATUSES, MachineStatus } from '../../lib/constants';

interface Machine {
  id: number;
  name: string;
  location: string;
  status: MachineStatus;
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
      .eq('machine_id', machineId);
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

  async function updateStatus(newStatus: MachineStatus) {
    if (!machineId || !machine) return;
    
    const { error } = await supabase
      .from('machines')
      .update({ status: newStatus })
      .eq('id', machineId);
    
    if (error) {
      console.error('Error updating status:', error);
    } else {
      fetchMachine();
    }
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
      fetchParts();
    }
  }

// Update the addPart function to this:
async function addPart(e: FormEvent) {
  e.preventDefault();
  if (!selectedInventoryPart) return;
  
  const selectedPart = inventoryParts.find(part => part.id === selectedInventoryPart);
  if (!selectedPart) return;

  const existingPart = parts.find(part => part.inventory_part_id === selectedInventoryPart);

  // Use the form cost if provided, otherwise use the inventory part cost
  const partCost = cost !== null ? cost : selectedPart.cost;

  if (existingPart) {
    const { error } = await supabase
      .from('machine_parts')
      .update({
        last_replaced_date: lastReplacedDate ? lastReplacedDate : null,
        notes: notes || null,
        times_replaced: (existingPart.times_replaced || 0) + 1,
        cost: partCost  // Add this line
      })
      .eq('id', existingPart.id);
    
    if (error) {
      console.error('Error updating part:', error);
    } else {
      setSelectedInventoryPart(null);
      setLastReplacedDate('');
      setNotes('');
      setCost(null);
      setSearchTerm('');
      fetchParts();
    }
  } else {
    const newPart = {
      machine_id: machineId,
      part_name: selectedPart.part_number,
      code: selectedPart.description || '',
      last_replaced_date: lastReplacedDate ? lastReplacedDate : null,
      inventory_part_id: selectedInventoryPart,
      notes: notes || null,
      times_replaced: 1,
      cost: partCost  // Add this line
    };

    const { error } = await supabase
      .from('machine_parts')
      .insert(newPart);
    
    if (error) {
      console.error('Error adding part:', error);
    } else {
      setSelectedInventoryPart(null);
      setLastReplacedDate('');
      setNotes('');
      setCost(null);
      setSearchTerm('');
      fetchParts();
      
      await supabase.rpc('decrement_inventory', {
        part_id: selectedInventoryPart
      });
    }
  }
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
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{machine.name}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="text-gray-700">{machine.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <select
                  value={machine.status}
                  onChange={(e) => updateStatus(e.target.value as MachineStatus)}
                  className="mt-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {MACHINE_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-4">Machine Parts</h2>

          <form onSubmit={addPart} className="bg-white p-6 rounded-lg shadow-md mb-8">
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
              {parts.some(p => p.inventory_part_id === selectedInventoryPart) ? 'Update Part' : 'Add Part'}
            </button>
          </form>

          <div className="bg-white rounded-lg shadow-md overflow-x-auto w-full">
            <div className="min-w-[800px]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Replaced</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Times Replaced</th>
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
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {part.notes || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => deletePart(part.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
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