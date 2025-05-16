// types/db_types.ts
export type Database = {
  machines: {
    Row: {
      id: number;
      name: string;
      location: string;
      status: string;
    };
    Insert: {
      name: string;
      location: string;
      status: string;
    };
  };
  machine_parts: {
    Row: {
      id: number;
      machine_id: number;
      part_name: string;
      code: string;
      last_replaced_date: string | null;
    };
    Insert: {
      machine_id: number;
      part_name: string;
      code: string;
      last_replaced_date?: string | null;
    };
  };
    inventory_parts: {
    Row: {
      id: number;
      part_number: string;
      description: string | null;
      quantity: number;
      cost: number | null;
      min_quantity: number;
      last_updated: string;
    };
    Insert: {
      part_number: string;
      description?: string | null;
      quantity?: number;
      cost?: number | null;
      min_quantity?: number;
    };
  };

};


/* Extended type for machine parts (optional)
export interface MachinePartWithInventory extends MachinePart {
  inventory_part?: InventoryPart | null;
}*/