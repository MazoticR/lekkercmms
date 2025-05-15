// pages/machines.tsx
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
    <div style={{ padding: '2rem' }}>
      <h1>Machines Management</h1>
      
      {/* Form to add a new machine */}
      <form onSubmit={addMachine} style={{ marginBottom: '2rem' }}>
        <input
          type="text"
          placeholder="Machine Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ marginRight: '1rem', padding: '0.5rem' }}
        />
        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          style={{ marginRight: '1rem', padding: '0.5rem' }}
        />
        <input
          type="text"
          placeholder="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          required
          style={{ marginRight: '1rem', padding: '0.5rem' }}
        />
        <button type="submit" style={{ padding: '0.5rem 1rem' }}>
          Add Machine
        </button>
      </form>

      {/* Table listing all machines */}
      <table border={1} cellPadding={8} cellSpacing={0} style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Machine Name</th>
            <th>Location</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {machines.length > 0 ? (
            machines.map((machine) => (
              <tr
                key={machine.id}
                onClick={() => router.push(`/machines/${machine.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <td>{machine.id}</td>
                <td>{machine.name}</td>
                <td>{machine.location}</td>
                <td>{machine.status}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4}>No machines found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MachinesPage;
