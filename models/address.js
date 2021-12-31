const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

const addressSchema = mongoose.Schema({
  forUser: ObjectId,
  name: String,
  coord: {
    lat: Number,
    lng: Number,
  },
});

module.exports = { Address: mongoose.model('Address', addressSchema), addressSchema };