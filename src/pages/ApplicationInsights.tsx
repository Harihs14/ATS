import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface Application {
  id: string;
  resume_text: string;
  status: string;
  candidate: {
    full_name: string;
    email: string;
  };
}

export default function ApplicationInsights() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [insights, setInsights] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchApplication();
    }
  }, [id]);

  async function fetchApplication() {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          candidate:profiles(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setApplication(data);
      if (data.resume_text) analyzeResume(data.resume_text);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function analyzeResume(resumeText: string) {
    setAnalyzing(true);
    try {
      const prompt = `Resume Analysis
"Review the resume and identify any gaps in the educational timeline between two education entries and any gaps between two work experience entries, including even the shortest ones. Additionally, perform a tone analysis of the resume. Consider the instructions mentioned below and Please provide the response as per the below output format:

Output Format:
{ "educationgap": "", "educationgapcomments": "", "experiencengap": "", "experiencengapcomments": "", "resumetone": "" }

Output Format Instructions:
In the 'educationgap' and 'experiencengap' fields, fill in 'yes' or 'no' to indicate if there are any concerned gaps. You can include a short justification or explanation in the 'educationgapcomments' and 'experiencengapcomments' fields if there is a gap, respectively. Please analyze the overall tone of the resume and fill in the 'resumetone' field accordingly.

Analysis Instructions:
When Months are not specified, consider only the years to identify the gaps in education or experience timelines.
Evaluate the language's clarity, professionalism, alignment with industry standards, enthusiasm, confidence, and authenticity to gauge the resume's tone."
      Resume:
      ${resumeText.substring(0, 3000)}`;

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2:latest',
          prompt: prompt,
          stream: true,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let output = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          try {
            const parsed = JSON.parse(line);
            output += parsed.response;
            setInsights(prev => prev + parsed.response);
          } catch (e) {
            console.error('Parsing error:', e);
          }
        });
      }
    } catch (error: any) {
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  }

  async function updateStatus(status: 'selected' | 'rejected') {
    if (!application) return;

    try {
      setUpdating(true);
      const { error } = await supabase
        .from('applications')
        .update({ status })
        .eq('id', application.id);

      if (error) throw error;
      toast.success(`Candidate ${status}!`);
      navigate(-1);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900">Application not found</h2>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Applications
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
              <span className="text-xl font-semibold text-gray-900">
                Candidate Insights - {application.candidate.full_name}
              </span>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Applications
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                AI-Powered Resume Analysis
              </h3>

              {analyzing && (
                <div className="flex items-center text-gray-500 mb-4">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing resume...
                </div>
              )}

              <div className="prose max-w-none mb-8">
                {insights ? (
                  <div className="whitespace-pre-wrap">{insights}</div>
                ) : (
                  <p className="text-gray-500">
                    {analyzing ? 'Generating insights...' : 'No analysis available'}
                  </p>
                )}
              </div>

              {insights && (
                <div className="flex gap-4 mt-8 border-t pt-4">
                  <button
                    onClick={() => updateStatus('selected')}
                    disabled={updating}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
                    Accept Candidate
                  </button>
                  <button
                    onClick={() => updateStatus('rejected')}
                    disabled={updating}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
                    Reject Candidate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}