// pages/change-password.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { 
  getCurrentUser, 
  logout, 
  hashPassword,
  verifyPassword 
} from '../lib/auth';
import supabase from '../lib/supabaseClient';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const user = getCurrentUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError('You must be logged in to change your password');
      return;
    }

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
      // 1. Verify current password
      const { data, error: fetchError } = await supabase
        .from('app_users')
        .select('password_hash')
        .eq('username', user.username)
        .single();

      if (fetchError || !data?.password_hash) {
        throw new Error('Failed to verify current password');
      }

      const isValid = await verifyPassword(currentPassword, data.password_hash);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      // 2. Hash and update new password
      const newHash = await hashPassword(newPassword);
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ password_hash: newHash })
        .eq('username', user.username);

      if (updateError) {
        throw updateError;
      }

      // 3. Success - logout and redirect
      setSuccess('Password changed successfully. You will be logged out shortly.');
      setTimeout(() => {
        logout();
        router.push('/login');
      }, 2000);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Password change failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Change Password</h1>
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

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
            {isLoading ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}