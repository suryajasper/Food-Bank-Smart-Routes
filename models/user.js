const mongoose = require('mongoose');
const uniquePasswordValidator = require('mongoose-unique-validator');
const crypto = require('crypto');
const { ObjectID } = require('mongodb');

const userSchema = mongoose.Schema({
  username: {
    type: String,
    lowercase: true,
    trim: true,
    required: [true, "can't be blank"],
    index: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    required: [true, "can't be blank"],
    match: [/\S+@\S+\.\S+/, 'is invalid'],
    index: true
  },
  hash: String,
  salt: String
}, {timestamps: true});

userSchema.plugin(uniquePasswordValidator, {message: 'is already taken.'});

userSchema.pre('save', function(next) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(this.hash, this.salt, 10000, 512, 'sha512').toString('hex');
  
  next();
});

userSchema.methods.isValidPassword = function(password)  {
  const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
  return this.hash === hash;
};

module.exports = mongoose.model('User', userSchema);