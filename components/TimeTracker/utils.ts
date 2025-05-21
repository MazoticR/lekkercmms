import ExcelJS from 'exceljs';
import { WorkerData, Operation, DailyHours, DailyEfficiency, DailyBonus } from '@/types/timeTracker';

function extractAllHours(worksheet: ExcelJS.Worksheet): Record<string, DailyHours> {
  const hoursMap: Record<string, DailyHours> = {};
  let currentWorkerId = '';
  
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const rowValues = row.values as Array<any>;
    
    // Track current worker
    const workerMatch = String(rowValues[1] || '').match(/(\d+)\s*\/\s*(.+)/);
    if (workerMatch) {
      currentWorkerId = workerMatch[1];
      return;
    }
    
    // Check for "Horas trabajadas" row (now accounting for leading 0)
    const horasCell = String(rowValues[2] || '').trim().toLowerCase();
    if (horasCell.includes("horas trabajadas") && currentWorkerId) {
      // The times are offset by 1 column because of the leading 0
      // Columns are now: [empty, "Horas...", 0, Mon, Tue, Wed, Thu, Fri, Sat, Sun]
      hoursMap[currentWorkerId] = {
        mon: formatTimeFromExcel(rowValues[6]),  // Actual Monday (was index 5)
        tue: formatTimeFromExcel(rowValues[7]),  // Tuesday
        wed: formatTimeFromExcel(rowValues[8]),  // Wednesday
        thu: formatTimeFromExcel(rowValues[9]),  // Thursday
        fri: formatTimeFromExcel(rowValues[10]), // Friday
        sat: formatTimeFromExcel(rowValues[11]), // Saturday
        sun: formatTimeFromExcel(rowValues[12])  // Sunday
      };
      
      console.log('Parsed hours:', {
        row: rowNumber,
        values: rowValues.slice(6, 13), // Show the relevant columns
        mappedHours: hoursMap[currentWorkerId]
      });
    }
  });
  
  return hoursMap;
}

