const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    projectId: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(6).toString('hex'), // 12-char hex string
    },
    role: {
      type: String,
      enum: ['agent', 'admin'],
      default: 'agent',
    },
  },
  { timestamps: true }
);

// Hash the password before saving, but only when it's new or has changed.
// Mongoose treats an `async` pre-save hook as promise-based middleware — it
// does not pass a `next` callback, so we just return/throw normally.
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compares a plaintext password attempt against the stored hash.
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
