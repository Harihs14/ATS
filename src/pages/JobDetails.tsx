import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as mammoth from 'mammoth';

interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
  status: string;
  created_at: string;
}

export default function JobDetails() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    coverLetter: '',
    resumeText: ''
  });

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let resumeText = '';
      
      if (file.type === 'text/plain') {
        resumeText = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        resumeText = result.value;
      } else {
        // For PDF and other file types, use a simpler approach
        resumeText = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target?.result;
            resolve(typeof text === 'string' ? text : 'Error reading file');
          };
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      if (!resumeText.trim()) {
        throw new Error('Could not extract text from the file');
      }

      setFormData(prev => ({ ...prev, resumeText }));
      toast.success('Resume processed successfully!');
    } catch (error: any) {
      toast.error('Error processing resume: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;

    if (!formData.resumeText) {
      toast.error('Please upload your resume');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please login to apply');
      }

      const { error } = await supabase
        .from('applications')
        .insert([{
          job_id: job.id,
          candidate_id: user.id,
          candidate_name: formData.name,
          candidate_email: formData.email,
          candidate_phone: formData.phone,
          resume: formData.resumeText,
          coverletter: formData.coverLetter,
          status: 'pending'
        }]);

      if (error?.message.includes('violates foreign key constraint')) {
        throw new Error('Unable to submit application. Please ensure you are logged in as a candidate.');
      }

      if (error) throw error;
      
      toast.success('Application submitted successfully! You can track your application status in the dashboard.');
      navigate('/cdashboard');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">Job not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
              <p className="mt-1 text-sm text-gray-500">
                Posted on {new Date(job.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Job Description</h2>
              <div className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                {job.description}
              </div>
              
              <h2 className="mt-6 text-lg font-medium text-gray-900">Requirements</h2>
              <div className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                {job.requirements}
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="resume" className="block text-sm font-medium text-gray-700">
                      Resume
                    </label>
                    <input
                      type="file"
                      name="resume"
                      id="resume"
                      required
                      accept=".txt,.doc,.docx"
                      onChange={handleResumeUpload}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    {formData.resumeText && (
                      <p className="mt-2 text-sm text-green-600">Resume uploaded and processed successfully!</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700">
                      Cover Letter
                    </label>
                    <textarea
                      name="coverLetter"
                      id="coverLetter"
                      required
                      rows={6}
                      value={formData.coverLetter}
                      onChange={handleInputChange}
                      placeholder="Write a brief cover letter explaining why you're a good fit for this position..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Submit Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
