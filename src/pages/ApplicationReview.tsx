import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Building2, ArrowLeft, FileText } from 'lucide-react';

interface Application {
  id: string;
  resume_text: string;
  status: string;
  candidate: {
    full_name: string;
    email: string;
  };
  parsed_resume?: {
    parsed_data: any;
    match_score: number;
    match_details: any;
  };
}

interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
}

export default function ApplicationReview() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [applications, setApplications] = useState<Application[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchJobAndApplications();
    }
  }, [id]);

  async function fetchJobAndApplications() {
    try {
      // Fetch job details
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (jobError) throw jobError;
      setJob(jobData);

      // Fetch applications
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select(`
          *,
          candidate:profiles(*),
          parsed_resume:parsed_resumes(*)
        `)
        .eq('job_id', id);

      if (appError) throw appError;
      setApplications(appData || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  // This function can be used to update application status from this screen
  // Currently not used as status updates happen in ApplicationInsights
  // Keeping it for potential future use
  /*
  async function updateApplicationStatus(applicationId: string, status: 'selected' | 'rejected') {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status })
        .eq('id', applicationId);
  
      if (error) throw error;
  
      fetchJobAndApplications();
      toast.success(`Candidate ${status}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  }
  */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900">Job not found</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">Application Management</span>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{job.title}</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Job Description</h3>
              <p className="text-gray-500 mb-4">{job.description}</p>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Requirements</h3>
              <p className="text-gray-500 whitespace-pre-line">{job.requirements}</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-4">Applications ({applications.length}) - Manual Review</h3>
          
          {applications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No applications yet</h3>
              <p className="mt-1 text-sm text-gray-500">Check back later for new applications.</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {applications.map((application) => (
                  <li key={application.id} className="px-4 py-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {application.candidate.full_name}
                        </h4>
                        <p className="text-sm text-gray-500">{application.candidate.email}</p>
                      </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigate(`/applications/${application.id}/review`)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Review
                      </button>
                      {application.status === 'selected' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Selected
                        </span>
                      )}
                      {application.status === 'rejected' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Rejected
                        </span>
                      )}
                    </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
