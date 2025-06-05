import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUser, hasPermission, hashPassword } from '../../lib/auth';
import supabase from '../../lib/supabaseClient';

type User = {
  id: string;
  username: string;
  full_name: string;
  role: string;
};

export default function UserManagement() {
  const [isClient, setIsClient] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    full_name: '',
    password: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const currentUser = getCurrentUser();

  useEffect(() => {
    setIsClient(true);
    if (!currentUser || !hasPermission(currentUser, 'admin')) {
      if (typeof window !== 'undefined') {
        router.push('/');
      }
      return;
    }
    fetchUsers();
    fetchRoles();
  }, []);

  async function fetchUsers() {
    const { data, error } = await supabase
      .from('app_users')
      .select('id, username, full_name, role');
    
    if (error) {
      setError('Failed to fetch users');
      console.error(error);
      return;
    }
    setUsers(data || []);
  }

  async function fetchRoles() {
    const { data, error } = await supabase
      .from('app_roles')
      .select('name')
      .order('name', { ascending: true });
    
    if (error) {
      setError('Failed to fetch roles');
      console.error(error);
      return;
    }
    setRoles(data?.map(r => r.name) || []);
  }

  async function createUser() {
    if (!newUser.username || !newUser.password) {
      setError('Username and password are required');
      return;
    }

    try {
      const password_hash = await hashPassword(newUser.password);
      const { error } = await supabase
        .from('app_users')
        .insert([{
          username: newUser.username,
          full_name: newUser.full_name,
          password_hash,
          role: newUser.role
        }]);
      
      if (error) throw error;
      
      setSuccess(`User ${newUser.username} created`);
      setNewUser({ username: '', full_name: '', password: '', role: 'user' });
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create user');
    }
  }

  async function updateUser() {
    if (!editingUser) return;
    
    try {
      const { error } = await supabase
        .from('app_users')
        .update({
          full_name: editingUser.full_name,
          role: editingUser.role
        })
        .eq('id', editingUser.id);
      
      if (error) throw error;
      
      setSuccess(`User ${editingUser.username} updated`);
      setEditingUser(null);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update user');
    }
  }

  async function deleteUser(id: string) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const { error } = await supabase
        .from('app_users')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSuccess('User deleted');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete user');
    }
  }

  if (!isClient || !currentUser) {
    return null;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Create New User</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Username"
            value={newUser.username}
            onChange={(e) => setNewUser({...newUser, username: e.target.value})}
            className="p-2 border rounded"
          />
          <input
            type="text"
            placeholder="Full Name"
            value={newUser.full_name}
            onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
            className="p-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={newUser.password}
            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
            className="p-2 border rounded"
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser({...newUser, role: e.target.value})}
            className="p-2 border rounded"
          >
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        <button
          onClick={createUser}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Create User
        </button>
      </div>

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
              <tr key={user.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4">{user.username}</td>
                <td className="px-6 py-4">
                  {editingUser?.id === user.id ? (
                    <input
                      type="text"
                      value={editingUser.full_name}
                      onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                      className="p-1 border rounded"
                    />
                  ) : (
                    user.full_name
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingUser?.id === user.id ? (
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                      className="p-1 border rounded"
                    >
                      {roles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  ) : (
                    user.role
                  )}
                </td>
                <td className="px-6 py-4 space-x-2">
                  {editingUser?.id === user.id ? (
                    <>
                      <button
                        onClick={updateUser}
                        className="text-green-600 hover:text-green-800"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="text-red-600 hover:text-red-800"
                        disabled={user.username === currentUser.username}
                      >
                        Delete
                      </button>
                    </>
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