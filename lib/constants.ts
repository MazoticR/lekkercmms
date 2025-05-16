export const MACHINE_STATUSES = [
  { value: 'operational', label: 'Operational' },
  { value: 'maintenance', label: 'Under Maintenance' },
  { value: 'out_of_service', label: 'Out of Service' },
  { value: 'retired', label: 'Retired' },
] as const;

export type MachineStatus = typeof MACHINE_STATUSES[number]['value'];