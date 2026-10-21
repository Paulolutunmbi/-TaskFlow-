const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

/**
 * Atomically increments and returns the next sequential integer ID for a given sequence name.
 * @param {string} sequenceName - Identifier for the counter (e.g. 'taskId')
 * @returns {Promise<number>}
 */
async function getNextSequence(sequenceName = 'taskId') {
  const counter = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return counter.seq;
}

/**
 * Resets or sets the counter sequence value.
 * @param {string} sequenceName
 * @param {number} value
 */
async function setSequence(sequenceName = 'taskId', value = 0) {
  await Counter.findByIdAndUpdate(
    sequenceName,
    { seq: value },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

module.exports = {
  Counter,
  getNextSequence,
  setSequence
};
