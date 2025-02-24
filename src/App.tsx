import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import HRDashboard from './pages/HRDashboard';
import CandidateDashboard from './pages/CandidateDashboard';
import JobPost from './pages/JobPost';
import ApplicationReview from './pages/ApplicationReview';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<HRDashboard />} />
        <Route path="/post-job" element={<JobPost />} />
        <Route path="/review/:id" element={<ApplicationReview />} />  
        <Route path="/cdashboard" element={<CandidateDashboard />} />
        <Route path="/" element={<Login />} />
        </Routes>

    </BrowserRouter>
  );
}

export default App;