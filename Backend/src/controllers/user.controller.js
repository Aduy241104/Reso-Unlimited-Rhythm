import mongoose from "mongoose";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import formatResponse from "../utils/formatResponse.js";
import { AppError } from "../utils/AppError.js";

const { isValidObjectId } = mongoose;

const getUsers = async (req, res, next) => {
  try {
    const {
      role,
      status,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    if (role) {
      filter.role = role;
    }

    if (status) {
      filter.activeStatus = status;
    }

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: "i" } },
        { "profile.fullName": { $regex: search, $options: "i" } },
      ];
    }

    const currentPage = Number(page) || 1;
    const itemsPerPage = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const skip = (currentPage - 1) * itemsPerPage;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(itemsPerPage)
        .lean(),
      User.countDocuments(filter),
    ]);

    return formatResponse.success(
      res,
      users,
      "Users fetched successfully.",
      {
        total,
        page: currentPage,
        limit: itemsPerPage,
      }
    );
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      throw new AppError("Invalid user id.", 400);
    }

    const user = await User.findById(id).select("-password -__v").lean();

    if (!user) {
      throw new AppError("User not found.", 404);
    }

    return formatResponse.success(res, user, "User fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, activeStatus } = req.body;

    if (!isValidObjectId(id)) {
      throw new AppError("Invalid user id.", 400);
    }

    const updates = {};
    if (role) updates.role = role;
    if (activeStatus) updates.activeStatus = activeStatus;

    if (Object.keys(updates).length === 0) {
      throw new AppError("No valid update fields provided.", 400);
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
      select: "-password -__v",
    });

    if (!user) {
      throw new AppError("User not found.", 404);
    }

    return formatResponse.success(res, user, "User updated successfully.");
  } catch (error) {
    next(error);
  }
};

const getUserTransactions = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      throw new AppError("Invalid user id.", 400);
    }

    const transactions = await Transaction.find({ userId: id })
      .sort({ createdAt: -1 })
      .lean();

    return formatResponse.success(
      res,
      transactions,
      "User transactions fetched successfully."
    );
  } catch (error) {
    next(error);
  }
};

export default {
  getUsers,
  getUser,
  updateUser,
  getUserTransactions,
};
