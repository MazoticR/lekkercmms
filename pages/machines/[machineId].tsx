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
}

interface InventoryPart {
  id: number;
  part_number: string;
  description: string | null;
}

const MachineDetailPage = () => {
  const router = useRouter();
  const { machineId } = router.query;

  const [machine, setMachine] = useState<Machine | null>(null);
  const [parts, setParts] = useState<MachinePart[]>([]);
  const [inventoryParts, setInventoryParts] = useState<InventoryPart[]>([]);
  const [selectedInventoryPart, setSelectedInventoryPart] = useState<number | null>(null);
  const [lastReplacedDate, setLastReplacedDate] = useState('');

 useEffect(() => {
    if (machineId) {
      fetchMachine();
      fetchParts();
      fetchInventoryParts();
    }
  }, [machineId]);

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
      .select('id, part_number, description')
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

  async function addPart(e: FormEvent) {
  e.preventDefault();
  if (!selectedInventoryPart) return;
  
  const selectedPart = inventoryParts.find(part => part.id === selectedInventoryPart);
  if (!selectedPart) return;

  const newPart = {
    machine_id: machineId,
    part_name: selectedPart.part_number,  // Use part_number from inventory
    code: selectedPart.description || '', // Use description from inventory
    last_replaced_date: lastReplacedDate ? lastReplacedDate : null,
    inventory_part_id: selectedInventoryPart  // Link to inventory item
  };

  const { error } = await supabase
    .from('machine_parts')
    .insert(newPart);
  
  if (error) {
    console.error('Error adding part:', error);
  } else {
    setSelectedInventoryPart(null);
    setLastReplacedDate('');
    fetchParts();
    
    // Deduct from inventory (optional)
    await supabase.rpc('decrement_inventory', {
      part_id: selectedInventoryPart
    });
  }
}

  return (
    <div className="p-8">
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

      {/* Updated Form to add a new part */}
      <form onSubmit={addPart} className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <select
            value={selectedInventoryPart || ''}
            onChange={(e) => setSelectedInventoryPart(e.target.value ? parseInt(e.target.value) : null)}
            required
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select Inventory Part</option>
            {inventoryParts.map((part) => (
              <option key={part.id} value={part.id}>
                {part.part_number} - {part.description || 'No description'}
              </option>
            ))}
          </select>
          <input
            type="date"
            placeholder="Last Replaced Date"
            value={lastReplacedDate}
            onChange={(e) => setLastReplacedDate(e.target.value)}
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <button 
          type="submit" 
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition duration-200"
        >
          Add Part
        </button>
      </form>

          {/* Table listing all parts for this machine */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Replaced Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {parts.length > 0 ? (
                  parts.map((part) => (
                    <tr key={part.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{part.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{part.part_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{part.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {part.last_replaced_date
                          ? new Date(part.last_replaced_date).toLocaleDateString()
                          : 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No parts found</td>
                  </tr>
                )}
              </tbody>
            </table>
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