import { useState, useEffect, FormEvent, useMemo } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabaseClient';
import Head from 'next/head';

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
  brand: string;
  model: string;
  status: TransportStatus;
  last_updated?: string;
  total_parts_cost?: number;
}

const TransportsPage = () => {
  const [transports, setTransports] = useState<Transport[]>([]);
  const [transportNumber, setTransportNumber] = useState('');
  const [description, setDescription] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState<TransportStatus>('operational');
  const [editingTransport, setEditingTransport] = useState<Transport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const filteredTransports = useMemo(() => {
    if (!searchQuery) return transports;
    
    const query = searchQuery.toLowerCase();
    return transports.filter(transport => 
      transport.transport_number.toLowerCase().includes(query) ||
      transport.description.toLowerCase().includes(query) ||
      transport.license_plate.toLowerCase().includes(query) ||
      transport.brand.toLowerCase().includes(query) ||
      transport.model.toLowerCase().includes(query) ||
      transport.status.toLowerCase().includes(query) ||
      transport.total_parts_cost?.toString().includes(query)
    );
  }, [transports, searchQuery]);

  useEffect(() => {
    fetchTransports();
  }, []);

  async function fetchTransports() {
    const { data: transportsData, error: transportsError } = await supabase
      .from('transports')
      .select('*')
      .order('last_updated', { ascending: false });

    if (transportsError) {
      console.error('Error fetching transports:', transportsError);
      return;
    }

    const transportsWithCosts = await Promise.all(
      transportsData.map(async (transport) => {
        const { data: partsData, error: partsError } = await supabase
          .from('transport_parts')
          .select('cost')
          .eq('transport_id', transport.id);

        if (partsError) {
          console.error('Error fetching parts:', partsError);
          return { ...transport, total_parts_cost: 0 };
        }

        const totalCost = partsData.reduce((sum, part) => sum + (part.cost || 0), 0);
        return { ...transport, total_parts_cost: totalCost };
      })
    );

    setTransports(transportsWithCosts || []);
  }

  async function addTransport(e: FormEvent) {
    e.preventDefault();
    if (!transportNumber.trim()) return;
    
    const newTransport = {
      transport_number: transportNumber.trim(),
      description: description.trim(),
      license_plate: licensePlate.trim(),
      brand: brand.trim(),
      model: model.trim(),
      status,
      last_updated: new Date().toISOString()
    };

    const { error } = await supabase.from('transports').insert(newTransport);
    
    if (error) {
      console.error('Error adding transport:', error);
    } else {
      setTransportNumber('');
      setDescription('');
      setLicensePlate('');
      setBrand('');
      setModel('');
      setStatus('operational');
      fetchTransports();
    }
  }

  async function updateTransport(e: FormEvent) {
    e.preventDefault();
    if (!editingTransport) return;
    
    const { error } = await supabase
      .from('transports')
      .update({
        transport_number: transportNumber.trim(),
        description: description.trim(),
        license_plate: licensePlate.trim(),
        brand: brand.trim(),
        model: model.trim(),
        status,
        last_updated: new Date().toISOString()
      })
      .eq('id', editingTransport.id);

    if (error) {
      console.error('Error updating transport:', error);
    } else {
      cancelEdit();
      fetchTransports();
    }
  }

  async function deleteTransport(id: number) {
    if (!confirm('Are you sure you want to delete this transport? This will also delete all its parts.')) return;
    
    const { error: partsError } = await supabase
      .from('transport_parts')
      .delete()
      .eq('transport_id', id);

    if (partsError) {
      console.error('Error deleting parts:', partsError);
      return;
    }

    const { error: transportError } = await supabase
      .from('transports')
      .delete()
      .eq('id', id);

    if (transportError) {
      console.error('Error deleting transport:', transportError);
    } else {
      fetchTransports();
    }
  }

  function startEdit(transport: Transport) {
    setEditingTransport(transport);
    setTransportNumber(transport.transport_number);
    setDescription(transport.description);
    setLicensePlate(transport.license_plate);
    setBrand(transport.brand);
    setModel(transport.model);
    setStatus(transport.status);
  }

  function cancelEdit() {
    setEditingTransport(null);
    setTransportNumber('');
    setDescription('');
    setLicensePlate('');
    setBrand('');
    setModel('');
    setStatus('operational');
  }

  return (
    <div className="p-8">
      <Head>
        <title>Transports</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6 text-gray-800">Transports Management</h1>

      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search transports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
          />
        </div>
      </div>
      
      <form onSubmit={editingTransport ? updateTransport : addTransport} className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          {editingTransport ? 'Edit Transport' : 'Add New Transport'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="Transport Number"
            value={transportNumber}
            onChange={(e) => setTransportNumber(e.target.value)}
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
            type="text"
            placeholder="License Plate"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value)}
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="text"
            placeholder="Brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="text"
            placeholder="Model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TransportStatus)}
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {TRANSPORT_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex space-x-2">
          <button 
            type="submit" 
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition duration-200"
          >
            {editingTransport ? 'Update Transport' : 'Add Transport'}
          </button>
          {editingTransport && (
            <button
              type="button"
              onClick={cancelEdit}
              className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded transition duration-200"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transport #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Plate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parts Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTransports.length > 0 ? (
              filteredTransports.map((transport) => (
                <tr key={transport.id} className="hover:bg-gray-50 transition duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                    onClick={() => router.push(`/transports/${transport.id}`)}>
                    {transport.transport_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                    onClick={() => router.push(`/transports/${transport.id}`)}>
                    {transport.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                    onClick={() => router.push(`/transports/${transport.id}`)}>
                    {transport.license_plate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                    onClick={() => router.push(`/transports/${transport.id}`)}>
                    {transport.brand}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                    onClick={() => router.push(`/transports/${transport.id}`)}>
                    {transport.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={() => router.push(`/transports/${transport.id}`)}>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transport.status === 'operational' ? 'bg-green-100 text-green-800' :
                      transport.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                      transport.status === 'out_of_service' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {TRANSPORT_STATUSES.find(s => s.value === transport.status)?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                    onClick={() => router.push(`/transports/${transport.id}`)}>
                    ${transport.total_parts_cost?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                    onClick={() => router.push(`/transports/${transport.id}`)}>
                    {transport.last_updated ? new Date(transport.last_updated).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(transport);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTransport(transport.id);
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
                <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                  {searchQuery ? 'No matching transports found' : 'No transports found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransportsPage;