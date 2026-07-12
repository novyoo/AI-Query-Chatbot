import { MongoClient, ObjectId } from 'mongodb';

let client = null;

async function getClient() {
  if (!client) {
    client = new MongoClient(process.env.USER_MONGO_URI);
    await client.connect();
  }
  return client;
}

export async function createDatabase(dbName, firstCollection = '_meta') {
  const c = await getClient();
  // Mongo creates databases lazily, so we materialize it with one collection.
  await c.db(dbName).createCollection(firstCollection).catch(() => {});
}

export async function dropDatabase(dbName) {
  const c = await getClient();
  await c.db(dbName).dropDatabase();
}

export async function createCollection(dbName, collectionName) {
  const c = await getClient();
  await c.db(dbName).createCollection(collectionName).catch(() => {});
}

export async function dropCollection(dbName, collectionName) {
  const c = await getClient();
  await c.db(dbName).collection(collectionName).drop().catch(() => {});
}

export async function listCollections(dbName) {
  const c = await getClient();
  const cols = await c.db(dbName).listCollections().toArray();
  return cols.map((col) => col.name).filter((n) => n !== '_meta');
}

export async function getDocuments(dbName, collectionName, limit = 200) {
  const c = await getClient();
  return c.db(dbName).collection(collectionName).find({}).limit(limit).toArray();
}

export async function insertDocument(dbName, collectionName, doc) {
  const c = await getClient();
  return c.db(dbName).collection(collectionName).insertOne(doc);
}

export async function updateDocument(dbName, collectionName, id, update) {
  const c = await getClient();
  const clean = { ...update };
  delete clean._id;
  return c
    .db(dbName)
    .collection(collectionName)
    .updateOne({ _id: new ObjectId(id) }, { $set: clean });
}

export async function deleteDocument(dbName, collectionName, id) {
  const c = await getClient();
  return c.db(dbName).collection(collectionName).deleteOne({ _id: new ObjectId(id) });
}

const ALLOWED_METHODS = new Set([
  'find',
  'findOne',
  'insertOne',
  'insertMany',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'countDocuments',
]);

export async function runMongoCommand(dbName, commandText) {
  const match = commandText.trim().match(/^db\.(\w+)\.(\w+)\((.*)\)\s*;?\s*$/s);
  if (!match) {
    throw new Error(
      'Query must look like db.collectionName.method({ ... }), e.g. db.students.find({})'
    );
  }
  const [, collectionName, method, rawArgs] = match;
  if (!ALLOWED_METHODS.has(method)) {
    throw new Error(`Unsupported method "${method}". Allowed: ${[...ALLOWED_METHODS].join(', ')}`);
  }

  let args = [];
  if (rawArgs.trim()) {
    const evalArgs = new Function(`'use strict'; return [${rawArgs}];`);
    args = evalArgs();
  }

  const c = await getClient();
  const collection = c.db(dbName).collection(collectionName);

  if (method === 'find') {
    return collection.find(args[0] || {}, args[1] || {}).limit(200).toArray();
  }
  return collection[method](...args);
}
