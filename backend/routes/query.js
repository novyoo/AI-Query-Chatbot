import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getOwnedProject, mergeTables } from '../utils/getOwnedProject.js';
import * as mysqlService from '../services/mysqlService.js';
import * as mongoService from '../services/mongoService.js';

const router = Router();
router.use(requireAuth);

// Returns a human-readable representation of the current schema for the editor
router.get('/:projectId', async (req, res, next) => {
  try {
    const project = await getOwnedProject(req.params.projectId, req.userId);
    if (project.engine === 'mysql') {
      const tableNames = await mysqlService.listTables(project.physicalDbName);
      const blocks = [];
      for (const name of tableNames) {
        const schema = await mysqlService.getTableSchema(project.physicalDbName, name);
        const cols = schema.map((c) => `  ${c.name} ${c.type}${c.isPrimaryKey ? ' PRIMARY KEY' : ''}`);
        blocks.push(`CREATE TABLE ${name} (\n${cols.join(',\n')}\n);`);
      }
      res.json({ engine: 'mysql', text: blocks.join('\n\n'), tableNames });
    } else {
      const collNames = await mongoService.listCollections(project.physicalDbName);
      const lines = project.tables
        .filter((t) => collNames.includes(t.name))
        .map((t) => `// ${t.name}: ${t.columns.map((c) => c.name).join(', ')}`);
      res.json({ engine: 'mongodb', text: lines.join('\n'), tableNames: collNames });
    }
  } catch (err) {
    next(err);
  }
});

router.post('/:projectId/run', async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) return res.status(400).json({ error: 'query is required' });

    const project = await getOwnedProject(req.params.projectId, req.userId);

    if (project.engine === 'mysql') {
      const results = await mysqlService.runStatements(project.physicalDbName, query);
      const tableNames = await mysqlService.listTables(project.physicalDbName);
      const tables = [];
      for (const name of tableNames) {
        const schema = await mysqlService.getTableSchema(project.physicalDbName, name);
        tables.push({ name, columns: schema.map((c) => ({ name: c.name, type: c.type, isPrimaryKey: c.isPrimaryKey })) });
      }
      project.tables = tables;
      await project.save();
      res.json({ results, tables: project.tables });
    } else {
      const result = await mongoService.runMongoCommand(project.physicalDbName, query);
      res.json({ results: [result] });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