export const parseExcelFile = async (file: File): Promise<WorkerData[]> => {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    const allHours = extractAllHours(worksheet);
    const workers: WorkerData[] = [];
    let currentWorker: WorkerData | null = null;

    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const rowValues = row.values as Array<any>;
      if (!rowValues || !rowValues[1]) return;

      const workerMatch = String(rowValues[1]).match(/(\d+)\s*\/\s*(.+)/);
      if (workerMatch) {
        if (currentWorker) workers.push(currentWorker);
        
        currentWorker = {
          id: workerMatch[1],
          name: workerMatch[2].trim(),
          operations: [],
          hoursWorked: allHours[workerMatch[1]] || { 
            mon: '0:00', tue: '0:00', wed: '0:00', 
            thu: '0:00', fri: '0:00', sat: '0:00', sun: '0:00' 
          },
          inactiveHours: { mon: '0:00', tue: '0:00', wed: '0:00', thu: '0:00', fri: '0:00', sat: '0:00', sun: '0:00' },
          efficiency: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
          bonus: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 }
        };
        return;
      }

      if (!currentWorker) return;

      // Check for hours worked row - EXACT match with case insensitivity
      if (String(rowValues[1]).trim().match(/^horas trabajadas$/i)) {
        currentWorker.hoursWorked = {
          mon: rowValues[5] ? String(rowValues[5]) : '0:00',
          tue: rowValues[6] ? String(rowValues[6]) : '0:00',
          wed: rowValues[7] ? String(rowValues[7]) : '0:00',
          thu: rowValues[8] ? String(rowValues[8]) : '0:00',
          fri: rowValues[9] ? String(rowValues[9]) : '0:00',
          sat: rowValues[10] ? String(rowValues[10]) : '0:00',
          sun: rowValues[11] ? String(rowValues[11]) : '0:00'
        };
        return;
      }

      // Check for inactive hours row
      if (String(rowValues[1]).match(/Hozas tiempo inactivo|Horas tiempo inactivo/i)) {
        currentWorker.inactiveHours = {
          mon: formatTimeFromExcel(rowValues[5]),
          tue: formatTimeFromExcel(rowValues[6]),
          wed: formatTimeFromExcel(rowValues[7]),
          thu: formatTimeFromExcel(rowValues[8]),
          fri: formatTimeFromExcel(rowValues[9]),
          sat: formatTimeFromExcel(rowValues[10]),
          sun: formatTimeFromExcel(rowValues[11])
        };
        return;
      }

      // Check for efficiency row
      if (String(rowValues[1]).match(/Eficiencia diaria|Elfabetos distrita/i)) {
        currentWorker.efficiency = {
          mon: parseFloat(String(rowValues[5] || '0')),
          tue: parseFloat(String(rowValues[6] || '0')),
          wed: parseFloat(String(rowValues[7] || '0')),
          thu: parseFloat(String(rowValues[8] || '0')),
          fri: parseFloat(String(rowValues[9] || '0')),
          sat: parseFloat(String(rowValues[10] || '0')),
          sun: parseFloat(String(rowValues[11] || '0'))
        };
        return;
      }

      // Process operation row (if it has enough data)
      if (rowValues[1] && rowValues[2] && rowValues[3] && rowValues[4]) {
        const operation: Operation = {
          name: String(rowValues[1] || ''),
          style: String(rowValues[2] || ''),
          order: String(rowValues[3] || ''),
          meta: parseFloat(String(rowValues[4] || '0')),
          pricePerHour: parseFloat(String(rowValues[5] || '0')),
          dailyProduction: {
            mon: parseFloat(String(rowValues[6] || '0')),
            tue: parseFloat(String(rowValues[7] || '0')),
            wed: parseFloat(String(rowValues[8] || '0')),
            thu: parseFloat(String(rowValues[9] || '0')),
            fri: parseFloat(String(rowValues[10] || '0')),
            sat: parseFloat(String(rowValues[11] || '0')),
            sun: parseFloat(String(rowValues[12] || '0'))
          },
          total: parseFloat(String(rowValues[13] || '0')),
          pricePerPiece: parseFloat(String(rowValues[14] || '0')),
          minutesPerPiece: parseFloat(String(rowValues[15] || '0').replace(/\//g, ''))
        };
        currentWorker.operations.push(operation);
      }
    });

    if (currentWorker) workers.push(currentWorker);
    return workers;
  } catch (error) {
    console.error('Error parsing Excel:', error);
    throw error;
  }
};

