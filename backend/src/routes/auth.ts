import type { Request, Response } from "express"
import { SigninSchema, signupSchema } from "../zod"
import { prisma } from "../db"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || "vasanth"

export const signup  = async (req: Request, res: Response) => {
    const validate = signupSchema.safeParse(req.body)

    if (!validate.success) {
        return res.status(400).json({ 
            "success": false,
            "data": null,
            "error": "INVALID_REQUEST"
        })
    } 

    let { name, email, password, role, phone } = validate.data;

    try {
        const existingUser = await prisma.user.findUnique({
            where: {
                email
            }
        })

        if (existingUser) {
            return res.status(400).json({
                "success": false,
                "data": null,
                "error": "EMAIL_ALREADY_EXISTS"
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role === 'owner' ? "owner" : "customer",
                phone
            }
        })

        return res.status(201).json({
            "success": true,
            "data": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "phone": user.phone
            },
            "error": null
        })


    } catch (error) {
        console.error(error)

        return res.status(500).json({
            "success": false,
            "data": null,
            "error": "INTERNAL_SERVER_ERROR"
        })
    }
}


export const login = async (req: Request, res: Response) => {
    const validate = SigninSchema.safeParse(req.body)

    if (!validate.success) {
        return res.status(400).json({
            "success": false,
            "data": null,
            "error": "INVALID_REQUEST"
        })
    }

    const { email, password } = validate.data

    try {
        const existingUser = await prisma.user.findUnique({
            where: {
                email
            }
        })

        if (!existingUser) {
            return res.status(401).json({ 
                "success": false,
                "data": null,
                "error": "INVALID_CREDENTIALS"
            })
        }

        const checkPassword = await bcrypt.compare(password, existingUser.password)

        if (!checkPassword) {
            return res.status(401).json({
                "success": false,
                "data": null,
                "error": "INVALID_CREDENTIALS"
            })
        }

        const token = jwt.sign({ userId: existingUser.id, role: existingUser.role }, JWT_SECRET)

        return res.status(200).json({
            "success": true,
            "data": {
                "token": token,
                "user": {
                    "id": existingUser.id,
                    "name": existingUser.name,
                    "email": existingUser.email,
                    "role": existingUser.role
                }
            },
            "error": null
        })

    } catch (error) {
        console.error(error)
        return res.status(500).json({
            "success": false,
            "data": null,
            "error": "INTERNAL_SERVER_ERROR"
        })
    }
}