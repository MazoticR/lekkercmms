// pages/admin/users.tsx
import { useState, useEffect } from 'react';
import { getCurrentUser, hasPermission, logout } from '../../lib/auth';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabaseClient';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'user'
  });
  const router = useRouter();
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!hasPermission(currentUser, 'admin')) {
      router.push('/');
    }
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setUsers(data || []);
  }

  async function createUser() {
    // In reality, you should hash the password before storing!
    const { error } = await supabase
      .from('app_users')
      .insert([{ ...newUser, password_hash: newUser.password }]);
    
    if (!error) {
      setNewUser({ username: '', password: '', full_name: '', role: 'user' });
      fetchUsers();
    }
  }

  if (!currentUser) return null;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      
      {/* Create User Form */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Create New User</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="Username"
            value={newUser.username}
            onChange={(e) => setNewUser({...newUser, username: e.target.value})}
            className="p-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={newUser.password}
            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
            className="p-2 border rounded"
          />
          <input
            type="text"
            placeholder="Full Name"
            value={newUser.full_name}
            onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
            className="p-2 border rounded"
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser({...newUser, role: e.target.value})}
            className="p-2 border rounded"
          >
            <option value="user">User</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          onClick={createUser}
          className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
        >
          Create User
        </button>
      </div>

      {/* Users List */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Username</th>
              <th className="px-6 py-3 text-left">Full Name</th>
              <th className="px-6 py-3 text-left">Role</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-t">
                <td className="px-6 py-4">{user.username}</td>
                <td className="px-6 py-4">{user.full_name}</td>
                <td className="px-6 py-4 capitalize">{user.role}</td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => {/* Implement delete */}}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}