import mongoose from 'mongoose'

const GitHubRepositorySchema = new mongoose.Schema(
  {
    github_id: {
      type: Number,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GitHubOwner',
    },
    is_gosc: {
      type: Boolean,
      default: false,
    },
    is_redFlagged: {
      type: Boolean,
      default: false,
    },
    redFlag_reason: {
      type: String,
      default: '',
    },
    redFlag_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    redFlag_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

const GitHubRepository = mongoose.model(
  'GitHubRepository',
  GitHubRepositorySchema
)

export default {
  modelName: 'GitHubRepository',
  model: GitHubRepository,
  schema: GitHubRepositorySchema,
}
