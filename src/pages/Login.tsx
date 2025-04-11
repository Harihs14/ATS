import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Building2, Lock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';


export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: user, error: userError } = await supabase.auth.signInWithPassword({ email, password });
      if (userError) throw userError;

      const userId = user?.user?.id;
      if (!userId) throw new Error('Authentication failed.');

      // Get user profile with role information
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Update the role check to match ProtectedRoute expectations
      if (profile?.role === 'hr') {
        navigate('/dashboard');
      } else if (profile?.role === 'candidate') {
        navigate('/cdashboard');
      } else {
        throw new Error('Invalid user role');
      }

      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      console.error('Login Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col justify-center items-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="bg-indigo-600 p-4 rounded-2xl mb-4 shadow-lg"
            >
              <Building2 className="h-12 w-12 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">HR Portal</h1>
            <p className="text-gray-600 text-sm">Elevating Talent Management</p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="relative">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md transition-all relative"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/register')}
                className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Create account
              </button>
            </p>
          </div>
        </div>
        
        <div className="bg-indigo-50 p-4 text-center">
          <p className="text-xs text-gray-600">
            Secure login powered by ATS HR Solutions
          </p>
        </div>
      </motion.div>
    </div>
  );
}