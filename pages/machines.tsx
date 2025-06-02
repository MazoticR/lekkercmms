import { useState, useEffect, FormEvent, useMemo } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabaseClient';
import { MACHINE_STATUSES, MachineStatus } from '../lib/constants';
import Head from 'next/head';

interface Machine {
  id: number;
  machine_number: string;
  description: string;
  serial_number: string;
  brand: string;
  model: string;
  status: MachineStatus;
  last_updated?: string;
  total_parts_cost?: number;
}

const MachinesPage = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineNumber, setMachineNumber] = useState('');
  const [description, setDescription] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState<MachineStatus>('operational');
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const filteredMachines = useMemo(() => {
    if (!searchQuery) return machines;
    
    const query = searchQuery.toLowerCase();
    return machines.filter(machine => 
      machine.machine_number.toLowerCase().includes(query) ||
      machine.description.toLowerCase().includes(query) ||
      machine.serial_number.toLowerCase().includes(query) ||
      machine.brand.toLowerCase().includes(query) ||
      machine.model.toLowerCase().includes(query) ||
      machine.status.toLowerCase().includes(query) ||
      machine.total_parts_cost?.toString().includes(query)
    );
  }, [machines, searchQuery]);

  useEffect(() => {
    fetchMachines();
  }, []);

  async function fetchMachines() {
    const { data: machinesData, error: machinesError } = await supabase
      .from('machines')
      .select('*')
      .order('last_updated', { ascending: false });

    if (machinesError) {
      console.error('Error fetching machines:', machinesError);
      return;
    }

    const machinesWithCosts = await Promise.all(
      machinesData.map(async (machine) => {
        const { data: partsData, error: partsError } = await supabase
          .from('machine_parts')
          .select('cost')
          .eq('machine_id', machine.id);

        if (partsError) {
          console.error('Error fetching parts:', partsError);
          return { ...machine, total_parts_cost: 0 };
        }

        const totalCost = partsData.reduce((sum, part) => sum + (part.cost || 0), 0);
        return { ...machine, total_parts_cost: totalCost };
      })
    );

    setMachines(machinesWithCosts || []);
  }

  async function addMachine(e: FormEvent) {
    e.preventDefault();
    if (!machineNumber.trim()) return;
    
    const newMachine = {
      machine_number: machineNumber.trim(),
      description: description.trim(),
      serial_number: serialNumber.trim(),
      brand: brand.trim(),
      model: model.trim(),
      status,
      last_updated: new Date().toISOString()
    };

    const { error } = await supabase.from('machines').insert(newMachine);
    
    if (error) {
      console.error('Error adding machine:', error);
    } else {
      setMachineNumber('');
      setDescription('');
      setSerialNumber('');
      setBrand('');
      setModel('');
      setStatus('operational');
      fetchMachines();
    }
  }

  async function updateMachine(e: FormEvent) {
    e.preventDefault();
    if (!editingMachine) return;
    
    const { error } = await supabase
      .from('machines')
      .update({
        machine_number: machineNumber.trim(),
        description: description.trim(),
        serial_number: serialNumber.trim(),
        brand: brand.trim(),
        model: model.trim(),
        status,
        last_updated: new Date().toISOString()
      })
      .eq('id', editingMachine.id);

    if (error) {
      console.error('Error updating machine:', error);
    } else {
      cancelEdit();
      fetchMachines();
    }
  }

  async function deleteMachine(id: number) {
    if (!confirm('Are you sure you want to delete this machine? This will also delete all its parts.')) return;
    
    const { error: partsError } = await supabase
      .from('machine_parts')
      .delete()
      .eq('machine_id', id);

    if (partsError) {
      console.error('Error deleting parts:', partsError);
      return;
    }

    const { error: machineError } = await supabase
      .from('machines')
      .delete()
      .eq('id', id);

    if (machineError) {
      console.error('Error deleting machine:', machineError);
    } else {
      fetchMachines();
    }
  }

  function startEdit(machine: Machine) {
    setEditingMachine(machine);
    setMachineNumber(machine.machine_number);
    setDescription(machine.description);
    setSerialNumber(machine.serial_number);
    setBrand(machine.brand);
    setModel(machine.model);
    setStatus(machine.status);
  }

  function cancelEdit() {
    setEditingMachine(null);
    setMachineNumber('');
    setDescription('');
    setSerialNumber('');
    setBrand('');
    setModel('');
    setStatus('operational');
  }

  return (

    
    <div className="p-8">

      <Head>
        <title>Machines</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6 text-gray-800">Machines Management</h1>

      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search machines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
          />
        </div>
      </div>
      
      <form onSubmit={editingMachine ? updateMachine : addMachine} className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          {editingMachine ? 'Edit Machine' : 'Add New Machine'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="Machine Number"
            value={machineNumber}
            onChange={(e) => setMachineNumber(e.target.value)}
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
            placeholder="Serial Number"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
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
            onChange={(e) => setStatus(e.target.value as MachineStatus)}
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {MACHINE_STATUSES.map((option) => (
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
            {editingMachine ? 'Update Machine' : 'Add Machine'}
          </button>
          {editingMachine && (
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parts Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMachines.length > 0 ? (
              filteredMachines.map((machine) => (
                <tr key={machine.id} className="hover:bg-gray-50 transition duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                    onClick={() => router.push(`/machines/${machine.id}`)}>
                    {machine.machine_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                    onClick={() => router.push(`/machines/${machine.id}`)}>
                    {machine.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                    onClick={() => router.push(`/machines/${machine.id}`)}>
                    {machine.serial_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                    onClick={() => router.push(`/machines/${machine.id}`)}>
                    {machine.brand}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                    onClick={() => router.push(`/machines/${machine.id}`)}>
                    {machine.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={() => router.push(`/machines/${machine.id}`)}>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      machine.status === 'operational' ? 'bg-green-100 text-green-800' :
                      machine.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                      machine.status === 'out_of_service' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {MACHINE_STATUSES.find(s => s.value === machine.status)?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                    onClick={() => router.push(`/machines/${machine.id}`)}>
                    ${machine.total_parts_cost?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                    onClick={() => router.push(`/machines/${machine.id}`)}>
                    {machine.last_updated ? new Date(machine.last_updated).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(machine);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMachine(machine.id);
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
                  {searchQuery ? 'No matching machines found' : 'No machines found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MachinesPage;