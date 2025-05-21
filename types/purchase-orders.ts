// types/purchase-orders.ts
export interface PurchaseOrder {
  purchase_order_id: string;
  vendor_id: string;
  date: string;
  date_due: string;
  qty: string;
  amount: number | string;
  division_id: string;
  qty_open: string;
  qty_cxl: string;
  qty_received: string;
  purchase_order_items: Array<{
    style_number?: string;
    description?: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export interface Vendor {
  vendor_id: string;
  vendor_name: string;
}

export interface PurchaseOrdersResponse {
  response: PurchaseOrder[];
  meta: {
    errors: string[];
  };
}