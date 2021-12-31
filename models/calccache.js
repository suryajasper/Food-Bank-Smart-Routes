const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const { addressSchema } = require('./address');

const calccacheSchema = mongoose.Schema({
  forUser: ObjectId,
  matrix: [Number],
  start: addressSchema,
  routes: [{
    time: Number,
    route: [addressSchema],
  }]
});

module.exports = mongoose.model('CalcCache', calccacheSchema);