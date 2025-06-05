import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUser, logout, hashPassword, verifyPassword } from '../lib/auth';
import supabase from '../lib/supabaseClient';

export default function ChangePassword() {
  const [isClient, setIsClient] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const currentUser = getCurrentUser();

  useEffect(() => {
    setIsClient(true);
    if (!currentUser && typeof window !== 'undefined') {
      router.push('/login');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      // Verify current password
      const { data, error: fetchError } = await supabase
        .from('app_users')
        .select('password_hash')
        .eq('username', currentUser?.username)
        .single();

      if (fetchError || !data) throw new Error('Failed to verify current password');

      const isValid = await verifyPassword(currentPassword, data.password_hash);
      if (!isValid) throw new Error('Current password is incorrect');

      // Update password
      const newHash = await hashPassword(newPassword);
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ password_hash: newHash })
        .eq('username', currentUser?.username);

      if (updateError) throw updateError;

      setSuccess('Password changed successfully');
      setTimeout(() => {
        logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }, 2000);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Password change failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient || !currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Change Password</h1>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded text-white ${
              isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}