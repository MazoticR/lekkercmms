import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [message, setMessage] = useState<string>('Testing database connection...');
  const [stats, setStats] = useState<{ machines: number; parts: number } | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        // Test machines table connection
        const { data: machinesData, error: machinesError } = await supabase
          .from('machines')
          .select('*', { count: 'exact' });

        if (machinesError) throw machinesError;

        // Test machine_parts table connection
        const { data: partsData, error: partsError } = await supabase
          .from('machine_parts')
          .select('*', { count: 'exact' });

        if (partsError) throw partsError;

        setConnectionStatus('connected');
        setMessage('Database connection successful!');
        setStats({
          machines: machinesData.length,
          parts: partsData.length
        });
      } catch (error: any) {
        setConnectionStatus('error');
        setMessage(`Connection error: ${error.message}`);
        console.error('Supabase Error:', error);
      }
    }

    testConnection();
  }, []);

  const statusColors = {
    connecting: 'bg-yellow-500',
    connected: 'bg-green-500',
    error: 'bg-red-500'
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">LekkerCMMS Dashboard</h1>
        <p className="text-lg text-gray-600 mb-8">Your complete machine management solution</p>

        {/* Connection Status Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className={`${statusColors[connectionStatus]} p-4 text-white`}>
            <h2 className="text-xl font-semibold">Database Connection Status</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className={`w-4 h-4 rounded-full ${statusColors[connectionStatus]} mr-3`}></div>
              <span className="text-lg font-medium">
                {connectionStatus === 'connecting' && 'Connecting to database...'}
                {connectionStatus === 'connected' && 'Connected successfully'}
                {connectionStatus === 'error' && 'Connection failed'}
              </span>
            </div>
            <p className="text-gray-700 mb-4">{message}</p>
            
            {connectionStatus === 'connected' && stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-500">Total Machines</h3>
                  <p className="text-3xl font-bold text-purple-600">{stats.machines}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-500">Total Parts</h3>
                  <p className="text-3xl font-bold text-purple-600">{stats.parts}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">Manage Machines</h3>
            <p className="text-gray-600 mb-4">View and manage all your machines</p>
            <a href="/machines" className="inline-block bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition duration-200">
              Go to Machines
            </a>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">Add New Machine</h3>
            <p className="text-gray-600 mb-4">Register a new machine to your inventory</p>
            <a href="/machines" className="inline-block bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition duration-200">
              Add Machine
            </a>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">System Health</h3>
            <p className="text-gray-600 mb-4">Check system status and performance</p>
            <button className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded transition duration-200">
              View Status
            </button>
          </div>
        </div>

        {/* Recent Activity (placeholder) */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gray-800 p-4 text-white">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-500 italic">Activity log will appear here once you start using the system</p>
          </div>
        </div>
      </div>
    </div>
  );
}