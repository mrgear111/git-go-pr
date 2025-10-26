import models from "../models/index.mjs";
import { refreshUserPRs } from "../services/prService.js";

const { User, GitHubPR, GitHubRepository, GitHubOwner, College } = models;

/** ------------------------------
 * Utility Helpers
 * ------------------------------ */
const COOLDOWN_HOURS = 10;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

const handleError = (res, error, message = "Internal server error") => {
  console.error(message, error);
  res.status(500).json({ error: error.message || message });
};

const parseGitHubPRUrl = (url) => {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  return match
    ? { owner: match[1], repoName: match[2], prNumber: parseInt(match[3]) }
    : { owner: "unknown", repoName: "unknown", prNumber: 0 };
};

/** ------------------------------
 * Global State for Refresh Job
 * ------------------------------ */
let refreshJob = {
  isRunning: false,
  totalUsers: 0,
  processed: 0,
  successful: 0,
  errors: 0,
  currentUser: null,
  startTime: null,
  lastCompletedTime: null,
  recentLogs: [],
};

/** ------------------------------
 * Controllers
 * ------------------------------ */

export async function getAllUsers(req, res) {
  try {
    const usersWithPRs = await GitHubPR.aggregate([
      {
        $group: {
          _id: "$author",
          pr_count: { $sum: 1 },
        },
      },
      { $sort: { pr_count: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $lookup: {
                from: "colleges",
                localField: "college",
                foreignField: "_id",
                as: "college",
              },
            },
            {
              $project: {
                username: 1,
                full_name: 1,
                avatar_url: 1,
                role: 1,
                college: { $arrayElemAt: ["$college", 0] },
                last_fetch_time: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$user" },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$user", { _id: "$_id", pr_count: "$pr_count" }],
          },
        },
      },
    ]);

    res.json({ users: usersWithPRs });
  } catch (error) {
    handleError(res, error, "Error fetching users");
  }
}

export async function getAllUserPRs(req, res) {
  try {
    const { userId } = req.params;
    const prs = await GitHubPR.find({ author: userId })
      .sort({ createdAt: -1 })
      .lean();

    const formattedPRs = prs.map((pr) => {
      const { owner, repoName, prNumber } = parseGitHubPRUrl(pr.link);
      return {
        _id: pr._id,
        pr_number: prNumber,
        title: pr.title,
        url: pr.link,
        state: pr.is_open ? "open" : "closed",
        createdAt: pr.createdAt,
        repository: { name: repoName, owner: { username: owner } },
      };
    });

    res.json({ prs: formattedPRs });
  } catch (error) {
    handleError(res, error, "Error fetching user PRs");
  }
}

export const getRefreshStatus = (req, res) => res.json(refreshJob);

export async function refreshAllUserPRs(req, res) {
  if (refreshJob.isRunning)
    return res.json({
      success: false,
      message: "Refresh already in progress",
      status: refreshJob,
    });

  // Cooldown check
  if (refreshJob.lastCompletedTime) {
    const elapsed =
      Date.now() - new Date(refreshJob.lastCompletedTime).getTime();
    const remaining = COOLDOWN_MS - elapsed;

    if (remaining > 0) {
      const hours = Math.floor(remaining / 3600000);
      const mins = Math.ceil((remaining % 3600000) / 60000);
      return res.json({
        success: false,
        message: `Refresh on cooldown. Wait ${hours}h ${mins}m.`,
        cooldownRemaining: remaining,
        nextRefreshTime: new Date(Date.now() + remaining),
      });
    }
  }

  res.json({ success: true, message: "Refresh started in background" });

  runRefreshJob().catch((err) => {
    console.error("Background refresh job error:", err);
    refreshJob.isRunning = false;
  });
}

