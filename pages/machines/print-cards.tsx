import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabaseClient';
import Head from 'next/head';
import dynamic from 'next/dynamic';

// Dynamically import QRCode to avoid SSR issues
const QRCode = dynamic(() => import('react-qr-code'), { ssr: false });

interface Machine {
  id: number;
  machine_number: string;
  description: string;
  serial_number: string;
}

const PrintCardsPage = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachines, setSelectedMachines] = useState<number[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchMachines();
  }, []);

  async function fetchMachines() {
    const { data, error } = await supabase
      .from('machines')
      .select('id, machine_number, description, serial_number')
      .order('machine_number', { ascending: true });

    if (error) {
      console.error('Error fetching machines:', error);
    } else {
      setMachines(data || []);
    }
  }

  function toggleMachineSelection(id: number) {
    setSelectedMachines(prev => 
      prev.includes(id) 
        ? prev.filter(machineId => machineId !== id) 
        : [...prev, id]
    );
  }

  function printSelectedCards() {
    if (selectedMachines.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const selected = machines.filter(m => selectedMachines.includes(m.id));
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Machine QR Codes</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
              }
              .cards-container {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
                padding: 20px;
              }
              .card {
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                page-break-inside: avoid;
              }
              .qr-code {
                margin: 0 auto;
                width: 200px;
                height: 200px;
              }
              .machine-info {
                margin-top: 15px;
              }
              @media print {
                button {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            <h1 style="text-align: center; margin-bottom: 20px;">Machine QR Codes</h1>
            <div class="cards-container">
              ${selected.map(machine => `
                <div class="card">
                  <h3>Machine #${machine.machine_number}</h3>
                  <div class="qr-code">
                    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
                      ${generateQRCodeSvg(`${window.location.origin}/machines/${machine.id}`)}
                    </svg>
                  </div>
                  <div class="machine-info">
                    <p>${machine.description}</p>
                    <p>Serial: ${machine.serial_number}</p>
                  </div>
                </div>
              `).join('')}
            </div>
            <div style="text-align: center; margin-top: 20px;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Print QR Codes
              </button>
            </div>
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  function generateQRCodeSvg(text: string) {
    // This is a simplified QR code SVG generator
    // In a real app, you might want to use a proper QR code library
    return `
      <rect width="200" height="200" fill="#ffffff"/>
      <rect x="15" y="15" width="30" height="30" fill="#000000"/>
      <rect x="60" y="15" width="15" height="15" fill="#000000"/>
      <rect x="15" y="60" width="15" height="15" fill="#000000"/>
      <!-- More QR code patterns would go here -->
      <text x="100" y="190" text-anchor="middle" font-size="10">Scan to view machine details</text>
    `;
  }

  return (
    <div className="p-8">
      <Head>
        <title>Print Machine QR Codes</title>
      </Head>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Print Machine QR Codes</h1>
        <button
          onClick={() => router.push('/machines')}
          className="flex items-center text-purple-600 hover:text-purple-800 transition duration-200"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Machines
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">
            Select Machines ({selectedMachines.length} selected)
          </h2>
          <button
            onClick={printSelectedCards}
            disabled={selectedMachines.length === 0}
            className={`py-2 px-4 rounded transition duration-200 ${
              selectedMachines.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            Print Selected
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map(machine => (
            <div
              key={machine.id}
              onClick={() => toggleMachineSelection(machine.id)}
              className={`p-4 border rounded-lg cursor-pointer transition duration-200 ${
                selectedMachines.includes(machine.id)
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedMachines.includes(machine.id)}
                  onChange={() => toggleMachineSelection(machine.id)}
                  onClick={e => e.stopPropagation()}
                  className="mr-3 h-5 w-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <div>
                  <h3 className="font-medium text-gray-900">Machine #{machine.machine_number}</h3>
                  <p className="text-sm text-gray-500">{machine.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrintCardsPage;