import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Building2, LogOut, Briefcase, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
  status: string;
  created_at: string;
}

interface Application {
  id: string;
  status: string;
  created_at: string;
  jobs: Job;
}

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'applications'>('jobs');

  useEffect(() => {
    fetchJobsAndApplications();
  }, []);

  const fetchJobsAndApplications = async () => {
    try {
      const [jobsResponse, applicationsResponse] = await Promise.all([
        supabase
          .from('jobs')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false }),
        supabase
          .from('applications')
          .select('*, jobs(*)')
          .order('created_at', { ascending: false })
      ]);

      if (jobsResponse.error) throw jobsResponse.error;
      if (applicationsResponse.error) throw applicationsResponse.error;

      setJobs(jobsResponse.data || []);
      setApplications(applicationsResponse.data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId: string) => {
    const resumeInput = document.createElement('input');
    resumeInput.type = 'file';
    resumeInput.accept = '.txt,.pdf,.doc,.docx';
    
    resumeInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        toast.error('Please select a file');
        return;
      }

      setLoading(true);

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Please login to apply');
        }

        // Check if already applied
        const { data: existingApplication } = await supabase
          .from('applications')
          .select('id')
          .eq('job_id', jobId)
          .eq('candidate_id', user.id)
          .single();

        if (existingApplication) {
          toast.error('You have already applied for this job');
          return;
        }

        // Read file content as plain text
        const resumeText = await file.text();

        // Submit application
        const { error } = await supabase
          .from('applications')
          .insert([
            {
              job_id: jobId,
              candidate_id: user.id,
              resume_text: resumeText,
              status: 'pending'
            }
          ]);

        if (error) throw error;
        
        toast.success('Application submitted successfully!');
        await fetchJobsAndApplications();
        setActiveTab('applications');
      } catch (error: any) {
        console.error('Application Error:', error);
        toast.error(error.message || 'Failed to submit application');
      } finally {
        setLoading(false);
      }
    };

    resumeInput.click();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'selected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'selected':
        return 'Congratulations! You have been selected.';
      case 'rejected':
        return 'Thank you for your interest. We have moved forward with other candidates.';
      case 'reviewing':
        return 'Your application is being reviewed.';
      default:
        return 'Application submitted and pending review.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">Candidate Dashboard</span>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 hover:text-gray-900"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('jobs')}
                className={`${
                  activeTab === 'jobs'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Available Jobs
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`${
                  activeTab === 'applications'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                My Applications
              </button>
            </nav>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : activeTab === 'jobs' ? (
            <div className="mt-6">
              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs available</h3>
                  <p className="mt-1 text-sm text-gray-500">Check back later for new opportunities.</p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {jobs.map((job) => (
                      <li key={job.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-indigo-600">{job.title}</h3>
                            <button
                              onClick={() => handleApply(job.id)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                              <FileText className="h-4 w-4 mr-1.5" />
                              Apply Now
                            </button>
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">{job.description}</p>
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-gray-900">Requirements:</h4>
                              <p className="mt-1 text-sm text-gray-600">{job.requirements}</p>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6">
              {applications.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No applications yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Start applying for jobs to track your applications here.</p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {applications.map((application) => (
                      <li key={application.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-indigo-600">{application.jobs.title}</h3>
                            <div className="flex items-center">
                              {getStatusIcon(application.status)}
                              <span className="ml-2 text-sm font-medium text-gray-600">
                                {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">{getStatusText(application.status)}</p>
                            <p className="mt-2 text-sm text-gray-500">
                              Applied on {new Date(application.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}