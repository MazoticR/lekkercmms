import React, { useState, useEffect, useRef } from 'react';
import { WorkerData, DailyHours, Operation } from '@/types/timeTracker';
import { calculateEfficiency, formatTimeFromExcel } from './utils';

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

type DayKey = keyof DailyHours;

const WorkerTable: React.FC<WorkerTableProps> = ({ worker, onUpdate }) => {
  const [inactiveHours, setInactiveHours] = useState<DailyHours>(worker.inactiveHours);
  const [hoursWorked, setHoursWorked] = useState<DailyHours>(worker.hoursWorked);
  const [editing, setEditing] = useState<{type: 'worked' | 'inactive', day: DayKey} | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('Worker data:', {
      id: worker.id,
      hours: worker.hoursWorked,
      operations: worker.operations
    });
  }, [worker]);

  const calculateDailyBonus = (operations: Operation[], day: DayKey) => {
    return operations.reduce((total, op) => {
      const units = op.dailyProduction[day] || 0;
      const pricePerPiece = op.pricePerPiece || 0;
      return total + (units * pricePerPiece);
    }, 0);
  };

  const handleEditStart = (type: 'worked' | 'inactive', day: DayKey) => {
    setEditing({type, day});
    setTempValue(type === 'worked' ? hoursWorked[day] : inactiveHours[day]);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.select();
      }
    }, 10);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers, decimal points, and colons
    const value = e.target.value.replace(/[^\d:.]/g, '');
    setTempValue(value);
  };

  const formatTimeInput = (value: string): string => {
    if (!value) return '0:00';
    return formatTimeFromExcel(value);
  };

  const handleEditSave = () => {
    if (editing) {
      const formattedValue = formatTimeInput(tempValue);

      if (editing.type === 'worked') {
        const updatedHoursWorked = {
          ...hoursWorked,
          [editing.day]: formattedValue
        };
        setHoursWorked(updatedHoursWorked);
        
        const updatedWorker = {
          ...worker,
          hoursWorked: updatedHoursWorked,
          efficiency: calculateEfficiency(worker.operations, updatedHoursWorked, inactiveHours)
        };
        onUpdate(updatedWorker);
      } else {
        const updatedInactiveHours = {
          ...inactiveHours,
          [editing.day]: formattedValue
        };
        setInactiveHours(updatedInactiveHours);
        
        const updatedWorker = {
          ...worker,
          inactiveHours: updatedInactiveHours,
          efficiency: calculateEfficiency(worker.operations, hoursWorked, updatedInactiveHours)
        };
        onUpdate(updatedWorker);
      }
    }
    setEditing(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      setEditing(null);
    }
  };

  const filteredOperations = worker.operations.filter(op => {
    if (!op.name?.trim()) return false;
    
    const lowerName = op.name.toLowerCase();
    if (lowerName.includes("operación") || 
        lowerName.includes("estilo") ||
        lowerName.includes("orden") ||
        lowerName.includes("meta") ||
        lowerName.includes("total")) {
      return false;
    }

    const hasProduction = days.some(day => op.dailyProduction[day.key] > 0);
    const hasValidMeta = !isNaN(op.meta) && op.meta > 0;
    
    return hasProduction || hasValidMeta;
  });

  return (
    <div className="mb-8 bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          {worker.id} / {worker.name}
        </h3>
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
        {/* Hours Worked and Inactive Hours in one row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Horas trabajadas</h4>
            <div className="grid grid-cols-7 gap-2">
              {days.map(day => (
                <div key={`worked-${day.key}`} className="text-center">
                  <div className="text-xs text-gray-500 mb-1">{day.label}</div>
                  {editing?.type === 'worked' && editing.day === day.key ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={tempValue}
                      onChange={handleEditChange}
                      onBlur={handleEditSave}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="w-full text-sm border rounded px-2 py-1 text-center text-gray-900 bg-white"
                      placeholder="HH:MM"
                    />
                  ) : (
                    <div 
                      className="text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-100 rounded"
                      onClick={() => handleEditStart('worked', day.key)}
                    >
                      {hoursWorked[day.key] || '0:00'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Horas inactivas</h4>
            <div className="grid grid-cols-7 gap-2">
              {days.map(day => (
                <div key={`inactive-${day.key}`} className="text-center">
                  <div className="text-xs text-gray-500 mb-1">{day.label}</div>
                  {editing?.type === 'inactive' && editing.day === day.key ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={tempValue}
                      onChange={handleEditChange}
                      onBlur={handleEditSave}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="w-full text-sm border rounded px-2 py-1 text-center text-gray-900 bg-white"
                      placeholder="HH:MM"
                    />
                  ) : (
                    <div 
                      className="text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-100 rounded"
                      onClick={() => handleEditStart('inactive', day.key)}
                    >
                      {inactiveHours[day.key] || '0:00'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Efficiency in its own row */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Eficiencia</h4>
          <div className="grid grid-cols-7 gap-2">
            {days.map(day => (
              <div key={`efficiency-${day.key}`} className="text-center">
                <div className="text-xs text-gray-500 mb-1">{day.label}</div>
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

        {/* Bonus in its own row */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Bono</h4>
          <div className="grid grid-cols-7 gap-2">
            {days.map(day => (
              <div key={`bonus-${day.key}`} className="text-center">
                <div className="text-xs text-gray-500 mb-1">{day.label}</div>
                <div className="text-sm font-medium text-green-600">
                  ${calculateDailyBonus(worker.operations, day.key).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerTable;