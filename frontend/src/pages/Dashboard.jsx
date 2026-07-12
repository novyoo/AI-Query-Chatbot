import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { ProjectProvider } from '../context/ProjectContext';

export default function Dashboard() {
  return (
    <ProjectProvider>
      <div className="min-h-screen flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <Outlet />
        </div>
      </div>
    </ProjectProvider>
  );
}
