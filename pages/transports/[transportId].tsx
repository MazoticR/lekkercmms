import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabaseClient';
import Head from 'next/head';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const TRANSPORT_STATUSES = [
  { value: 'operational', label: 'Operational' },
  { value: 'maintenance', label: 'In Maintenance' },
  { value: 'out_of_service', label: 'Out of Service' },
];

type TransportStatus = 'operational' | 'maintenance' | 'out_of_service';

interface Transport {
  id: number;
  transport_number: string;
  description: string;
  license_plate: string;
  status: TransportStatus;
  last_updated?: string;
}

interface TransportPart {
  id: number;
  transport_id: number;
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

const TransportDetailPage = () => {
  const router = useRouter();
  const { transportId } = router.query;

  const [transport, setTransport] = useState<Transport | null>(null);
  const [parts, setParts] = useState<TransportPart[]>([]);
  const [inventoryParts, setInventoryParts] = useState<InventoryPart[]>([]);
  const [selectedInventoryPart, setSelectedInventoryPart] = useState<number | null>(null);
  const [lastReplacedDate, setLastReplacedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryPart[]>([]);
  const [editingPart, setEditingPart] = useState<TransportPart | null>(null);
  const [trackReplacement, setTrackReplacement] = useState(true);
  
  useEffect(() => {
    if (transportId) {
      fetchTransport();
      fetchParts();
      fetchInventoryParts();
    }
  }, [transportId]);

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

  async function fetchTransport() {
    const { data, error } = await supabase
      .from('transports')
      .select('*')
      .eq('id', transportId)
      .single();
    if (error) {
      console.error('Error fetching transport details:', error);
    } else {
      setTransport(data);
    }
  }

  async function fetchParts() {
    const { data, error } = await supabase
      .from('transport_parts')
      .select('*')
      .eq('transport_id', transportId)
      .order('last_updated', { ascending: false });
    if (error) {
      console.error('Error fetching transport parts:', error);
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

  async function updateTransportTimestamp() {
    await supabase
      .from('transports')
      .update({ last_updated: new Date().toISOString() })
      .eq('id', transportId);
    fetchTransport(); // Refresh transport data
  }

  async function deletePart(partId: number) {
    if (!confirm('Are you sure you want to delete this part?')) return;
    
    const { error } = await supabase
      .from('transport_parts')
      .delete()
      .eq('id', partId);
    
    if (error) {
      console.error('Error deleting part:', error);
    } else {
      await updateTransportTimestamp();
      fetchParts();
    }
  }

async function addOrUpdatePart(e: FormEvent) {
  e.preventDefault();
  if (!selectedInventoryPart) return;
  
  const selectedPart = inventoryParts.find(part => part.id === selectedInventoryPart);
  if (!selectedPart) return;

  if (editingPart) {
    // Update existing part
    const partData = {
      last_replaced_date: lastReplacedDate ? lastReplacedDate : null,
      notes: notes || null,
      cost: cost !== null ? cost : selectedPart.cost || null,
      last_updated: new Date().toISOString()
    };

    const { error } = await supabase
      .from('transport_parts')
      .update(partData)
      .eq('id', editingPart.id);
    
    if (error) {
      console.error('Error updating part:', error);
      toast.error('Failed to update part');
    } else {
      resetForm();
      await updateTransportTimestamp();
      fetchParts();
      toast.success('Part updated successfully');
    }
  } else {
    // Always create new entry for new parts/replacements
    const existingParts = parts.filter(part => part.inventory_part_id === selectedInventoryPart);
    const latestExistingPart = existingParts[0]; // Get most recent

    const newPart = {
      transport_id: transportId,
      part_name: selectedPart.part_number,
      code: selectedPart.description || '',
      inventory_part_id: selectedInventoryPart,
      last_replaced_date: lastReplacedDate ? lastReplacedDate : null,
      notes: notes || null,
      cost: cost !== null ? cost : selectedPart.cost || null,
      times_replaced: trackReplacement && latestExistingPart 
        ? (latestExistingPart.times_replaced || 0) + 1 
        : 1,
      last_updated: new Date().toISOString()
    };

    const { error } = await supabase
      .from('transport_parts')
      .insert(newPart);
    
    if (error) {
      console.error('Error adding part:', error);
      toast.error('Failed to add part');
    } else {
      resetForm();
      await updateTransportTimestamp();
      fetchParts();
      
      // Decrement inventory if needed
      await supabase.rpc('decrement_inventory', {
        part_id: selectedInventoryPart
      });
      
      toast.success('Part added successfully');
    }
  }
}

  function startEditPart(part: TransportPart) {
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
      <Head>
        <title>{transport ? `Transport ${transport.transport_number}` : 'Transport Details'}</title>
      </Head>
      <button 
        onClick={() => router.push('/transports')} 
        className="flex items-center text-purple-600 hover:text-purple-800 mb-6 transition duration-200"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Transports
      </button>

      {transport ? (
        <div>
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Transport #{transport.transport_number}</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="text-gray-700">{transport.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">License Plate</p>
                    <p className="text-gray-700">{transport.license_plate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Updated</p>
                    <p className="text-gray-700">
                      {transport.last_updated ? new Date(transport.last_updated).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

                    <select
                    value={transport?.status || 'operational'}
                    onChange={async (e) => {
                        const newStatus = e.target.value as TransportStatus;
                        if (!transport) return;
                        
                        const { error } = await supabase
                        .from('transports')
                        .update({ 
                            status: newStatus,
                            last_updated: new Date().toISOString()
                        })
                        .eq('id', transport.id);

                        if (error) {
                        console.error('Error updating transport status:', error);
                        toast.error('Failed to update status');
                        } else {
                        setTransport({...transport, status: newStatus});
                        toast.success('Status updated successfully');
                        }
                    }}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        transport?.status === 'operational' ? 'bg-green-100 text-green-800' :
                        transport?.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                    } cursor-pointer border-none focus:ring-2 focus:ring-purple-500`}
                    >
                    {TRANSPORT_STATUSES.map((status) => (
                        <option 
                        key={status.value} 
                        value={status.value}
                        className={`${
                            status.value === 'operational' ? 'bg-green-100 text-green-800' :
                            status.value === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}
                        >
                        {status.label}
                        </option>
                    ))}
                    </select>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-4">Transport Parts</h2>

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
            <div className="flex items-center mb-4">
                <input
                    type="checkbox"
                    id="trackReplacement"
                    checked={trackReplacement}
                    onChange={(e) => setTrackReplacement(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="trackReplacement" className="ml-2 block text-sm text-gray-700">
                    Track replacement count
                </label>
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
          <p className="text-gray-500">Loading transport details...</p>
        </div>
      )}
    </div>
  );
};

export default TransportDetailPage;