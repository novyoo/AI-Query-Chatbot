import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import ChatMessage from '../models/ChatMessage.js';
import { getOwnedProject, mergeTables } from '../utils/getOwnedProject.js';
import { generateDatabaseUpdate } from '../services/aiService.js';
import * as mysqlService from '../services/mysqlService.js';
import * as mongoService from '../services/mongoService.js';

const router = Router();
router.use(requireAuth);

router.get('/:projectId', async (req, res, next) => {
  try {
    const project = await getOwnedProject(req.params.projectId, req.userId);
    const messages = await ChatMessage.find({ project: project._id }).sort({ createdAt: 1 });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

router.post('/:projectId', async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'message is required' });

    const project = await getOwnedProject(req.params.projectId, req.userId);
    if (project.setupStage !== 'ready') {
      return res.status(400).json({ error: 'Finish naming this database before chatting.' });
    }

    await ChatMessage.create({ project: project._id, role: 'user', content: message });

    const history = (await ChatMessage.find({ project: project._id }).sort({ createdAt: 1 }).limit(20)).map(
      (m) => ({ role: m.role, content: m.content })
    );

    const ai = await generateDatabaseUpdate({
      engine: project.engine,
      userMessage: message,
      currentSchema: project.tables,
      history: history.slice(0, -1), 
    });

    // Execute whatever the AI generated against the real database, and capture
    const executionErrors = [];
    const results = [];

    if (ai.statements?.length) {
      if (project.engine === 'mysql') {
        for (const stmt of ai.statements) {
          try {
            const { rows } = await mysqlService.runQuery(project.physicalDbName, stmt);
            if (Array.isArray(rows) && rows.length && typeof rows[0] === 'object') {
              results.push({ columns: Object.keys(rows[0]), rows });
            }
          } catch (e) {
            executionErrors.push(`${stmt.slice(0, 60)}... -> ${e.message}`);
          }
        }
      } else {
        for (const stmt of ai.statements) {
          try {
            const result = await mongoService.runMongoCommand(project.physicalDbName, stmt);
            if (Array.isArray(result) && result.length) {
              const columnSet = new Set();
              result.forEach((r) => Object.keys(r).forEach((k) => columnSet.add(k)));
              results.push({ columns: [...columnSet], rows: result });
            }
          } catch (e) {
            executionErrors.push(`${stmt.slice(0, 60)}... -> ${e.message}`);
          }
        }
      }
    }

    if (ai.tables?.length) {
      project.tables = mergeTables(project.tables, ai.tables);
      await project.save();
    }

    const replyText = executionErrors.length
      ? `${ai.reply}\n\n(Some statements failed: ${executionErrors.join('; ')})`
      : ai.reply;

    const assistantMessage = await ChatMessage.create({
      project: project._id,
      role: 'assistant',
      content: replyText,
      statements: ai.statements,
      tableName: ai.tables?.[0]?.name,
      results: results.length ? results : undefined,
    });

    res.json({ message: assistantMessage, tables: project.tables });
  } catch (err) {
    next(err);
  }
});

export default router;
