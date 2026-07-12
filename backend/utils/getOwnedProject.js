import Project from '../models/Project.js';

export async function getOwnedProject(projectId, userId) {
  const project = await Project.findOne({ _id: projectId, owner: userId });
  if (!project) {
    const err = new Error('Database not found');
    err.status = 404;
    throw err;
  }
  return project;
}

// Merges freshly-generated table definitions into the project's tracked schema,
// so "tables" always reflects the latest known columns per table/collection.
export function mergeTables(existingTables, newTables) {
  const map = new Map(existingTables.map((t) => [t.name, t]));
  for (const t of newTables || []) {
    map.set(t.name, t);
  }
  return [...map.values()];
}
