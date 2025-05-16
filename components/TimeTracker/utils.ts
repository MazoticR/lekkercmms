import ExcelJS from 'exceljs';
import { WorkerData, Operation, DailyHours, DailyEfficiency, DailyBonus } from '@/types/timeTracker';

export const parseExcelFile = async (file: File): Promise<WorkerData[]> => {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    const workers: WorkerData[] = [];
    let currentWorker: WorkerData | null = null;

    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const rowValues = row.values as Array<string | number | Date | null | undefined>;
      
      // Skip header rows or empty rows
      if (rowNumber <= 2 || !rowValues[1]) return;

      // Check for worker header row
      const workerMatch = String(rowValues[1]).match(/(\d+)\s*\/\s*(.+)/);
      if (workerMatch) {
        if (currentWorker) workers.push(currentWorker);
        currentWorker = {
          id: workerMatch[1],
          name: workerMatch[2].trim(),
          operations: [],
          hoursWorked: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
          inactiveHours: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
          efficiency: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
          bonus: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 }
        };
        return;
      }

      if (!currentWorker) return;

      // Check for operations header row
      if (String(rowValues[1]).match(/Operaci[oó]n/i)) return;

      // Check for hours worked row
      if (String(rowValues[1]).match(/Horas trabajadas/i)) {
        currentWorker.hoursWorked = {
          mon: formatExcelTime(rowValues[5]),
          tue: formatExcelTime(rowValues[6]),
          wed: formatExcelTime(rowValues[7]),
          thu: formatExcelTime(rowValues[8]),
          fri: formatExcelTime(rowValues[9]),
          sat: formatExcelTime(rowValues[10]),
          sun: formatExcelTime(rowValues[11])
        };
        return;
      }

      // Check for inactive hours row
      if (String(rowValues[1]).match(/Horas tiempo inactivo|Horas tiempo hastivo/i)) {
        currentWorker.inactiveHours = {
          mon: String(rowValues[5] || ''),
          tue: String(rowValues[6] || ''),
          wed: String(rowValues[7] || ''),
          thu: String(rowValues[8] || ''),
          fri: String(rowValues[9] || ''),
          sat: String(rowValues[10] || ''),
          sun: String(rowValues[11] || '')
        };
        return;
      }

      // Check for efficiency row
      if (String(rowValues[1]).match(/Eficiencia diaria/i)) {
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

      // Check for bonus row
      if (String(rowValues[1]).match(/Bono/i)) {
        currentWorker.bonus = {
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

      // Process operation row
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

    // Add the last worker if exists
    if (currentWorker) {
      workers.push(currentWorker);
    }

    return workers;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Failed to parse Excel file. Please ensure it matches the expected format.');
  }
};

// Helper function to format Excel time values
function formatExcelTime(value: any): string {
  if (!value) return '0:00';
  
  // If it's already in HH:MM format
  if (typeof value === 'string' && value.includes(':')) {
    return value;
  }
  
  // If it's a number (Excel time format)
  if (typeof value === 'number') {
    const totalMinutes = Math.floor(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // If it's a Date object
  if (value instanceof Date) {
    return `${value.getHours()}:${value.getMinutes().toString().padStart(2, '0')}`;
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

  for (const day of days) {
    // Calculate total standard minutes for the day
    let totalStandardMinutes = 0;
    for (const op of operations) {
      totalStandardMinutes += op.dailyProduction[day] * op.minutesPerPiece;
    }

    // Parse worked hours (format: "HH:MM")
    const workedTimeParts = hoursWorked[day].split(':').map(Number);
    const workedHours = workedTimeParts[0] || 0;
    const workedMinutes = workedTimeParts[1] || 0;
    const totalWorkedMinutes = workedHours * 60 + workedMinutes;

    // Parse inactive hours (format: "HH:MM")
    const inactiveTimeParts = inactiveHours[day].split(':').map(Number);
    const inactiveHoursNum = inactiveTimeParts[0] || 0;
    const inactiveMinutesNum = inactiveTimeParts[1] || 0;
    const totalInactiveMinutes = inactiveHoursNum * 60 + inactiveMinutesNum;

    // Calculate available minutes
    const availableMinutes = totalWorkedMinutes - totalInactiveMinutes;

    // Calculate efficiency percentage
    if (availableMinutes > 0) {
      efficiency[day] = (totalStandardMinutes / availableMinutes) * 100;
    }
  }

  return efficiency;
};

export const generateExcelFile = async (workers: WorkerData[]): Promise<Blob> => {
  try {
    const workbook = new ExcelJS.Workbook();
    
    workers.forEach(worker => {
      const worksheet = workbook.addWorksheet(worker.name.substring(0, 31));

      // Add worker header
      worksheet.addRow([`${worker.id} / ${worker.name}`]);
      worksheet.addRow([]);

      // Add operations header
      worksheet.addRow([
        'Operación', 'Estilo', 'Orden', 'Meta', 'Precio por hora',
        'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom',
        'Total', 'Precio por pista', 'Minutos por pista'
      ]);

      // Add operations
      for (const op of worker.operations) {
        worksheet.addRow([
          op.name, op.style, op.order, op.meta, op.pricePerHour,
          op.dailyProduction.mon, op.dailyProduction.tue, op.dailyProduction.wed,
          op.dailyProduction.thu, op.dailyProduction.fri, op.dailyProduction.sat,
          op.dailyProduction.sun, op.total, op.pricePerPiece, op.minutesPerPiece
        ]);
      }

      // Add hours worked
      worksheet.addRow([
        'Horas trabajadas', '', '', '', '',
        worker.hoursWorked.mon, worker.hoursWorked.tue, worker.hoursWorked.wed,
        worker.hoursWorked.thu, worker.hoursWorked.fri, worker.hoursWorked.sat,
        worker.hoursWorked.sun
      ]);

      // Add inactive hours
      worksheet.addRow([
        'Horas tiempo inactivo', '', '', '', '',
        worker.inactiveHours.mon, worker.inactiveHours.tue, worker.inactiveHours.wed,
        worker.inactiveHours.thu, worker.inactiveHours.fri, worker.inactiveHours.sat,
        worker.inactiveHours.sun
      ]);

      // Add efficiency
      worksheet.addRow([
        'Eficiencia diaria', '', '', '', '',
        worker.efficiency.mon.toFixed(2), worker.efficiency.tue.toFixed(2),
        worker.efficiency.wed.toFixed(2), worker.efficiency.thu.toFixed(2),
        worker.efficiency.fri.toFixed(2), worker.efficiency.sat.toFixed(2),
        worker.efficiency.sun.toFixed(2)
      ]);

      // Add bonus
                worksheet.addRow([
                'Bono', '', '', '', '',
                worker.bonus?.mon || 0, 
                worker.bonus?.tue || 0,
                worker.bonus?.wed || 0,
                worker.bonus?.thu || 0,
                worker.bonus?.fri || 0,
                worker.bonus?.sat || 0,
                worker.bonus?.sun || 0
                ]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  } catch (error) {
    console.error('Error generating Excel file:', error);
    throw new Error('Failed to generate Excel file');
  }
};