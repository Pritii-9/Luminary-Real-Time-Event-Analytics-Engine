
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Sites from './pages/Sites';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import SnippetPage from './pages/dashboard/SnippetPage';
import SourcesPage from './pages/dashboard/SourcesPage';
import PagesPage from './pages/dashboard/PagesPage';
import EventsPage from './pages/dashboard/EventsPage';
import CampaignsPage from './pages/dashboard/CampaignsPage';
import ReplaysPage from './pages/dashboard/ReplaysPage';
import ExportPage from './pages/dashboard/ExportPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/sites" element={<Sites />} />
        
        <Route path="/dashboard/:siteId" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="snippet" element={<SnippetPage />} />
          <Route path="sources" element={<SourcesPage />} />
          <Route path="pages" element={<PagesPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="replays" element={<ReplaysPage />} />
          <Route path="export" element={<ExportPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
