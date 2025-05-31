import express from "express";
import { addCourse, educatorDashboardData, getEducatorCourses, getEnrolledStudentsData, updateRoleToEducator } from "../controllers/educator.controller.js";
import upload from "../configs/multer.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const educatorRouter = express.Router();

// Add Educator Role
educatorRouter.get("/update-role", updateRoleToEducator);
educatorRouter.post("/add-course", upload.single('image'), authMiddleware, addCourse);
educatorRouter.get("/courses", authMiddleware, getEducatorCourses);
educatorRouter.get("/dashboard", authMiddleware, educatorDashboardData);    
educatorRouter.get("/enrolled-students", authMiddleware, getEnrolledStudentsData);

export default educatorRouter;