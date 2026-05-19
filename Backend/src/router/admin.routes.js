import express from "express";
import adminUserController from "../controllers/admin.user.controller.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.use(requireAdmin);

router.get("/users", adminUserController.getUsers);
router.get("/users/:id", adminUserController.getUserDetail);
// The following admin user routes are intentionally disabled to keep only the "list users" and "detail" features.
// Uncomment if you need delete endpoints in the future.
router.patch("/users/:id", adminUserController.updateUser);
// router.delete("/users/:id", adminUserController.deleteUser);

export default router;
