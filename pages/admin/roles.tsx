import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUser, hasPermission } from '../../lib/auth';
import supabase from '../../lib/supabaseClient';
import { withAuth } from '../../components/withAuth';

type Role = {
  id: number;
  name: string;
  permissions: string[];
};

const ALL_PERMISSIONS = [
  'read_basic',
  'read_all',
  'edit_records',
  'edit_all',
  'user_management',
  'system_config'
];

 function RoleManagement() {
  const [isClient, setIsClient] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [newRole, setNewRole] = useState({
    name: '',
    permissions: [] as string[]
  });
  const [editingRole, setEditingRole] = useState<Role | null>(null);
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
    fetchRoles();
  }, []);

  async function fetchRoles() {
    const { data, error } = await supabase
      .from('app_roles')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      setError('Failed to fetch roles');
      console.error(error);
      return;
    }
    setRoles(data || []);
  }

  async function createRole() {
    if (!newRole.name) {
      setError('Role name is required');
      return;
    }

    const { error } = await supabase
      .from('app_roles')
      .insert([{
        name: newRole.name.toLowerCase(),
        permissions: newRole.permissions
      }]);
    
    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(`Role "${newRole.name}" created`);
    setNewRole({ name: '', permissions: [] });
    fetchRoles();
    setTimeout(() => setSuccess(''), 3000);
  }

  async function updateRole() {
    if (!editingRole) return;

    const { error } = await supabase
      .from('app_roles')
      .update({
        permissions: editingRole.permissions
      })
      .eq('id', editingRole.id);
    
    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(`Role "${editingRole.name}" updated`);
    setEditingRole(null);
    fetchRoles();
    setTimeout(() => setSuccess(''), 3000);
  }

  async function deleteRole(id: number) {
    if (!confirm('Are you sure? Users with this role will need to be reassigned!')) return;
    
    const { error } = await supabase
      .from('app_roles')
      .delete()
      .eq('id', id);
    
    if (error) {
      setError(error.message);
      return;
    }

    setSuccess('Role deleted');
    fetchRoles();
    setTimeout(() => setSuccess(''), 3000);
  }

  function togglePermission(permission: string) {
    if (!editingRole) return;
    
    setEditingRole({
      ...editingRole,
      permissions: editingRole.permissions.includes(permission)
        ? editingRole.permissions.filter(p => p !== permission)
        : [...editingRole.permissions, permission]
    });
  }

  if (!isClient || !currentUser) {
    return null;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Role Management</h1>
      
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Create New Role</h2>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Role Name"
            value={newRole.name}
            onChange={(e) => setNewRole({...newRole, name: e.target.value})}
            className="p-2 border rounded flex-1"
          />
          <button
            onClick={createRole}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Create Role
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">Permissions</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{role.name}</td>
                <td className="px-6 py-4">
                  {editingRole?.id === role.id ? (
                    <div className="flex flex-wrap gap-2">
                      {ALL_PERMISSIONS.map(perm => (
                        <label key={perm} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={editingRole.permissions.includes(perm)}
                            onChange={() => togglePermission(perm)}
                          />
                          {perm}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.length > 0 ? (
                        role.permissions.map(perm => (
                          <span key={perm} className="bg-gray-100 px-2 py-1 rounded text-sm">
                            {perm}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">No permissions</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 space-x-2">
                  {editingRole?.id === role.id ? (
                    <>
                      <button
                        onClick={updateRole}
                        className="text-green-600 hover:text-green-800"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingRole(null)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingRole(role)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      {role.name !== 'admin' && role.name !== 'user' && (
                        <button
                          onClick={() => deleteRole(role.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
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

// Wrap and export the page, protecting it to only allow admin users
export default withAuth(RoleManagement, 'admin');