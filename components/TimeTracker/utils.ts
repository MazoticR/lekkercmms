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
    let currentSection: 'operations' | 'hours' | 'efficiency' | 'bonus' = 'operations';

    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const rowValues = row.values as Array<string | number | Date | null | undefined>;
      const firstCellValue = String(rowValues[1] || '').trim();

      // Skip empty rows
      if (!firstCellValue) return;

      // Detect worker section
      const workerMatch = firstCellValue.match(/(\d+)\s*\/\s*(.+)/);
      if (workerMatch) {
        if (currentWorker) workers.push(currentWorker);
        currentWorker = {
          id: workerMatch[1],
          name: workerMatch[2].trim(),
          operations: [],
          hoursWorked: { mon: '0:00', tue: '0:00', wed: '0:00', thu: '0:00', fri: '0:00', sat: '0:00', sun: '0:00' },
          inactiveHours: { mon: '0:00', tue: '0:00', wed: '0:00', thu: '0:00', fri: '0:00', sat: '0:00', sun: '0:00' },
          efficiency: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
          bonus: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 }
        };
        currentSection = 'operations';
        return;
      }

      if (!currentWorker) return;

      // Detect section headers
      if (firstCellValue.match(/Operaci[oó]n/i)) {
        currentSection = 'operations';
        return;
      }
      if (firstCellValue.match(/Horas trabajadas/i)) {
        currentSection = 'hours';
        return;
      }
      if (firstCellValue.match(/Horas tiempo inactivo|Horas tiempo hastivo/i)) {
        currentSection = 'hours';
        return;
      }
      if (firstCellValue.match(/Eficiencia diaria/i)) {
        currentSection = 'efficiency';
        return;
      }
      if (firstCellValue.match(/Bono/i)) {
        currentSection = 'bonus';
        return;
      }

      // Process data based on current section
      switch (currentSection) {
        case 'operations':
          if (rowValues[1] && rowValues[2] && rowValues[3]) {
            const operation: Operation = {
              name: String(rowValues[1]),
              style: String(rowValues[2]),
              order: String(rowValues[3]),
              meta: Number(rowValues[4]) || 0,
              pricePerHour: Number(rowValues[5]) || 0,
              dailyProduction: {
                mon: Number(rowValues[6]) || 0,
                tue: Number(rowValues[7]) || 0,
                wed: Number(rowValues[8]) || 0,
                thu: Number(rowValues[9]) || 0,
                fri: Number(rowValues[10]) || 0,
                sat: Number(rowValues[11]) || 0,
                sun: Number(rowValues[12]) || 0
              },
              total: Number(rowValues[13]) || 0,
              pricePerPiece: Number(rowValues[14]) || 0,
              minutesPerPiece: parseFloat(String(rowValues[15] || '0').replace(/\//g, ''))
            };
            currentWorker.operations.push(operation);
          }
          break;

        case 'hours':
          if (firstCellValue.match(/Horas trabajadas/i)) {
            currentWorker.hoursWorked = {
              mon: formatExcelTime(rowValues[5]),
              tue: formatExcelTime(rowValues[6]),
              wed: formatExcelTime(rowValues[7]),
              thu: formatExcelTime(rowValues[8]),
              fri: formatExcelTime(rowValues[9]),
              sat: formatExcelTime(rowValues[10]),
              sun: formatExcelTime(rowValues[11])
            };
          } else if (firstCellValue.match(/Horas tiempo inactivo|Horas tiempo hastivo/i)) {
            currentWorker.inactiveHours = {
              mon: formatExcelTime(rowValues[5]),
              tue: formatExcelTime(rowValues[6]),
              wed: formatExcelTime(rowValues[7]),
              thu: formatExcelTime(rowValues[8]),
              fri: formatExcelTime(rowValues[9]),
              sat: formatExcelTime(rowValues[10]),
              sun: formatExcelTime(rowValues[11])
            };
          }
          break;

        case 'efficiency':
          currentWorker.efficiency = {
            mon: Number(rowValues[5]) || 0,
            tue: Number(rowValues[6]) || 0,
            wed: Number(rowValues[7]) || 0,
            thu: Number(rowValues[8]) || 0,
            fri: Number(rowValues[9]) || 0,
            sat: Number(rowValues[10]) || 0,
            sun: Number(rowValues[11]) || 0
          };
          break;

        case 'bonus':
          currentWorker.bonus = {
            mon: Number(rowValues[5]) || 0,
            tue: Number(rowValues[6]) || 0,
            wed: Number(rowValues[7]) || 0,
            thu: Number(rowValues[8]) || 0,
            fri: Number(rowValues[9]) || 0,
            sat: Number(rowValues[10]) || 0,
            sun: Number(rowValues[11]) || 0
          };
          break;
      }
    });

    console.log('Parsed workers:', JSON.stringify(workers, null, 2));
    if (currentWorker) workers.push(currentWorker);
    return workers;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Failed to parse Excel file. Please check the file format.');
  }
};

// Helper function to format Excel time values
function formatExcelTime(value: any): string {
  if (!value && value !== 0) return '0:00';
  
  // If it's already in HH:MM format
  if (typeof value === 'string' && value.includes(':')) {
    const [hours, minutes] = value.split(':').map(Number);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
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