import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, default: '' },

    statements: [String],
    tableName: String,

    results: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true }
);

export default mongoose.model('ChatMessage', chatMessageSchema);
