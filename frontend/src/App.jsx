import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AiBotView from './views/AiBotView';
import QueryView from './views/QueryView';
import TableView from './views/TableView';
import DatabasesView from './views/DatabasesView';
import HistoryView from './views/HistoryView';
import SettingsView from './views/SettingsView';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/chat/new" replace />} />
            <Route path="chat/:projectId" element={<AiBotView />} />
            <Route path="query" element={<QueryView />} />
            <Route path="query/:projectId" element={<QueryView />} />
            <Route path="table" element={<TableView />} />
            <Route path="table/:projectId" element={<TableView />} />
            <Route path="databases" element={<DatabasesView />} />
            <Route path="history" element={<HistoryView />} />
            <Route path="settings" element={<SettingsView />} />
          </Route>

          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
