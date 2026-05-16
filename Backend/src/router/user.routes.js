import express from "express";
import Joi from "joi";
import userController from "../controllers/user.controller.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

const listUsersSchema = Joi.object({
  role: Joi.string().valid("guest", "user", "artist", "admin").allow("").optional(),
  status: Joi.string().valid("active", "inactive", "blocked").allow("").optional(),
  search: Joi.string().trim().allow("", null).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
});

const updateUserSchema = Joi.object({
  role: Joi.string().valid("guest", "user", "artist", "admin").optional(),
  activeStatus: Joi.string().valid("active", "inactive", "blocked").optional(),
}).min(1);

router.get(
  "/",
  requireAdmin,
  validate(listUsersSchema, "query"),
  userController.getUsers
);

router.get("/:id", requireAdmin, userController.getUser);

router.patch("/:id", requireAdmin, validate(updateUserSchema), userController.updateUser);

router.get("/:id/transactions", requireAdmin, userController.getUserTransactions);

export default router;
