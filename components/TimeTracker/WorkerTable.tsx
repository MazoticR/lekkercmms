import React, { useState } from 'react';
import { WorkerData, DailyHours } from '@/types/timeTracker';
import { calculateEfficiency } from './utils';

interface WorkerTableProps {
  worker: WorkerData;
  onUpdate: (updatedWorker: WorkerData) => void;
}

const WorkerTable: React.FC<WorkerTableProps> = ({ worker, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [inactiveHours, setInactiveHours] = useState<DailyHours>(worker.inactiveHours);

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

  const days = [
    { key: 'mon', label: 'Lun' },
    { key: 'tue', label: 'Mar' },
    { key: 'wed', label: 'Mie' },
    { key: 'thu', label: 'Jue' },
    { key: 'fri', label: 'Vie' },
    { key: 'sat', label: 'Sab' },
    { key: 'sun', label: 'Dom' }
  ];

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
              {days.map(day => (
                <th key={day.key} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {day.label}
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {worker.operations.map((op, idx) => (
              <tr key={idx}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{op.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{op.style}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{op.order}</td>
                {days.map(day => (
                  <td key={day.key} className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {op.dailyProduction[day.key as keyof typeof op.dailyProduction]}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{op.total}</td>
              </tr>
            ))}
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
                  <div className="text-xs text-gray-500">{day.label}</div>
                  <div className="text-sm font-medium">{worker.hoursWorked[day.key as keyof DailyHours]}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Horas inactivas</h4>
            <div className="grid grid-cols-7 gap-1">
              {days.map(day => (
                <div key={day.key} className="text-center">
                  <div className="text-xs text-gray-500">{day.label}</div>
                  {editing ? (
                    <input
                      type="text"
                      value={inactiveHours[day.key as keyof DailyHours]}
                      onChange={(e) => handleInactiveHoursChange(day.key as keyof DailyHours, e.target.value)}
                      className="w-full text-sm border rounded px-2 py-1"
                      placeholder="HH:MM"
                    />
                  ) : (
                    <div className="text-sm font-medium">{worker.inactiveHours[day.key as keyof DailyHours]}</div>
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
                      worker.efficiency[day.key as keyof typeof worker.efficiency] >= 100
                        ? 'text-green-600'
                        : worker.efficiency[day.key as keyof typeof worker.efficiency] >= 80
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {worker.efficiency[day.key as keyof typeof worker.efficiency].toFixed(2)}%
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