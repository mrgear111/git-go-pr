import models from "../models/index.mjs";
import { refreshUserPRs } from "../services/prService.js";

const { User, GitHubPR, GitHubRepository, GitHubOwner, College } = models;

// ------------------------------------
// Utility: unified error handler
// ------------------------------------
function handleError(res, error, message = "Internal server error") {
  console.error(message, error);
  res.status(500).json({ error: error.message || message });
}

// ------------------------------------
// User Endpoints
// ------------------------------------
export async function getAllUsers(req, res) {
  try {
    const usersWithPRs = await GitHubPR.aggregate([
      {
        $group: { _id: "$author", pr_count: { $sum: 1 } },
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
            $mergeObjects: ["$user", { pr_count: "$pr_count" }],
          },
        },
      },
    ]);

    res.json({ users: usersWithPRs });
  } catch (error) {
    handleError(res, error, "Failed to fetch users");
  }
}

export async function getAllUserPRs(req, res) {
  try {
    const { userId } = req.params;

    const prs = await GitHubPR.find({ author: userId })
      .populate({
        path: "repository",
        populate: { path: "owner" },
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ prs });
  } catch (error) {
    handleError(res, error, "Failed to fetch user PRs");
  }
}

export async function refreshAllUserPRs(req, res) {
  try {
    // Configure SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const users = await User.find({}, "username").lean();

    if (!users.length) {
      res.write(
        `data: ${JSON.stringify({
          type: "complete",
          message: "No users to refresh",
          usersRefreshed: 0,
        })}\n\n`
      );
      return res.end();
    }

    let successCount = 0;
    let errorCount = 0;

    res.write(
      `data: ${JSON.stringify({ type: "start", total: users.length })}\n\n`
    );

    for (const [index, user] of users.entries()) {
      const progressData = (status, extra = {}) =>
        JSON.stringify({
          type: "progress",
          username: user.username,
          current: index + 1,
          total: users.length,
          status,
          ...extra,
        });

      res.write(`data: ${progressData("fetching")}\n\n`);

      try {
        await refreshUserPRs(user.username);
        successCount++;
        res.write(`data: ${progressData("success")}\n\n`);
      } catch (error) {
        console.error(`Error refreshing ${user.username}:`, error.message);
        errorCount++;
        res.write(
          `data: ${progressData("error", { error: error.message })}\n\n`
        );
      }

      // Avoid hitting rate limits
      await new Promise((r) => setTimeout(r, 1000));
    }

    res.write(
      `data: ${JSON.stringify({
        type: "complete",
        message: "Refresh completed",
        usersRefreshed: successCount,
        errors: errorCount,
        total: users.length,
      })}\n\n`
    );

    res.end();
  } catch (error) {
    handleError(res, error, "Error in manual refresh");
    res.write(
      `data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`
    );
    res.end();
  }
}

// ------------------------------------
// PR / Repository / Stats Endpoints
// ------------------------------------
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
    handleError(res, error, "Failed to fetch all PRs");
  }
}

export async function getAllRepositories(req, res) {
  try {
    const repositories = await GitHubRepository.find().populate("owner").lean();
    res.json({ repositories });
  } catch (error) {
    handleError(res, error, "Failed to fetch repositories");
  }
}

export async function getAllOwners(req, res) {
  try {
    const owners = await GitHubOwner.find().lean();
    res.json({ owners });
  } catch (error) {
    handleError(res, error, "Failed to fetch owners");
  }
}

export async function getAllColleges(req, res) {
  try {
    const colleges = await College.find().lean();
    res.json({ colleges });
  } catch (error) {
    handleError(res, error, "Failed to fetch colleges");
  }
}

// ------------------------------------
// Admin Stats
// ------------------------------------
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
    handleError(res, error, "Failed to fetch admin stats");
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

    const closedPRs = totalPRs - openPRs;

    res.json({
      totalPRs,
      mergedPRs,
      openPRs,
      closedPRs,
      totalRepositories,
      redFlaggedRepositories,
      totalUsers,
      totalColleges,
      totalOwners,
    });
  } catch (error) {
    handleError(res, error, "Error fetching global statistics");
  }
}
