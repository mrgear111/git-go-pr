import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      required: true,
    },
    github_id: {
      type: Number,
      unique: true,
      required: true,
    },
    full_name: {
      type: String,
      default: '',
    },
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      default: null,
    },
    year: {
      type: String,
      enum: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
      default: null,
    },
    role: {
      type: String,
      enum: ['student', 'instructor', 'admin'],
      default: 'student',
    },
    last_fetch_time: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

const User = mongoose.model('User', UserSchema)

export default {
  modelName: 'User',
  model: User,
  schema: UserSchema,
}
