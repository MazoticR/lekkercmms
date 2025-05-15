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
};
