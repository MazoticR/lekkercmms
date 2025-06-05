'use client';

import { useState } from 'react';
import { 
  PurchaseOrder, 
  Vendor,
  PurchaseOrdersResponse 
} from '../../types/purchase-orders';
import Head from 'next/head';

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

const formatDisplayDate = (dateString: string) => {
  if (!dateString) return '';
  const [month, day, year] = dateString.split('/');
  return `${day}/${month}/${year}`;
};

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
      const response = await fetch(`/api/proxy/vendors?token=${API_TOKEN}&time=${time}`);
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
    // Use the state values directly instead of trying to access select elements
    const selectedYear = year;
    const selectedMonth = month.padStart(2, '0');
    
    // Fetch all purchase orders (no date filtering parameters)
    const time = Math.floor(Date.now() / 1000);
    const params = {
      token: API_TOKEN,
      time: time.toString()
    };

    const queryString = new URLSearchParams(params).toString();
    const apiUrl = `/api/proxy/purchase_orders?${queryString}`;
    console.log('API Request URL:', apiUrl);

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        errorData
      });
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data: PurchaseOrdersResponse = await response.json();
    console.log('API Response Data:', data);

    if (!data.response) {
      throw new Error('Invalid API response structure');
    }

    // Filter by month and year client-side (like in original HTML)
    const filteredOrders = data.response.filter(order => {
      if (!order.date) return false;
      const [orderMonth, orderDay, orderYear] = order.date.split('/');
      return orderYear === selectedYear && orderMonth === selectedMonth;
    }).filter(order => 
      order.vendor_id && !EXCLUDED_VENDOR_IDS.includes(order.vendor_id)
    );
    
    setOrders(filteredOrders);
    await fetchVendorNames([...new Set(filteredOrders.map(o => o.vendor_id))]);

  } catch (error) {
    console.error('Full Error:', error);
    setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setIsLoading(false);
  }
};

const handleExport = async () => {
  try {
    // Use the same approach as handleFetch
    const time = Math.floor(Date.now() / 1000);
    const params = {
      token: API_TOKEN,
      time: time.toString()
    };

    const response = await fetch(`/api/proxy/purchase_orders?${new URLSearchParams(params)}`);
    const data: PurchaseOrdersResponse = await response.json();
    
    // Filter the same way as in handleFetch
    const selectedYear = year;
    const selectedMonth = month.padStart(2, '0');
    
    const filteredOrders = (data.response || []).filter(order => {
      if (!order.date) return false;
      const [orderMonth, orderDay, orderYear] = order.date.split('/');
      return orderYear === selectedYear && orderMonth === selectedMonth;
    }).filter(order => 
      order.vendor_id && !EXCLUDED_VENDOR_IDS.includes(order.vendor_id)
    );

    if (filteredOrders.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

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
    console.error('Export error:', error);
    alert(`Error al exportar: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

  return (
    <div className="max-w-[1200px] mx-auto p-5">

      <Head>
        <title>POs por Mes</title>
      </Head>
      <h1 className="text-2xl font-bold mb-5">POs por mes</h1>
      
      <div className="flex flex-wrap gap-2.5 items-center my-5">
        <select 
          className="px-3 py-2 rounded border border-gray-300"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          <option value="2025">2025</option>
        </select>
        
        <select 
          className="px-3 py-2 rounded border border-gray-300"
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
          className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          onClick={handleFetch}
          disabled={isLoading}
        >
          {isLoading ? 'Cargando...' : 'Generar Reporte'}
        </button>
        <button 
          className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          onClick={handleExport}
        >
          Exportar a Excel
        </button>
      </div>
      
      {error && (
        <div className="p-2.5 text-red-600 bg-red-100 rounded mb-5">
          {error}
        </div>
      )}
      
      {orders.length > 0 ? (
        <div className="overflow-hidden shadow-md rounded-lg mt-5">
          <h2 className="text-xl font-semibold mb-3">
            Órdenes de Compra - {getMonthName(month)}/{year}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm [&_th]:bg-gray-100 [&_th]:sticky [&_th]:top-0 [&_th]:px-4 [&_th]:py-3 [&_td]:px-4 [&_td]:py-2.5 [&_td]:border-b [&_td]:border-gray-200 hover:[&_tr]:bg-gray-50">
              <thead>
                <tr>
                  <th className="text-left">PO Number</th>
                  <th className="text-left">Vendor ID</th>
                  <th className="text-left">Vendor Name</th>
                  <th className="text-left">Item</th>
                  <th className="text-left">Material Description</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Department</th>
                  <th className="text-left">PO Date</th>
                  <th className="text-left">Due Date</th>
                  <th className="text-right">Total Units</th>
                  <th className="text-right">PO Total</th>
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
                    <td className="text-right font-mono">{order.qty || 0}</td>
                    <td className="text-right font-mono">{formatCurrency(order.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !isLoading && <p className="text-gray-500">No se encontraron órdenes de compra para este período</p>
      )}
    </div>
  );
}