import React, { useState, useEffect } from 'react';
import { WorkerData, DailyHours } from '@/types/timeTracker';
import { calculateEfficiency } from './utils';

interface WorkerTableProps {
  worker: WorkerData;
  onUpdate: (updatedWorker: WorkerData) => void;
}

const days = [
  { key: 'mon', label: 'Lun' },
  { key: 'tue', label: 'Mar' },
  { key: 'wed', label: 'Mie' },
  { key: 'thu', label: 'Jue' },
  { key: 'fri', label: 'Vie' },
  { key: 'sat', label: 'Sab' },
  { key: 'sun', label: 'Dom' }
] as const;

const WorkerTable: React.FC<WorkerTableProps> = ({ worker, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [inactiveHours, setInactiveHours] = useState<DailyHours>(worker.inactiveHours);

  useEffect(() => {
    console.log('Worker data:', {
      id: worker.id,
      hours: worker.hoursWorked,
      operations: worker.operations
    });
  }, [worker]);

  const handleInactiveHoursChange = (day: keyof DailyHours, value: string) => {
    setInactiveHours(prev => ({
      ...prev,
      [day]: value
    }));
  };

  const handleSave = () => {
    const updatedWorker = {
      ...worker,
      inactiveHours,
      efficiency: calculateEfficiency(worker.operations, worker.hoursWorked, inactiveHours)
    };
    onUpdate(updatedWorker);
    setEditing(false);
  };

  const handleCancel = () => {
    setInactiveHours(worker.inactiveHours);
    setEditing(false);
  };


// Replace the filteredOperations const with this:
const filteredOperations = worker.operations.filter(op => {
  // Skip if name is empty
  if (!op.name?.trim()) return false;
  
  // Skip header-like rows
  const lowerName = op.name.toLowerCase();
  if (lowerName.includes("operación") || 
      lowerName.includes("estilo") ||
      lowerName.includes("orden") ||
      lowerName.includes("meta") ||
      lowerName.includes("total")) {
    return false;
  }

  // Skip rows with all zeros and no meta
  const hasProduction = days.some(day => op.dailyProduction[day.key] > 0);
  const hasValidMeta = !isNaN(op.meta) && op.meta > 0;
  
  return hasProduction || hasValidMeta;
});

  return (
    <div className="mb-8 bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          {worker.id} / {worker.name}
        </h3>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Edit
          </button>
        ) : (
          <div className="space-x-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

<div className="overflow-x-auto">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operación</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estilo</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orden</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meta</th>
        {days.map(day => (
          <th key={day.key} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
            {day.label}
          </th>
        ))}
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {filteredOperations.length > 0 ? (
        filteredOperations.map((op, idx) => (
          <tr key={idx}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{op.name}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{op.style}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{op.order}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {isNaN(op.meta) ? '-' : op.meta}
            </td>
            {days.map(day => (
              <td key={day.key} className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                {op.dailyProduction[day.key] || 0}
              </td>
            ))}
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {isNaN(op.total) ? '-' : op.total}
            </td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan={11} className="px-6 py-4 text-center text-sm text-gray-500">
            No hay datos de producción disponibles
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Horas trabajadas</h4>
            <div className="grid grid-cols-7 gap-1">
              {days.map(day => (
                <div key={day.key} className="text-center">
                  <div className="text-xs text-black">{day.label}</div>
                  <div className="text-sm font-medium text-black">
                    {worker.hoursWorked[day.key] || '0:00'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Horas inactivas</h4>
            <div className="grid grid-cols-7 gap-1">
              {days.map(day => (
                <div key={day.key} className="text-center">
                  <div className="text-xs text-black">{day.label}</div>
                  {editing ? (
                    <input
                      type="text"
                      value={inactiveHours[day.key]}
                      onChange={(e) => handleInactiveHoursChange(day.key, e.target.value)}
                      className="w-full text-sm border rounded px-2 py-1"
                      placeholder="HH:MM"
                    />
                  ) : (
                    <div className="text-sm font-medium text-black">{worker.inactiveHours[day.key]}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Eficiencia</h4>
            <div className="grid grid-cols-7 gap-1">
              {days.map(day => (
                <div key={day.key} className="text-center">
                  <div className="text-xs text-gray-500">{day.label}</div>
                  <div
                    className={`text-sm font-medium ${
                      worker.efficiency[day.key] >= 100
                        ? 'text-green-600'
                        : worker.efficiency[day.key] >= 80
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {isNaN(worker.efficiency[day.key]) ? '0%' : worker.efficiency[day.key].toFixed(2) + '%'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerTable;