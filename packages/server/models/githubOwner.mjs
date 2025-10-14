import mongoose from 'mongoose'

const GitHubOwnerSchema = new mongoose.Schema(
  {
    github_id: {
      type: Number,
      unique: true,
      required: true,
    },
    name: {
      type: String,
    },
    username: {
      type: String,
      unique: true,
      required: true,
    },
    type: {
      type: String,
      enum: ['User', 'Organization'],
      required: true,
      default: 'User',
    },
    link: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

const GitHubOwner = mongoose.model('GitHubOwner', GitHubOwnerSchema)

export default {
  modelName: 'GitHubOwner',
  model: GitHubOwner,
  schema: GitHubOwnerSchema,
}
