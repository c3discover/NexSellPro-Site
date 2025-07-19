// Example component showing how to manually trigger create-user-profile API
// This can be used in your React components after successful login

import { useState } from 'react';
import { createUserProfile } from '@/lib/auth-helpers';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  business_name?: string;
  how_did_you_hear?: string;
}

export default function ProfileCreationExample() {
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    business_name: '',
    how_did_you_hear: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult('');

    try {
      const response = await createUserProfile(formData);
      
      if (response.success) {
        setResult('Profile created successfully!');
      } else {
        setResult(`Error: ${response.error}`);
      }
    } catch (error) {
      setResult(`Unexpected error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-slate-800 rounded-lg">
      <h2 className="text-xl font-bold mb-4 text-white">Create User Profile</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">
            First Name *
          </label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">
            Business Name (Optional)
          </label>
          <input
            type="text"
            name="business_name"
            value={formData.business_name}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">
            How did you hear about us?
          </label>
          <select
            name="how_did_you_hear"
            value={formData.how_did_you_hear}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:ring-2 focus:ring-accent"
          >
            <option value="">Select an option</option>
            <option value="google">Google Search</option>
            <option value="social-media">Social Media</option>
            <option value="youtube">YouTube</option>
            <option value="friend">Friend/Colleague</option>
            <option value="forum">Online Forum/Community</option>
            <option value="advertisement">Advertisement</option>
            <option value="other">Other</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-accent text-white rounded font-medium disabled:opacity-50"
        >
          {loading ? 'Creating Profile...' : 'Create Profile'}
        </button>
      </form>

      {result && (
        <div className={`mt-4 p-3 rounded text-sm ${
          result.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
        }`}>
          {result}
        </div>
      )}
    </div>
  );
}

// Usage example:
// 
// After successful login, you can call the API like this:
//
// const userData = {
//   first_name: 'John',
//   last_name: 'Doe',
//   business_name: 'My Business',
//   how_did_you_hear: 'google'
// };
//
// const result = await createUserProfile(userData);
// if (result.success) {
//   console.log('Profile created successfully');
// } else {
//   console.error('Failed to create profile:', result.error);
// } 