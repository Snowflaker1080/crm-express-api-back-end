const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email:    { 
    type: String, 
    required: false, 
    unique: true 
  },
  hashedPassword: {
    type: String,
    required: true
  },
 }, { timestamps: true });

userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    delete returnedObject.hashedPassword;
  }
});

module.exports = mongoose.model('User', userSchema);