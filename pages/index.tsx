import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [message, setMessage] = useState<string>('Testing database connection...');
  const [stats, setStats] = useState<{ machines: number; parts: number } | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        setConnectionStatus('connecting');
        setMessage('Testing database connection...');
        
        // Test both tables in parallel
        const [machinesResult, partsResult] = await Promise.all([
          supabase.from('machines').select('*', { count: 'exact' }),
          supabase.from('machine_parts').select('*', { count: 'exact' })
        ]);

        if (machinesResult.error || partsResult.error) {
          throw machinesResult.error || partsResult.error;
        }

        setConnectionStatus('connected');
        setMessage('Database connection successful!');
        setStats({
          machines: machinesResult.data?.length || 0,
          parts: partsResult.data?.length || 0
        });
      } catch (error: any) {
        setConnectionStatus('error');
        setMessage(error.message || 'Failed to connect to database');
        console.error('Database Error:', error);
      }
    }

    const connectionTimeout = setTimeout(() => {
      if (connectionStatus === 'connecting') {
        setConnectionStatus('error');
        setMessage('Connection timeout - check your network');
      }
    }, 5000);

    testConnection();
    
    return () => clearTimeout(connectionTimeout);
  }, []);

  const statusColors = {
    connecting: 'bg-yellow-500',
    connected: 'bg-green-500',
    error: 'bg-red-500'
  };

  const statusIcons = {
    connecting: '🔄',
    connected: '✅',
    error: '❌'
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-2">
            Lekker Dashboard
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300">
            Compilation of stuff
          </p>
        </div>

        {/* Connection Status Card */}
        <div className="card mb-6">
          <div className={`${statusColors[connectionStatus]} p-4 text-white flex items-center`}>
            <span className="mr-2 text-xl">{statusIcons[connectionStatus]}</span>
            <h2 className="text-lg sm:text-xl font-semibold">Database Connection Status</h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="flex items-center mb-3">
              <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${statusColors[connectionStatus]} mr-2 sm:mr-3`}></div>
              <span className="text-base sm:text-lg font-medium">
                {connectionStatus === 'connecting' && 'Connecting to database...'}
                {connectionStatus === 'connected' && 'Connected successfully'}
                {connectionStatus === 'error' && 'Connection failed'}
              </span>
            </div>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-4">{message}</p>
            
            {connectionStatus === 'connected' && stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-3 sm:p-4 rounded-lg">
                  <h3 className="text-sm sm:text-base font-medium text-gray-500 dark:text-gray-300">Total Machines</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.machines}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 sm:p-4 rounded-lg">
                  <h3 className="text-sm sm:text-base font-medium text-gray-500 dark:text-gray-300">Total Parts</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.parts}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="card p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Manage Machines</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4">View and manage all your machines</p>
            <a href="/machines" className="inline-block bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded text-sm sm:text-base transition duration-200">
              Go to Machines
            </a>
          </div>
          <div className="card p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Add New Machine</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4">Register a new machine to your inventory</p>
            <a href="/machines/new" className="inline-block bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded text-sm sm:text-base transition duration-200">
              Add Machine
            </a>
          </div>
          <div className="card p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">System Health</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4">Check system status and performance</p>
            <button className="inline-block bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white py-2 px-4 rounded text-sm sm:text-base transition duration-200">
              View Status
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="bg-gray-800 p-4 text-white">
            <h2 className="text-lg sm:text-xl font-semibold">Recent Activity</h2>
          </div>
          <div className="p-4 sm:p-6">
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 italic">
              Activity log will appear here once you start using the system
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}