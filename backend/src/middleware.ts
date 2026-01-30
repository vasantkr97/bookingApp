import type { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"
import dotenv from "dotenv";
dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || "vasanth"

export interface AuthRequest extends Request {
    user: {
        userId: string,
        role: string
    }
}

export const authentication = async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({
            "success": false,
            "data": null,
            "error": "UNAUTHORIZED"
        })
    }

    const token = header.split(" ")[1]

    if (!token) {
        return res.status(401).json({
            "success": false,
            "data": null,
            "error": "UNAUTHORIZED"
        })
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (!decoded) {
            return res.status(401).json({
                "success": false,
                "data": null,
                "error": "UNAUTHORIZED"
            })
        }

        (req as AuthRequest).user = decoded as { userId: string, role: string }

        next()

    } catch (error) {
        return res.status(401).json({
            "success": false,
            "data": null,
            "error": "UNAUTHORIZED"
        })
    }
}


export const authorize = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {

    const user = (req as AuthRequest).user

    if (!user || !roles.includes(user.role)) {
        return res.status(403).json({
            "success": false,
            "data": null,
            "error": "FORBIDDEN"
        })
    }

    next()
}
































// import type { Request, Response, NextFunction } from "express";
// import jwt from "jsonwebtoken"
// import dotenv from "dotenv";

// dotenv.config()

// const JWT_SECRET = process.env.JWT_SECRET || "vasanth"

// export interface AuthRequest extends Request {
//     user: {
//         userId: string,
//         role: string
//     }
// }


// export const authentication = async (req: Request, res: Response, next: NextFunction) => {
//     const header = req.headers.authorization

//     if (!header || !header.startsWith("Bearer ")) {
//         return res.status(401).json({
//             "success": false,
//             "data": null,
//             "error": "UNAUTHORIZED"
//         })
//     }

//     const token = header.split(" ")[1]

//     if (!token) {
//         return res.status(401).json({
//             "success": false,
//             "data": null,
//             "error": "UNAUTHORIZED"
//         })
//     }

//     try {

//         const decoded = jwt.verify(token, JWT_SECRET)

//         if (!decoded) {
//             return res.status(401).json({
//                 "success": false,
//                 "data": null,
//                 "error": "UNAUTHORIZED"
//             })
//         }

//         (req as AuthRequest).user = decoded as { userId: string, role: string }
//         next()

//     } catch (error) {
//         return res.status(401).json({
//             "success": false,
//             "data": null,
//             "error": "UNAUTHORIZED"
//         })
//     }
// }

// export const authorize = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
//     const user = (req as AuthRequest).user

//     if (!user || !roles.includes(user.role)) {
//         return res.status(403).json({
//             "success": false,
//             "data": null,
//             "error": "FORBIDDEN"
//         })
//     }
//     next()
// };