async function runRefreshJob() {
  refreshJob = {
    ...refreshJob,
    isRunning: true,
    processed: 0,
    successful: 0,
    errors: 0,
    currentUser: null,
    startTime: new Date(),
    recentLogs: [],
  };

  try {
    const users = await User.find({}, "username").lean();
    refreshJob.totalUsers = users.length;

    console.log(`Refreshing PRs for ${users.length} users...`);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      refreshJob.currentUser = user.username;
      refreshJob.processed = i + 1;

      try {
        await refreshUserPRs(user.username);
        refreshJob.successful++;
        refreshJob.recentLogs.unshift({
          username: user.username,
          status: "success",
          timestamp: new Date(),
        });
      } catch (err) {
        console.error(`Error refreshing ${user.username}:`, err.message);
        refreshJob.errors++;
        refreshJob.recentLogs.unshift({
          username: user.username,
          status: "error",
          error: err.message,
          timestamp: new Date(),
        });
      }

      refreshJob.recentLogs = refreshJob.recentLogs.slice(0, 20);
      await new Promise((r) => setTimeout(r, 300)); // prevent rate limit
    }

    console.log(
      `Refresh complete: ${refreshJob.successful} ok, ${refreshJob.errors} failed`
    );
    refreshJob.lastCompletedTime = new Date();
  } catch (err) {
    console.error("Fatal refresh error:", err);
  } finally {
    refreshJob.isRunning = false;
    refreshJob.currentUser = null;
  }
}

export async function getAdminStats(req, res) {
  try {
    const [totalUsers, totalPRs, openPRs, mergedPRs] = await Promise.all([
      User.countDocuments(),
      GitHubPR.countDocuments(),
      GitHubPR.countDocuments({ is_open: true }),
      GitHubPR.countDocuments({ is_merged: true }),
    ]);

    res.json({
      totalUsers,
      totalPRs,
      openPRs,
      mergedPRs,
      averagePRsPerUser: totalUsers ? (totalPRs / totalUsers).toFixed(2) : 0,
    });
  } catch (error) {
    handleError(res, error, "Error fetching admin stats");
  }
}

export async function getAllPRs(req, res) {
  try {
    const prs = await GitHubPR.find()
      .populate([
        { path: "author", populate: { path: "college" } },
        { path: "repository", populate: { path: "owner" } },
      ])
      .sort({ createdAt: -1 })
      .lean();

    res.json({ prs });
  } catch (error) {
    handleError(res, error, "Error fetching PRs");
  }
}

export async function getAllColleges(req, res) {
  try {
    const colleges = await College.find().lean();
    res.json({ colleges });
  } catch (error) {
    handleError(res, error, "Error fetching colleges");
  }
}

export async function getAllOwners(req, res) {
  try {
    const owners = await GitHubOwner.find().lean();
    res.json({ owners });
  } catch (error) {
    handleError(res, error, "Error fetching owners");
  }
}

export async function getAllRepositories(req, res) {
  try {
    const repositories = await GitHubRepository.find().populate("owner").lean();
    res.json({ repositories });
  } catch (error) {
    handleError(res, error, "Error fetching repositories");
  }
}

export async function getStatistics(req, res) {
  try {
    const [
      totalPRs,
      mergedPRs,
      openPRs,
      totalRepositories,
      redFlaggedRepositories,
      totalUsers,
      totalColleges,
      totalOwners,
    ] = await Promise.all([
      GitHubPR.countDocuments(),
      GitHubPR.countDocuments({ is_merged: true }),
      GitHubPR.countDocuments({ is_open: true }),
      GitHubRepository.countDocuments(),
      GitHubRepository.countDocuments({ is_redFlagged: true }),
      User.countDocuments(),
      College.countDocuments(),
      GitHubOwner.countDocuments(),
    ]);

    res.json({
      totalPRs,
      mergedPRs,
      openPRs,
      closedPRs: totalPRs - openPRs,
      totalRepositories,
      redFlaggedRepositories,
      totalUsers,
      totalColleges,
      totalOwners,
    });
  } catch (error) {
    handleError(res, error, "Error fetching statistics");
  }
}
