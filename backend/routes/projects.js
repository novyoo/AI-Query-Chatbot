import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Project from '../models/Project.js';
import ChatMessage from '../models/ChatMessage.js';
import { physicalDbName, safeIdentifier } from '../utils/naming.js';
import * as mysqlService from '../services/mysqlService.js';
import * as mongoService from '../services/mongoService.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const projects = await Project.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json({
      projects: projects.map((p) => ({
        id: p._id,
        name: p.name,
        engine: p.engine,
        tableCount: p.tables.length,
        createdAt: p.createdAt,
        setupStage: p.setupStage,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ error: 'Database not found' });
    res.json({ project });
  } catch (err) {
    next(err);
  }
});

// Step 1 
router.post('/', async (req, res, next) => {
  try {
    const { engine } = req.body;
    if (!['mysql', 'mongodb'].includes(engine)) {
      return res.status(400).json({ error: 'engine must be "mysql" or "mongodb"' });
    }
    const project = await Project.create({
      owner: req.userId,
      name: 'untitled',
      engine,
      physicalDbName: `pending_${Date.now()}`,
      setupStage: 'name_db',
    });
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

// Step 2 
router.post('/:id/name', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ error: 'Database not found' });
    if (project.setupStage !== 'name_db') {
      return res.status(400).json({ error: 'This database has already been named' });
    }

    const displayName = safeIdentifier(name, 'my_database');
    const physical = physicalDbName(req.userId, displayName);

    if (project.engine === 'mysql') {
      await mysqlService.createDatabase(physical);
    } else {
      await mongoService.createDatabase(physical);
    }

    project.name = displayName;
    project.physicalDbName = physical;
    project.setupStage = 'ready';
    await project.save();

    await ChatMessage.create({ project: project._id, role: 'user', content: name });
    await ChatMessage.create({
      project: project._id,
      role: 'assistant',
      content: `${displayName} database created.`,
    });
    await ChatMessage.create({
      project: project._id,
      role: 'assistant',
      content:
        'You can now add tables or collections to your database. It is as simple as editing an excel sheet, prompting in the chat, or querying it yourself. Try it out!',
    });

    res.json({ project });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ error: 'Database not found' });

    if (project.setupStage === 'ready') {
      if (project.engine === 'mysql') await mysqlService.dropDatabase(project.physicalDbName);
      else await mongoService.dropDatabase(project.physicalDbName);
    }
    await ChatMessage.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
