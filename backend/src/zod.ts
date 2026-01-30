import { z } from "zod"

export const signupSchema = z.object({
    name: z.string(),
    email: z.string(),
    password: z.string(),
    role: z.enum(["customer", "owner"]).optional(),
    phone: z.string().optional()
})


export const SigninSchema = z.object({
    email: z.string().email(),
    password: z.string(),
})



export const createHotelSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    city: z.string(),
    country: z.string(),
    amenities: z.array(z.string()).optional(),
})

export const addRoomToHotelSchema = z.object({
    roomNumber: z.string(),
    roomType: z.string().optional(),
    pricePerNight: z.number(),
    maxOccupancy: z.number()
})


export const createBookingsSchema = z.object({
    roomId: z.string(),
    checkInDate: z.string(),
    checkOutDate: z.string(),
    guests: z.number()
})

export const reviewSchema = z.object({
    bookingId: z.string(),
    rating: z.number(),
    comment: z.string().optional()
})