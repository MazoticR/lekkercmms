import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabaseClient';

interface Machine {
  id: number;
  name: string;
  location: string;
  status: string;
}

const MachinesPage = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchMachines();
  }, []);

  async function fetchMachines() {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('id', { ascending: true });
    if (error) {
      console.error('Error fetching machines:', error);
    } else {
      setMachines(data || []);
    }
  }

  async function addMachine(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !location.trim() || !status.trim()) return;
    const newMachine = {
      name: name.trim(),
      location: location.trim(),
      status: status.trim()
    };
    const { error } = await supabase.from('machines').insert(newMachine);
    if (error) {
      console.error('Error adding machine:', error);
    } else {
      setName('');
      setLocation('');
      setStatus('');
      fetchMachines();
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Machines Management</h1>
      
      {/* Form to add a new machine */}
      <form onSubmit={addMachine} className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="Machine Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="text"
            placeholder="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <button 
          type="submit" 
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition duration-200"
        >
          Add Machine
        </button>
      </form>

      {/* Table listing all machines */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {machines.length > 0 ? (
              machines.map((machine) => (
                <tr
                  key={machine.id}
                  onClick={() => router.push(`/machines/${machine.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{machine.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{machine.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{machine.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{machine.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No machines found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MachinesPage;