function formatTimeFromExcel(value: any): string {
  if (value === null || value === undefined || value === '') return '0:00';
  
  // Handle Excel time numbers (0.5 = 12:00)
  if (typeof value === 'number') {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  // Handle strings
  if (typeof value === 'string') {
    const cleanValue = value.trim();
    
    // Already in HH:MM format
    if (/^\d{1,2}:\d{2}$/.test(cleanValue)) return cleanValue;
    
    // Decimal hours (8.5 = 8:30)
    if (/^\d+\.\d+$/.test(cleanValue)) {
      const [hours, decimal] = cleanValue.split('.');
      const minutes = Math.round(parseFloat(`0.${decimal}`) * 60);
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // Just a number (8 = 8:00)
    if (/^\d+$/.test(cleanValue)) return `${cleanValue}:00`;
  }

  return '0:00';
}

export const calculateEfficiency = (
  operations: Operation[],
  hoursWorked: DailyHours,
  inactiveHours: DailyHours
): DailyEfficiency => {
  const efficiency: DailyEfficiency = {
    mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
  };

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

  days.forEach(day => {
    try {
      // 1. Calculate sum of (Worked Units / Meta) for all operations
      const totalUnitsOverMeta = operations.reduce((sum, op) => {
        const workedUnits = op.dailyProduction[day];
        const meta = op.meta;
        
        // Only count if both values are valid numbers > 0
        if (meta > 0 && workedUnits > 0) {
          return sum + (workedUnits / meta);
        }
        return sum;
      }, 0);

      // 2. Parse worked hours and inactive hours (HH:MM format)
      const [workedH = 0, workedM = 0] = hoursWorked[day].split(':').map(Number);
      const [inactiveH = 0, inactiveM = 0] = inactiveHours[day].split(':').map(Number);

      // 3. Calculate available hours (worked - inactive)
      const totalWorkedHours = workedH + (workedM / 60);
      const totalInactiveHours = inactiveH + (inactiveM / 60);
      const availableHours = Math.max(0, totalWorkedHours - totalInactiveHours);

      // 4. Calculate efficiency percentage
      if (availableHours > 0 && totalUnitsOverMeta > 0) {
        efficiency[day] = (totalUnitsOverMeta / availableHours) * 100;
      } else {
        efficiency[day] = 0; // Prevent NaN
      }

    } catch (error) {
      console.error(`Error calculating efficiency for ${day}:`, error);
      efficiency[day] = 0;
    }
  });

  return efficiency;
};

export const generateExcelFile = async (workers: WorkerData[]): Promise<Blob> => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Workers Data'); // Single worksheet for all workers

    // Add headers only once at the top
    const headers = [
      'ID', 'Nombre', 'Operación', 'Estilo', 'Orden', 'Meta', 'Precio por hora',
      'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom',
      'Total', 'Precio por pista', 'Minutos por pista',
      'Horas trabajadas', 'Horas inactivas', 'Eficiencia', 'Bono'
    ];
    worksheet.addRow(headers);

    // Add data for each worker
    workers.forEach(worker => {
      // Add a blank row before each worker for better readability
      worksheet.addRow([]);

      // Add operations data
      for (const op of worker.operations) {
        worksheet.addRow([
          worker.id, 
          worker.name,
          op.name, 
          op.style, 
          op.order, 
          op.meta, 
          op.pricePerHour,
          op.dailyProduction.mon, 
          op.dailyProduction.tue, 
          op.dailyProduction.wed,
          op.dailyProduction.thu, 
          op.dailyProduction.fri, 
          op.dailyProduction.sat,
          op.dailyProduction.sun, 
          op.total, 
          op.pricePerPiece, 
          op.minutesPerPiece,
          '', '', '', '' // Placeholders for hours, efficiency, bonus
        ]);
      }

      // Add summary rows (hours worked, inactive hours, efficiency, bonus)
      worksheet.addRow([
        worker.id, 
        worker.name,
        'Horas trabajadas', '', '', '', '',
        worker.hoursWorked.mon, worker.hoursWorked.tue, worker.hoursWorked.wed,
        worker.hoursWorked.thu, worker.hoursWorked.fri, worker.hoursWorked.sat,
        worker.hoursWorked.sun, '', '', '',
        '', '', '' // Placeholders
      ]);

      worksheet.addRow([
        worker.id, 
        worker.name,
        'Horas inactivas', '', '', '', '',
        worker.inactiveHours.mon, worker.inactiveHours.tue, worker.inactiveHours.wed,
        worker.inactiveHours.thu, worker.inactiveHours.fri, worker.inactiveHours.sat,
        worker.inactiveHours.sun, '', '', '',
        '', '', '' // Placeholders
      ]);

      worksheet.addRow([
        worker.id, 
        worker.name,
        'Eficiencia', '', '', '', '',
        worker.efficiency.mon.toFixed(2), 
        worker.efficiency.tue.toFixed(2),
        worker.efficiency.wed.toFixed(2), 
        worker.efficiency.thu.toFixed(2),
        worker.efficiency.fri.toFixed(2), 
        worker.efficiency.sat.toFixed(2),
        worker.efficiency.sun.toFixed(2), '', '', '',
        '', '', '' // Placeholders
      ]);

      worksheet.addRow([
        worker.id, 
        worker.name,
        'Bono', '', '', '', '',
        worker.bonus?.mon || 0, 
        worker.bonus?.tue || 0,
        worker.bonus?.wed || 0,
        worker.bonus?.thu || 0,
        worker.bonus?.fri || 0,
        worker.bonus?.sat || 0,
        worker.bonus?.sun || 0, '', '', '',
        '', '', '' // Placeholders
      ]);
    });

    // Style the worksheet for better readability
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  } catch (error) {
    console.error('Error generating Excel file:', error);
    throw new Error('Failed to generate Excel file');
  }
};