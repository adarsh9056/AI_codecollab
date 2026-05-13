import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    username: { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, trim: true, default: '' },
    avatar: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);


userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);
