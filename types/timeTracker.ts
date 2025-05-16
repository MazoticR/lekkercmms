export interface WorkerData {
  id: string;
  name: string;
  operations: Operation[];
  hoursWorked: DailyHours;
  inactiveHours: DailyHours;
  efficiency: DailyEfficiency;
  bonus?: DailyBonus; // Make bonus optional
}

export interface Operation {
  name: string;
  style: string;
  order: string;
  meta: number;
  pricePerHour: number;
  dailyProduction: DailyProduction;
  total: number;
  pricePerPiece: number;
  minutesPerPiece: number;
}

export interface DailyProduction {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

export interface DailyHours {
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  sat: string;
  sun: string;
}

export interface DailyEfficiency {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

export interface DailyBonus {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}