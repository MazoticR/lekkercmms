import { useState, useEffect } from 'react';
import supabase from '../../lib/supabaseClient';
import { Database } from '../../types/db_types';
import { MachineOrder, MachineOrderStatus, MachineOrderCreate } from '../../types/machine-orders';

// Reference the type directly from Database
type InventoryPart = Database['inventory_parts']['Row'];

export default function MachineOrdersTool() {
  const [orders, setOrders] = useState<MachineOrder[]>([]);
const [newOrder, setNewOrder] = useState<MachineOrderCreate>({
  part_number: '',
  description: null,
  quantity: 1,
  cost_per_unit: null,
  requested_by: '',
  notes: null
});
  const [editingOrder, setEditingOrder] = useState<MachineOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState<MachineOrderStatus | 'all'>('all');
 const [inventoryParts, setInventoryParts] = useState<InventoryPart[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchInventoryParts();
  }, [filterStatus]);

  async function fetchOrders() {
    let query = supabase
      .from('machine_orders')
      .select('*')
      .order('requested_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
  }

  async function fetchInventoryParts() {
    const { data, error } = await supabase
      .from('inventory_parts')
      .select('*')
      .order('part_number', { ascending: true });

    if (error) {
      console.error('Error fetching inventory parts:', error);
    } else {
      setInventoryParts(data || []);
    }
  }

async function createOrder() {
  if (!newOrder.part_number.trim()) {
    alert('Part number is required');
    return;
  }

  const { data, error } = await supabase
    .from('machine_orders')
    .insert([{
      ...newOrder,
      status: 'requested' // This will be set on creation
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating order:', error);
    alert('Failed to create order');
  } else {
    setOrders([data, ...orders]);
    resetNewOrderForm();
  }
}

  async function updateOrderStatus(orderId: number, newStatus: MachineOrderStatus) {
    const updateData: Partial<MachineOrder> = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'received') {
      updateData.received_at = new Date().toISOString();
      updateData.received_by = 'Current User'; // Replace with actual user
    }

    const { data, error } = await supabase
      .from('machine_orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status');
    } else {
      setOrders(orders.map(order => order.id === orderId ? data : order));
      
      // If order is received, add to inventory
      if (newStatus === 'received') {
        await addToInventory(data);
      }
    }
  }

  async function addToInventory(order: MachineOrder) {
    // Check if part exists in inventory
    const existingPart = inventoryParts.find(p => p.part_number === order.part_number);

    const updateData = {
      part_number: order.part_number,
      description: order.description || existingPart?.description || null,
      quantity: existingPart ? existingPart.quantity + order.quantity : order.quantity,
      cost: order.cost_per_unit || existingPart?.cost || null,
      last_updated: new Date().toISOString()
    };

    const { error } = await supabase
      .from('inventory_parts')
      .upsert(updateData, { onConflict: 'part_number' });

    if (error) {
      console.error('Error adding to inventory:', error);
      alert('Order marked as received but failed to update inventory');
    } else {
      fetchInventoryParts(); // Refresh inventory data
    }
  }

  function resetNewOrderForm() {
    setNewOrder({
      part_number: '',
      description: null,
      quantity: 1,
      cost_per_unit: null,
      requested_by: '',
      notes: null,
      po_reference: null // Add this
    });
  }

  function handlePartNumberChange(partNumber: string) {
    setNewOrder(prev => ({
      ...prev,
      part_number: partNumber,
      description: inventoryParts.find(p => p.part_number === partNumber)?.description || null
    }));
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Machine Parts Orders</h1>
      
      {/* New Order Form */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-4">Create New Order</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Part Number *</label>
            <input
              type="text"
              value={newOrder.part_number}
              onChange={(e) => handlePartNumberChange(e.target.value)}
              list="partNumbers"
              required
              className="w-full p-2 border border-gray-300 rounded"
            />
            <datalist id="partNumbers">
              {inventoryParts.map(part => (
                <option key={part.id} value={part.part_number} />
              ))}
            </datalist>
          </div>

            {/* Add this new field */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PO Reference #</label>
                    <input
                    type="text"
                    value={newOrder.po_reference || ''}
                    onChange={(e) => setNewOrder({...newOrder, po_reference: e.target.value || null})}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="External PO number"
                    />
                </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={newOrder.description || ''}
              onChange={(e) => setNewOrder({...newOrder, description: e.target.value || null})}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
            <input
              type="number"
              value={newOrder.quantity}
              onChange={(e) => setNewOrder({...newOrder, quantity: parseInt(e.target.value) || 0})}
              min="1"
              className="w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Unit</label>
            <input
              type="number"
              value={newOrder.cost_per_unit || ''}
              onChange={(e) => setNewOrder({...newOrder, cost_per_unit: e.target.value ? parseFloat(e.target.value) : null})}
              step="0.01"
              min="0"
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Requested By *</label>
            <input
              type="text"
              value={newOrder.requested_by}
              onChange={(e) => setNewOrder({...newOrder, requested_by: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={newOrder.notes || ''}
              onChange={(e) => setNewOrder({...newOrder, notes: e.target.value || null})}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
        </div>
        
        <button
          onClick={createOrder}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          Create Order
        </button>
      </div>
      
      {/* Order Filter */}
      <div className="mb-4">
        <label className="mr-2">Filter by status:</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as MachineOrderStatus | 'all')}
          className="p-2 border rounded"
        >
          <option value="all">All</option>
          <option value="requested">Requested</option>
          <option value="ordered">Ordered</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      
      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {order.po_reference || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {order.part_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.description || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.quantity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.cost_per_unit ? `$${order.cost_per_unit.toFixed(2)}` : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.requested_by}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    order.status === 'received' ? 'bg-green-100 text-green-800' :
                    order.status === 'ordered' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.status === 'requested' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ordered')}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      Mark as Ordered
                    </button>
                  )}
                  {order.status === 'ordered' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'received')}
                      className="text-green-600 hover:text-green-800 mr-2"
                    >
                      Mark as Received
                    </button>
                  )}
                  {(order.status === 'requested' || order.status === 'ordered') && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      className="text-red-600 hover:text-red-800"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}