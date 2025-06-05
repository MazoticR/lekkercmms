// types/machine-orders.ts
export type MachineOrderStatus = 'requested' | 'ordered' | 'received' | 'cancelled';

export interface MachineOrder {
  id: number;
po_reference: string | null; // Add this
  part_number: string;
  description: string | null;
  quantity: number;
  cost_per_unit: number | null;
  requested_by: string;
  requested_at: string;
  status: MachineOrderStatus;
  received_at: string | null;
  received_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MachineOrderCreate {
  po_reference?: string | null; // Add this
  part_number: string;
  description?: string | null;
  quantity: number;
  cost_per_unit?: number | null;
  requested_by: string;
  notes?: string | null;
}

export interface MachineOrderUpdate {
  po_reference?: string | null; // Add this
  status?: MachineOrderStatus;
  received_by?: string | null;
  notes?: string | null;
}