// A middleware which check whethere the current 
// login user is educator or not

import { clerkClient } from "@clerk/express";

export const authMiddleware = async (req, res, next) => {
    try {
        const userId = req.auth.userId
        const user = await clerkClient.users.getUser(userId)
        const role = user.publicMetadata.role
        
        if(role !== "educator") {
            return res.json({success:false, message:"You are not authorized"})
        }

        next()
    } catch (error) {
        res.json({success:false, message:error.message})
    }
}