const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const { addressSchema } = require('./address');

const calccacheSchema = mongoose.Schema({
  forUser: ObjectId,
  matrix: String,
});

module.exports = mongoose.model('CalcCache', calccacheSchema);