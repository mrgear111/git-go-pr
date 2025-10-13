import mongoose from 'mongoose'

const GitHubPRSchema = new mongoose.Schema(
  {
    github_id: {
      type: Number,
      unique: true,
      required: true,
    },
    title: {
      type: String,
      default: '',
    },
    body: {
      type: String,
      default: '',
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    repository: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GitHubRepository',
    },
    link: {
      type: String,
      default: '',
      unique: true,
      required: true,
    },
    is_open: {
      type: Boolean,
      default: true,
    },
    is_merged: {
      type: Boolean,
      default: false,
    },
    is_goodQuality: {
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

const GitHubPR = mongoose.model('GitHubPR', GitHubPRSchema)

export default {
  modelName: 'GitHubPR',
  model: GitHubPR,
  schema: GitHubPRSchema,
}
