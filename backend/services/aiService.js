import fetch from 'node-fetch';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description:
        'What to show the user in chat. Friendly and clear. If this is a general question (not a database change), fully answer it here in plain text.',
    },
    statements: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Executable statements to run against the database. For MySQL: raw SQL (CREATE TABLE / ALTER TABLE / INSERT / UPDATE / DELETE / SELECT ...). For MongoDB: mongo-shell style, e.g. db.students.insertOne({...}), db.students.find({...}), db.students.updateOne(...), db.students.deleteOne(...). Leave empty [] if the user asked a general question that requires no database change or read.',
    },
    tables: {
      type: 'array',
      description:
        'The full resulting schema after these statements are applied, for any table/collection your statements touch. Leave empty [] if nothing changed (e.g. pure SELECT/find, or a general question).',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          columns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                isPrimaryKey: { type: 'boolean' },
              },
              required: ['name', 'type'],
            },
          },
        },
        required: ['name', 'columns'],
      },
    },
  },
  required: ['reply', 'statements', 'tables'],
};

function systemPrompt(engine) {
  const engineRules =
    engine === 'mysql'
      ? `- Always return valid standard MySQL syntax for the "statements" array (one full statement per array item, no trailing semicolons needed).
- You can and should generate ALL kinds of statements depending on what the user asks: CREATE TABLE / ALTER TABLE to define structure, INSERT to add rows, UPDATE to edit rows, DELETE to remove rows, and SELECT to answer questions about the data (e.g. "give me the names of students with marks greater than 85" -> SELECT name FROM students WHERE marks > 85).
- When the user gives data in a loose format like "USN = 23ert, name = nov, course = CSE" or "usn is 23bfjf, name is nov, course is cse", turn that into a single INSERT statement against the matching existing table, matching column names as closely as possible (case-insensitive).
- Prefer sensible column types and an auto-increment primary key named "<table>_id" unless the user specifies otherwise, only when creating a NEW table.
- If the user asks to add/change a column on an existing table, use ALTER TABLE against the CURRENT SCHEMA given to you, don't recreate the table.
- Never include DROP DATABASE or DROP TABLE unless the user explicitly asks to delete/remove that exact table.
- "tables" must reflect the complete resulting schema for every table your CREATE/ALTER statements touch (all columns, including ones that already existed). Leave "tables" empty for pure INSERT/UPDATE/DELETE/SELECT statements that don't change structure.`
      : `- Return statements as mongo-shell style strings against the "db" object, e.g. db.students.insertOne({ name: "Alex", age: 21 }), db.students.find({ marks: { $gt: 85 } }, { name: 1 }), db.students.updateOne({ usn: "23ert" }, { $set: { course: "CSE" } }), db.students.deleteOne({ usn: "23ert" }).
- When the user gives data in a loose format like "USN = 23ert, name = nov, course = CSE" or natural language, turn that into a single insertOne (or insertMany) call against the matching existing collection.
- When the user asks a question about the data (e.g. "give me the names of students with marks greater than 85"), generate a find() call with an appropriate filter and projection.
- To define a new collection/table with example structure, you may insert 1 example document capturing the intended fields, OR just describe fields via "tables" without inserting dummy data if the user didn't give sample data.
- Never include drop/dropDatabase operations unless the user explicitly asks to delete/remove that exact collection.
- "tables" must reflect the complete resulting field list (as a schema hint; Mongo itself is schemaless) for collections your statements define/insert into. Leave "tables" empty for pure find/update/delete calls that don't add new fields.`;

  return `You are the AI assistant embedded in a no-code database tool. The user describes what they want in plain English. You have two jobs:

1. DATABASE REQUESTS: if the user wants to create/change structure, add/edit/delete data, or ask a question about their data, generate the right ${engine === 'mysql' ? 'SQL' : 'MongoDB'} statements.
${engineRules}

2. GENERAL QUESTIONS: if the user asks something that isn't a database change or read — e.g. "how do I connect this to my frontend?", "what's a primary key?", "how do I deploy this?" — just answer it directly and helpfully in "reply" using your general knowledge, and return empty "statements" and "tables" arrays. For "how do I connect this to my frontend" specifically, explain that they should call their backend's own REST API (built on this tool) from their frontend using fetch/axios, give a short realistic example (e.g. fetch('/api/tables/<projectId>/<tableName>') with a Bearer token), and mention that raw database credentials should never be shipped to frontend code.

Always keep "reply" short, friendly, and non-technical unless the user is asking a technical question, in which case be clear and precise. Never wrap code in markdown triple-backtick fences, just write it plainly since the chat UI doesn't render markdown.`;
}

export async function generateDatabaseUpdate({ engine, userMessage, currentSchema, history }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set on the server. Get a free key at https://aistudio.google.com/apikey and add it to backend/.env'
    );
  }
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  const contents = [
    ...(history || []).map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    {
      role: 'user',
      parts: [
        {
          text: `Current schema (JSON): ${JSON.stringify(currentSchema || [])}\n\nUser request: ${userMessage}`,
        },
      ],
    },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt(engine) }] },
        contents,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI provider error (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AI provider returned no content');

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('AI provider returned malformed JSON');
  }
}
