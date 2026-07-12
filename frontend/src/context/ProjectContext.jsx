import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/projects');
      setProjects(data.projects);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ProjectContext.Provider value={{ projects, loading, refresh }}>{children}</ProjectContext.Provider>
  );
}

export function useProjects() {
  return useContext(ProjectContext);
}
