import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Building2, LogOut, Plus, Users, Search } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  applications: number;
}

export default function HRDashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      // Fetch jobs with their application counts
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          applications (count)
        `)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Fetch application counts for each job
      const jobsWithCounts = await Promise.all(
        (jobsData || []).map(async (job) => {
          const { count } = await supabase
            .from('applications')
            .select('*', { count: 'exact' })
            .eq('job_id', job.id);

          return {
            ...job,
            applications: count || 0
          };
        })
      );

      setJobs(jobsWithCounts);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (filterStatus === 'all' || job.status === filterStatus)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-indigo-600" />
            <span className="ml-2 text-xl font-semibold text-gray-900">HR Dashboard</span>
          </div>
          <button onClick={handleSignOut} className="text-gray-700 hover:text-gray-900 flex items-center">
            <LogOut className="h-5 w-5 mr-2" /> Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Job Listings</h1>
          <Link to="/post-job" className="bg-indigo-600 text-white px-4 py-2 rounded-md flex items-center">
            <Plus className="h-5 w-5 mr-2" /> Post New Job
          </Link>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search jobs..."
              className="pl-10 p-2 border rounded-md w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="p-2 border rounded-md"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Jobs</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12">No jobs found.</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredJobs.map((job) => (
                <li key={job.id} className="px-4 py-4 sm:px-6">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-medium text-indigo-600 truncate">{job.title}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      job.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <p className="text-sm text-gray-500 flex items-center">
                      <Users className="h-5 w-5 mr-1 text-gray-400" /> {job.applications} applications
                    </p>
                    <div className="space-x-4">
                      <Link to={`/review/${job.id}`} className="text-indigo-600 hover:text-indigo-900">Review Applications</Link>
                      <Link to={`/jobs/${job.id}/ai-review`} className="text-indigo-600 hover:text-indigo-900">AI Analysis →</Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 p-6 bg-white shadow rounded-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Applications Analytics</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={jobs.map(job => ({ name: job.title.slice(0, 20) + '...', applications: job.applications }))}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={100} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="applications" fill="#6366F1" name="Applications" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}
