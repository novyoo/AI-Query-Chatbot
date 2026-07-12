import mongoose from 'mongoose';

const columnSchema = new mongoose.Schema(
  {
    name: String,
    type: String, // e.g. INT, VARCHAR(100) for mysql; string/number/etc label for mongo
    isPrimaryKey: { type: Boolean, default: false },
  },
  { _id: false }
);

const tableSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    columns: [columnSchema],
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    engine: { type: String, enum: ['mysql', 'mongodb'], required: true },

    physicalDbName: { type: String, required: true, unique: true },
    tables: [tableSchema],
    setupStage: {
      type: String,
      enum: ['choose_engine', 'name_db', 'ready'],
      default: 'ready',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Project', projectSchema);
