const mongoose = require('mongoose');

const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_STATUSES = ['todo', 'in-progress', 'completed'];

const taskSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Title is required and must not be empty'],
      trim: true,
      maxlength: [100, 'Title must not exceed 100 characters'],
      validate: {
        validator: function(v) {
          return typeof v === 'string' && v.trim().length > 0;
        },
        message: 'Title is required and must not be empty'
      }
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must not exceed 500 characters'],
      default: ''
    },
    priority: {
      type: String,
      enum: {
        values: VALID_PRIORITIES,
        message: `Invalid priority. Allowed values: ${VALID_PRIORITIES.join(', ')}`
      },
      default: 'medium',
      lowercase: true
    },
    status: {
      type: String,
      enum: {
        values: VALID_STATUSES,
        message: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}`
      },
      default: 'todo',
      lowercase: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Helpful index for sorting by newest first
taskSchema.index({ createdAt: -1 });

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

module.exports = {
  Task,
  VALID_PRIORITIES,
  VALID_STATUSES
};
