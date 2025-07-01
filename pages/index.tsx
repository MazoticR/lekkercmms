import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';
import Head from 'next/head';

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [message, setMessage] = useState<string>('Testing database connection...');
  const [stats, setStats] = useState<{ machines: number; parts: number } | null>(null);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let connectionTimeout: NodeJS.Timeout;

    async function testConnection() {
      try {
        if (isMounted) {
          setConnectionStatus('connecting');
          setMessage('Testing database connection...');
        }

        if (!hasConnectedOnce) {
          connectionTimeout = setTimeout(() => {
            if (isMounted && connectionStatus === 'connecting') {
              setConnectionStatus('error');
              setMessage('Connection is slow but may still succeed...');
            }
          }, 5000);
        }

        const [machinesResult, partsResult] = await Promise.all([
          supabase.from('machines').select('*', { count: 'exact' }),
          supabase.from('machine_parts').select('*', { count: 'exact' })
        ]);

        if (machinesResult.error || partsResult.error) {
          throw machinesResult.error || partsResult.error;
        }

        if (isMounted) {
          setConnectionStatus('connected');
          setHasConnectedOnce(true);
          setMessage('Database connection successful!');
          setStats({
            machines: machinesResult.data?.length || 0,
            parts: partsResult.data?.length || 0
          });
        }
      } catch (error: any) {
        if (isMounted) {
          setConnectionStatus('error');
          setMessage(error.message || 'Failed to connect to database');
          console.error('Database Error:', error);
        }
      } finally {
        if (connectionTimeout) clearTimeout(connectionTimeout);
      }
    }

    testConnection();

    return () => {
      isMounted = false;
      if (connectionTimeout) clearTimeout(connectionTimeout);
    };
  }, []);

  const statusColors = {
    connecting: 'bg-yellow-500',
    connected: 'bg-green-500',
    error: hasConnectedOnce ? 'bg-green-500' : 'bg-red-500'
  };

  const statusIcons = {
    connecting: '🔄',
    connected: '✅',
    error: hasConnectedOnce ? '⚠️' : '❌'
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-w-fit">
      <div className="max-w-4xl mx-auto min-w-fit">
        <div className="mb-8 min-w-fit">

      <Head>
        <title>Inicio</title>
      </Head>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Lekker Dashboard
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Compilation of stuff
          </p>
        </div>

        {/* Connection Status Card */}
        <div className="card mb-6 min-w-fit">
          <div className={`${statusColors[connectionStatus]} p-4 text-white flex items-center`}>
            <span className="mr-2 text-xl">{statusIcons[connectionStatus]}</span>
            <h2 className="text-lg sm:text-xl font-semibold">Database Connection Status</h2>
          </div>
          <div className="p-4 sm:p-6 min-w-fit">
            <div className="flex items-center mb-3 min-w-fit">
              <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${statusColors[connectionStatus]} mr-2 sm:mr-3`}></div>
              <span className="text-base sm:text-lg font-medium">
                {connectionStatus === 'connecting' && 'Connecting to database...'}
                {connectionStatus === 'connected' && 'Connected successfully'}
                {connectionStatus === 'error' && hasConnectedOnce ? 'Connection slow but working' : 'Connection failed'}
              </span>
            </div>
            <p className="text-sm sm:text-base text-gray-700 mb-4">{message}</p>
            
            {(connectionStatus === 'connected' || (connectionStatus === 'error' && hasConnectedOnce)) && stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 min-w-fit">
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg min-w-fit">
                  <h3 className="text-sm sm:text-base font-medium text-gray-500">Total Machines</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.machines}</p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg min-w-fit">
                  <h3 className="text-sm sm:text-base font-medium text-gray-500">Total Parts</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.parts}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}


        {/* Recent Activity */}
        <div className="card min-w-fit">
          <div className="bg-gray-800 p-4 text-white">
            <h2 className="text-lg sm:text-xl font-semibold">Recent Activity</h2>
          </div>
          <div className="p-4 sm:p-6 min-w-fit">
            <p className="text-sm sm:text-base text-gray-500 italic">
              Activity log will appear here once you start using the system
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}