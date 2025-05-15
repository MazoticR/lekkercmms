// pages/machines/[machineId].tsx
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabaseClient';

interface Machine {
  id: number;
  name: string;
  location: string;
  status: string;
}

interface MachinePart {
  id: number;
  machine_id: number;
  part_name: string;
  code: string;
  last_replaced_date: string | null; // date stored as ISO string; may be null
}

const MachineDetailPage = () => {
  const router = useRouter();
  const { machineId } = router.query;

  const [machine, setMachine] = useState<Machine | null>(null);
  const [parts, setParts] = useState<MachinePart[]>([]);
  const [partName, setPartName] = useState('');
  const [code, setCode] = useState('');
  const [lastReplacedDate, setLastReplacedDate] = useState('');

  useEffect(() => {
    if (machineId) {
      fetchMachine();
      fetchParts();
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

  async function addPart(e: FormEvent) {
    e.preventDefault();
    if (!partName.trim() || !code.trim()) return;
    const newPart = {
      machine_id: machineId,
      part_name: partName.trim(),
      code: code.trim(),
      last_replaced_date: lastReplacedDate ? lastReplacedDate : null
    };
    const { error } = await supabase
      .from('machine_parts')
      .insert(newPart);
    if (error) {
      console.error('Error adding part:', error);
    } else {
      setPartName('');
      setCode('');
      setLastReplacedDate('');
      fetchParts();
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <button onClick={() => router.push('/machines')} style={{ marginBottom: '1rem' }}>
        &larr; Back to Machines
      </button>
      {machine ? (
        <div>
          <h1>{machine.name}</h1>
          <p>
            <strong>Location:</strong> {machine.location}
          </p>
          <p>
            <strong>Status:</strong> {machine.status}
          </p>

          <h2>Machine Parts</h2>

          {/* Form to add a new part */}
          <form onSubmit={addPart} style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Part Name"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              required
              style={{ marginRight: '1rem', padding: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              style={{ marginRight: '1rem', padding: '0.5rem' }}
            />
            <input
              type="date"
              placeholder="Last Replaced Date"
              value={lastReplacedDate}
              onChange={(e) => setLastReplacedDate(e.target.value)}
              style={{ marginRight: '1rem', padding: '0.5rem' }}
            />
            <button type="submit" style={{ padding: '0.5rem 1rem' }}>
              Add Part
            </button>
          </form>

          {/* Table listing all parts for this machine */}
          <table border={1} cellPadding={8} cellSpacing={0} style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Part Name</th>
                <th>Code</th>
                <th>Last Replaced Date</th>
              </tr>
            </thead>
            <tbody>
              {parts.length > 0 ? (
                parts.map((part) => (
                  <tr key={part.id}>
                    <td>{part.id}</td>
                    <td>{part.part_name}</td>
                    <td>{part.code}</td>
                    <td>
                      {part.last_replaced_date
                        ? new Date(part.last_replaced_date).toLocaleDateString()
                        : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>No parts found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Loading machine details...</p>
      )}
    </div>
  );
};

export default MachineDetailPage;
