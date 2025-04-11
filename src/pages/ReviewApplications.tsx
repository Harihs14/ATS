import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { analyzeResume } from '../services/aiService';

interface AIReview {
  match_score: number;
  matching_keywords: string[];
  missing_keywords: string[];
  usp: string[];
  analysis: string;
  recommendation: string;
}

interface Application {
  id: string;
  candidate_name: string;
  candidate_email: string;
  resume: string;
  coverletter: string;
  status: string;
  match_score?: number;
  ai_review?: AIReview;
}

interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
}

export default function ReviewApplications() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<{application: Application, analysis: AIReview} | null>(null);

  useEffect(() => {
    fetchJobAndApplications();
  }, [jobId]);

  async function fetchJobAndApplications() {
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      setJob(jobData);

      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('job_id', jobId);

      if (appError) throw appError;
      setApplications(appData || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  // This function is now only used by the Review All button
  async function reviewSingleApplication(application: Application) {
    if (!job) {
      toast.error('Job details not found');
      return;
    }
    
    try {
      setReviewing(true);
      
      toast.loading(`Analyzing ${application.candidate_name}'s application...`, { id: `review-${application.id}` });
      
      // Mark the application as being reviewed
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'reviewing'
        })
        .eq('id', application.id);
        
      if (error) throw error;
      
      toast.success(`Application marked for review: ${application.candidate_name}`, { id: `review-${application.id}` });
      await fetchJobAndApplications();
    } catch (error: any) {
      console.error('Error marking application for review:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      toast.error(`Failed to mark application: ${errorMessage}`, { id: `review-${application.id}` });
    } finally {
      setReviewing(false);
    }
  }

  async function reviewAllApplications() {
    if (!job) {
      toast.error('Job details not found');
      return;
    }
    try {
      setReviewing(true);
      const promises = applications.map(app => reviewSingleApplication(app));
      await Promise.all(promises);
      toast.success('All applications reviewed successfully!');
    } catch (error: any) {
      toast.error('Error reviewing applications: ' + error.message);
    } finally {
      setReviewing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-600 mb-4">Job not found</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{job.title} - AI Analysis</h1>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                AI-Powered Application Analysis
              </h2>
              <p className="text-sm text-gray-500">
                Automatically analyze {applications.length} candidate applications using AI
              </p>
            </div>
            <button
              onClick={reviewAllApplications}
              disabled={reviewing || applications.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {reviewing ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-white">
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  Analyzing All...
                </>
              ) : (
                'Review All Applications'
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match Score
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((application) => (
                  <tr key={application.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {application.candidate_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {application.candidate_email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(application.match_score || application.ai_review?.match_score) ? (
                        <div className="text-sm font-medium text-gray-900">
                          {application.match_score || application.ai_review?.match_score}%
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Not reviewed</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        application.status === 'reviewing'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {application.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => reviewSingleApplication(application)}
                        disabled={reviewing}
                        className="inline-flex items-center px-3 py-1.5 border border-indigo-600 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 disabled:opacity-50"
                      >
                        {reviewing ? 'Analyzing...' : 'Review'}
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            // Show loading state
                            toast.loading(`Analyzing ${application.candidate_name}'s application...`, { id: `view-analysis-${application.id}` });
                            
                            // Perform AI analysis on demand when View Analysis is clicked
                            if (!job) {
                              toast.error('Job details not found');
                              return;
                            }
                            
                            // Call the AI service to analyze the resume
                            const aiReview = await analyzeResume({
                              jobTitle: job.title,
                              jobDescription: job.description,
                              requirements: job.requirements,
                              candidateName: application.candidate_name,
                              resume: application.resume,
                              coverLetter: application.coverletter
                            });
                            
                            // Update the database with the new analysis
                            const { error } = await supabase
                              .from('applications')
                              .update({
                                ai_review: aiReview,
                                match_score: aiReview.match_score,
                                status: 'reviewing'
                              })
                              .eq('id', application.id);
                            
                            if (error) throw error;
                            
                            // Update local state
                            const updatedApplication = {
                              ...application,
                              ai_review: aiReview,
                              match_score: aiReview.match_score
                            };
                            
                            setApplications(prev => 
                              prev.map(app => app.id === application.id ? updatedApplication : app)
                            );
                            
                            // Show success message
                            toast.success(`Analysis complete for ${application.candidate_name}`, { id: `view-analysis-${application.id}` });
                            
                            // Set the selected analysis to display in the modal
                            setSelectedAnalysis({
                              application: updatedApplication,
                              analysis: aiReview
                            });
                            
                            console.log('Generated and showing analysis:', aiReview);
                          } catch (error: any) {
                            console.error('Error analyzing application:', error);
                            toast.error(`Failed to analyze application: ${error.message}`, { id: `view-analysis-${application.id}` });
                          }
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        {reviewing ? 'Analyzing...' : 'View Analysis'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Analysis Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">AI Analysis for {selectedAnalysis.application.candidate_name}</h2>
              <button 
                onClick={() => setSelectedAnalysis(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-lg font-medium">Match Score: <span className="text-indigo-600">{selectedAnalysis.analysis.match_score || 0}%</span></p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Matching Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAnalysis.analysis.matching_keywords?.map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      {skill}
                    </span>
                  )) || <span className="text-gray-500">No matching skills found</span>}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Missing Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAnalysis.analysis.missing_keywords?.map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                      {skill}
                    </span>
                  )) || <span className="text-gray-500">No missing skills found</span>}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Unique Selling Points</h3>
                <ul className="list-disc list-inside space-y-1">
                  {selectedAnalysis.analysis.usp?.map((point, i) => (
                    <li key={i}>{point}</li>
                  )) || <li className="text-gray-500">No unique selling points found</li>}
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Analysis</h3>
                <p className="text-gray-700">{selectedAnalysis.analysis.analysis}</p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Recommendation</h3>
                <p className="text-gray-700">{selectedAnalysis.analysis.recommendation}</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
