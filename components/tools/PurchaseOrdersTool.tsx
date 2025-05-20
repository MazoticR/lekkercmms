// components/tools/PurchaseOrdersTool.tsx
import { useState } from 'react';
import styles from '../../styles/tools/PurchaseOrders.module.css';
import { 
  PurchaseOrder, 
  Vendor,
  PurchaseOrdersResponse 
} from '../../types/purchase-orders';

export default function PurchaseOrdersTool() {
  const [year, setYear] = useState('2025');
  const [month, setMonth] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendorCache, setVendorCache] = useState<Record<string, string>>({});

  const EXCLUDED_VENDOR_IDS = ["91", "26", "10", "70"];
  const API_TOKEN = '6002f37a06cc09759259a7c5eabff471';

  // Helper functions
  const getMonthName = (monthValue: string) => [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ][parseInt(monthValue) - 1];

  const formatDisplayDate = (dateString: string) => 
    dateString ? dateString.split('/').reverse().join('/') : '';

  const formatCurrency = (amount: number | string) => {
    if (!amount) return '$0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return '$' + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };

  const getFirstItemField = (order: PurchaseOrder, field: string) => 
    order.purchase_order_items?.[0]?.[field] || '';

  const getStatus = (order: PurchaseOrder) => {
    if (order.qty_open === "0.00") return "Completado";
    if (order.qty_cxl && order.qty_cxl !== "0.00") return "Cancelado";
    if (order.qty_received && order.qty_received !== "0.00") return "Parcialmente Recibido";
    return "Abierto";
  };

  const fetchVendorNames = async (vendorIds: string[]) => {
    if (!vendorIds.length) return;
    const time = Math.floor(Date.now() / 1000);
    
    try {
      const response = await fetch(`/api/vendors?token=${API_TOKEN}&time=${time}`);
      const data: { response?: Vendor[] } = await response.json();
      
      const newCache = {...vendorCache};
      data.response?.forEach((vendor) => {
        if (vendor.vendor_id && vendor.vendor_name) {
          newCache[vendor.vendor_id] = vendor.vendor_name;
        }
      });
      setVendorCache(newCache);
      
    } catch (error) {
      console.error("Error fetching vendors:", error);
      setError('Nota: No se pudieron cargar los nombres de los proveedores');
    }
  };

  const handleFetch = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const time = Math.floor(Date.now() / 1000);
      const params = new URLSearchParams({
        token: API_TOKEN,
        time: time.toString(),
        'parameters[0][field]': 'date_internal',
        'parameters[0][operator]': '>=',
        'parameters[0][value]': `${year}-${month.padStart(2, '0')}-01`,
        'parameters[1][field]': 'date_internal',
        'parameters[1][operator]': '<=',
        'parameters[1][value]': `${year}-${month.padStart(2, '0')}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`
      });

      const response = await fetch(`/api/purchase_orders?${params}`);
      const data: PurchaseOrdersResponse = await response.json();
      
      const filteredOrders = (data.response || []).filter((order) => 
        order.vendor_id && !EXCLUDED_VENDOR_IDS.includes(order.vendor_id)
      );
      
      setOrders(filteredOrders);
      await fetchVendorNames([...new Set(filteredOrders.map((o) => o.vendor_id))]);
      
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const time = Math.floor(Date.now() / 1000);
      const params = new URLSearchParams({
        token: API_TOKEN,
        time: time.toString(),
        'parameters[0][field]': 'date_internal',
        'parameters[0][operator]': '>=',
        'parameters[0][value]': `${year}-${month.padStart(2, '0')}-01`,
        'parameters[1][field]': 'date_internal',
        'parameters[1][operator]': '<=',
        'parameters[1][value]': `${year}-${month.padStart(2, '0')}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`
      });

      const response = await fetch(`/api/purchase_orders?${params}`);
      const data: PurchaseOrdersResponse = await response.json();
      
      const filteredOrders = (data.response || []).filter((order) => 
        order.vendor_id && !EXCLUDED_VENDOR_IDS.includes(order.vendor_id)
      );

      const csvContent = [
        ['PO Number', 'Vendor ID', 'Vendor Name', 'Item', 'Material Description', 
         'Status', 'Department', 'PO Date', 'Due Date', 'Total Units', 'PO Total'].join(','),
        ...filteredOrders.map((order) => [
          order.purchase_order_id || '',
          order.vendor_id || '',
          vendorCache[order.vendor_id] || 'Vendor no encontrado',
          getFirstItemField(order, 'style_number'),
          getFirstItemField(order, 'description'),
          getStatus(order),
          order.division_id || '',
          formatDisplayDate(order.date),
          formatDisplayDate(order.date_due),
          order.qty || 0,
          order.amount || 0
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ordenes_compra_${month}_${year}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      alert(`Error al exportar: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className={styles.container}>
      <h1>POs por mes</h1>
      
      <div className={styles.controls}>
        <select 
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          <option value="2025">2025</option>
        </select>
        
        <select 
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          <option value="1">Enero</option>
          <option value="2">Febrero</option>
          <option value="3">Marzo</option>
          <option value="4">Abril</option>
          <option value="5">Mayo</option>
          <option value="6">Junio</option>
          <option value="7">Julio</option>
          <option value="8">Agosto</option>
          <option value="9">Septiembre</option>
          <option value="10">Octubre</option>
          <option value="11">Noviembre</option>
          <option value="12">Diciembre</option>
        </select>
        
        <button 
          onClick={handleFetch}
          disabled={isLoading}
        >
          {isLoading ? 'Cargando...' : 'Generar Reporte'}
        </button>
        <button onClick={handleExport}>
          Exportar a Excel
        </button>
      </div>
      
      {error && <p className={styles.error}>{error}</p>}
      
      {orders.length > 0 ? (
        <div className={styles.tableContainer}>
          <h2>Órdenes de Compra - {getMonthName(month)}/{year}</h2>
          <div className={styles.tableContainer}>
            <table className={styles.poTable}>
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Vendor ID</th>
                  <th>Vendor Name</th>
                  <th>Item</th>
                  <th>Material Description</th>
                  <th>Status</th>
                  <th>Department</th>
                  <th>PO Date</th>
                  <th>Due Date</th>
                  <th>Total Units</th>
                  <th>PO Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.purchase_order_id}>
                    <td>{order.purchase_order_id || ''}</td>
                    <td>{order.vendor_id || ''}</td>
                    <td>{vendorCache[order.vendor_id] || 'Vendor no encontrado'}</td>
                    <td>{getFirstItemField(order, 'style_number')}</td>
                    <td>{getFirstItemField(order, 'description')}</td>
                    <td>{getStatus(order)}</td>
                    <td>{order.division_id || ''}</td>
                    <td>{formatDisplayDate(order.date)}</td>
                    <td>{formatDisplayDate(order.date_due)}</td>
                    <td className={styles.numeric}>{order.qty || 0}</td>
                    <td className={styles.numeric}>{formatCurrency(order.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !isLoading && <p>No se encontraron órdenes de compra para este período</p>
      )}
    </div>
  );
}