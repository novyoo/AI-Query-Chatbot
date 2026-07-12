import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getOwnedProject } from '../utils/getOwnedProject.js';
import * as mysqlService from '../services/mysqlService.js';
import * as mongoService from '../services/mongoService.js';

const router = Router();
router.use(requireAuth);

router.get('/:projectId', async (req, res, next) => {
  try {
    const project = await getOwnedProject(req.params.projectId, req.userId);
    res.json({ engine: project.engine, tables: project.tables });
  } catch (err) {
    next(err);
  }
});

router.post('/:projectId', async (req, res, next) => {
  try {
    const project = await getOwnedProject(req.params.projectId, req.userId);
    const { name, columns } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'Table name is required' });
    const cleanColumns = (columns || []).filter((c) => c.name && c.name.trim());
    if (!cleanColumns.length) return res.status(400).json({ error: 'At least one column is required' });

    if (project.engine === 'mysql') {
      await mysqlService.createTable(project.physicalDbName, name, cleanColumns);
    } else {
      await mongoService.createCollection(project.physicalDbName, name);
    }

    project.tables = [...project.tables.filter((t) => t.name !== name), { name, columns: cleanColumns }];
    await project.save();
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

// Delete a table/collection entirely.
router.delete('/:projectId/:tableName', async (req, res, next) => {
  try {
    const project = await getOwnedProject(req.params.projectId, req.userId);
    const { tableName } = req.params;

    if (project.engine === 'mysql') {
      await mysqlService.dropTable(project.physicalDbName, tableName);
    } else {
      await mongoService.dropCollection(project.physicalDbName, tableName);
    }

    project.tables = project.tables.filter((t) => t.name !== tableName);
    await project.save();
    res.json({ project });
  } catch (err) {
    next(err);
  }
});

router.get('/:projectId/:tableName', async (req, res, next) => {
  try {
    const project = await getOwnedProject(req.params.projectId, req.userId);
    const { tableName } = req.params;

    if (project.engine === 'mysql') {
      const columns = await mysqlService.getTableSchema(project.physicalDbName, tableName);
      const rows = await mysqlService.getTableRows(project.physicalDbName, tableName);
      res.json({ columns, rows, primaryKey: columns.find((c) => c.isPrimaryKey)?.name || null });
    } else {
      const rows = await mongoService.getDocuments(project.physicalDbName, tableName);
      const columnSet = new Set();
      rows.forEach((r) => Object.keys(r).forEach((k) => columnSet.add(k)));
      const columns = [...columnSet].map((name) => ({ name, type: 'mixed', isPrimaryKey: name === '_id' }));
      res.json({ columns, rows, primaryKey: '_id' });
    }
  } catch (err) {
    next(err);
  }
});

router.post('/:projectId/:tableName/rows', async (req, res, next) => {
  try {
    const project = await getOwnedProject(req.params.projectId, req.userId);
    const { tableName } = req.params;
    const rowData = req.body || {};

    if (project.engine === 'mysql') {
      const result = await mysqlService.insertRow(project.physicalDbName, tableName, rowData);
      res.status(201).json({ result });
    } else {
      const result = await mongoService.insertDocument(project.physicalDbName, tableName, rowData);
      res.status(201).json({ result });
    }
  } catch (err) {
    next(err);
  }
});

router.put('/:projectId/:tableName/rows/:rowId', async (req, res, next) => {
  try {
    const project = await getOwnedProject(req.params.projectId, req.userId);
    const { tableName, rowId } = req.params;
    const rowData = req.body || {};

    if (project.engine === 'mysql') {
      const columns = await mysqlService.getTableSchema(project.physicalDbName, tableName);
      const pk = columns.find((c) => c.isPrimaryKey)?.name;
      if (!pk) return res.status(400).json({ error: 'Table has no primary key to update by' });
      const result = await mysqlService.updateRow(project.physicalDbName, tableName, pk, rowId, rowData);
      res.json({ result });
    } else {
      const result = await mongoService.updateDocument(project.physicalDbName, tableName, rowId, rowData);
      res.json({ result });
    }
  } catch (err) {
    next(err);
  }
});

router.delete('/:projectId/:tableName/rows/:rowId', async (req, res, next) => {
  try {
    const project = await getOwnedProject(req.params.projectId, req.userId);
    const { tableName, rowId } = req.params;

    if (project.engine === 'mysql') {
      const columns = await mysqlService.getTableSchema(project.physicalDbName, tableName);
      const pk = columns.find((c) => c.isPrimaryKey)?.name;
      if (!pk) return res.status(400).json({ error: 'Table has no primary key to delete by' });
      const result = await mysqlService.deleteRow(project.physicalDbName, tableName, pk, rowId);
      res.json({ result });
    } else {
      const result = await mongoService.deleteDocument(project.physicalDbName, tableName, rowId);
      res.json({ result });
    }
  } catch (err) {
    next(err);
  }
});

router.post('/:projectId/:tableName/save', async (req, res, next) => {
  try {
    const project = await getOwnedProject(req.params.projectId, req.userId);
    const { tableName } = req.params;
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];

    if (project.engine === 'mysql') {
      const columns = await mysqlService.getTableSchema(project.physicalDbName, tableName);
      const pk = columns.find((c) => c.isPrimaryKey)?.name;
      for (const row of rows) {
        const hasPk = pk && row[pk] !== undefined && row[pk] !== null && row[pk] !== '';
        if (hasPk) {
          await mysqlService.updateRow(project.physicalDbName, tableName, pk, row[pk], row);
        } else {
          const clean = { ...row };
          if (pk) delete clean[pk];
          if (Object.values(clean).some((v) => v !== '' && v !== null && v !== undefined)) {
            await mysqlService.insertRow(project.physicalDbName, tableName, clean);
          }
        }
      }
    } else {
      for (const row of rows) {
        if (row._id) {
          await mongoService.updateDocument(project.physicalDbName, tableName, row._id, row);
        } else if (Object.values(row).some((v) => v !== '' && v !== null && v !== undefined)) {
          await mongoService.insertDocument(project.physicalDbName, tableName, row);
        }
      }
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
