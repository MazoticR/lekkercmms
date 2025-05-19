import React, { useState } from 'react';
import Head from 'next/head';
import FileUpload from '@/components/TimeTracker/FileUpload';
import WorkerTable from '@/components/TimeTracker/WorkerTable';
import { WorkerData } from '@/types/timeTracker';
import { parseExcelFile, generateExcelFile } from '@/components/TimeTracker/utils';

const TimeTrackerPage: React.FC = () => {
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

const handleFileUpload = async (file: File) => {
  setIsLoading(true);
  setError(null);
  
  try {
    const parsedWorkers = await parseExcelFile(file);
    setWorkers([...parsedWorkers.map(w => ({ ...w }))]); // Added missing closing parenthesis
  } catch (err) {
    console.error('Error parsing file:', err);
    setError('Failed to parse Excel file.');
  } finally {
    setIsLoading(false);
  }
};

  const handleUpdateWorker = (updatedWorker: WorkerData) => {
    setWorkers(prev =>
      prev.map(worker =>
        worker.id === updatedWorker.id ? updatedWorker : worker
      )
    );
  };

  const handleDownload = async () => {
    if (workers.length === 0) return;
    
    try {
      const blob = await generateExcelFile(workers);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'updated_time_tracking.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating file:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Worker Time Tracker</title>
        <meta name="description" content="Process worker time tracking Excel files" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Worker Time Tracker</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
              <p>{error}</p>
            </div>
          )}
        </div>

        {workers.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Worker Data</h2>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Download Updated File
              </button>
            </div>

            <div className="space-y-6">
              {workers.map(worker => (
                <WorkerTable
                  key={`${worker.id}-${worker.name}`}
                  worker={worker}
                  onUpdate={handleUpdateWorker}
                />
              ))}
            </div>
          </div>
        )}

        {workers.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-blue-800 mb-2">Total Workers</h3>
                <p className="text-3xl font-bold text-blue-900">{workers.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-green-800 mb-2">Average Efficiency</h3>
                <p className="text-3xl font-bold text-green-900">
                  {(
                    workers.reduce((sum, worker) => {
                      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
                      const workerSum = days.reduce((s, day) => s + worker.efficiency[day], 0);
                      return sum + (workerSum / days.length);
                    }, 0) / workers.length
                  ).toFixed(2)}%
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-purple-800 mb-2">Total Operations</h3>
                <p className="text-3xl font-bold text-purple-900">
                  {workers.reduce((sum, worker) => sum + worker.operations.length, 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TimeTrackerPage;