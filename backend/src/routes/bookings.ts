import type { Request, Response } from "express"
import { createBookingsSchema, reviewSchema } from "../zod"
import type { AuthRequest } from "../middleware"
import { prisma } from "../db"
import { success } from "zod"

export const createNewBooking = async (req: Request, res: Response) => {
    const validate = createBookingsSchema.safeParse(req.body)
    const user = (req as AuthRequest).user

    if (!validate.success) {
        return res.status(400).json({
            "success": false,
            "data": null,
            "error": "INVALID_REQUEST"
        })
    }

    const { roomId, checkInDate, checkOutDate, guests } = validate.data

    //verify Date
    const todaysDate = new Date().toISOString().split("T")[0]

    if (checkInDate < todaysDate!) {
        return res.status(400).json({
            "success": false,
            "data": null,
            "error": "INVALID_DATES"
        })
    }

    if (checkOutDate < checkInDate) {
        return res.status(400).json({
            success: false,
            data: null,
            error: "INVALID_REQUEST"
        })
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    try {
        const roomBooking = await prisma.$transaction(async (tx) => {

            //Fetch Room & Check Owner
            const room = await tx.rooms.findUnique({
                where: { id: roomId },
                include: { hotel: true }
            })

            if (!room) throw new Error("ROOM_NOT_FOUND");

            if (room.hotel.owner_id === user.userId) {
                throw new Error("FORBIDDEN")
            };

            if (guests > room.max_occupancy) {
                throw new Error("INVALID_CAPACITY")
            }

            //Check Availability
            const overlappingBooking = await tx.bookings.findFirst({
                where: {
                    room_id: roomId,
                    status: "confirmed",
                    check_in_date: { lt: checkOut },
                    check_out_date: { gt: checkIn }
                }
            })

            if (overlappingBooking) {
                throw new Error("ROOM_NOT_AVAILABLE")
            }

            //total Price 
            const nights = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
            const totalPrice = Number(room.price_per_night) * nights

            const booking = tx.bookings.create({
                data: {
                    user_id: user.userId,
                    room_id: roomId,
                    hotel_id: room.hotel_id,
                    check_in_date: checkIn,
                    check_out_date: checkOut,
                    guests,
                    total_price: totalPrice,
                    status: "confirmed"
                }
            })

            return booking
        });

        return res.status(201).json({
            success: true,
            data: {
                id: roomBooking.id,
                userId: roomBooking.user_id,
                roomId: roomBooking.room_id,
                hotelId: roomBooking.hotel_id,
                checkInDate: roomBooking.check_in_date.toISOString().split("T")[0],
                checkOutDate: roomBooking.check_out_date.toISOString().split("T")[0],
                guests: roomBooking.guests,
                totalPrice: Number(roomBooking.total_price),
                status: roomBooking.status,
                bookingDate: roomBooking.booking_date.toISOString()
            },
            error: null
        })

    } catch (error: any) {
        if (error.message === "ROOM_NOT_FOUND") {
            return res.status(404).json({ success: false, data: null, error: "ROOM_NOT_FOUND" })
        }

        if (error.message === "FORBIDDEN") {
            return res.status(403).json({ success: false, data: null, error: "FORBIDDEN" })
        }

        if (error.message === "INVALID_CAPACITY") {
            return res.status(400).json({ success: false, data: null, error: "INVALID_CAPACITY" })
        }

        if (error.message === "ROOM_NOT_AVAILABLE") {
            return res.status(400).json({ success: false, data: null, error: "ROOM_NOT_AVAILABLE" })
        }

        return res.status(500).json({
            success: false,
            data: null,
            error: "INTERNAL_SERVER_ERROR"
        })
    }
}


export const getAllBooking = async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user.userId
    const { status } = req.query as { status: string }

    try {
        let whereclause: any = {}

        if (status) {
            whereclause.status = status
        }
        whereclause.user_id = userId

        const getAllBookings = await prisma.bookings.findMany({
            where: whereclause,
            include: {
                hotel: true,
                room: true
            }
        })

        const allBookings = getAllBookings.map(b => {
            return {
                id: b.id,
                roomId: b.room_id,
                hotelId: b.hotel_id,
                hotelName: b.hotel.name,
                roomNumber: b.room.room_number,
                roomType: b.room.room_type,
                checkInDate: b.check_in_date,
                checkOutDate: b.check_out_date,
                guests: b.guests,
                totalPrice: b.total_price,
                status: b.status,
                bookingDate: b.booking_date
            }
        })

        return res.status(200).json({
            success: true,
            data: allBookings,
            error: null
        })
    } catch (error) {
        return res.status(401).json({
            success: false,
            data: null,
            error: "UNAUTHORIZED"
        })
    }
}


export const cancelBooking = async (req: Request, res: Response) => {
    const { bookingId } = req.params as { bookingId: string }
    const userId = (req as AuthRequest).user.userId
    try {

        const booking = await prisma.bookings.findFirst({
            where: {
                id: bookingId
            }
        })

        if (!booking) {
            throw new Error("BOOKING_NOT_FOUND")
        }

        if (booking.user_id !== userId) {
            throw new Error("FORBIDDEN")
        }

        if (booking.status === "cancelled") {
            throw new Error("ALREADY_CANCELLED")
        }

        const now = new Date();
        const checkIn = new Date(booking.check_in_date)
        const diff = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60)

        if (diff < 24) {
            throw new Error("CANCELLATION_DEADLINE_PASSED")
        }

        const updateBooking = await prisma.bookings.update({
            where: {
                id: bookingId
            },
            data: {
                status: "cancelled",
                cancelled_at: new Date()
            }
        })

        return res.status(200).json({
            success: true,
            data: {
                id: updateBooking.id,
                status: updateBooking.status,
                cancelledAt: updateBooking.cancelled_at
            },
            error: null
        })

    } catch (error: any) {
        if (error.message === "BOOKING_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                data: null,
                error: "BOOKING_NOT_FOUND"
            })
        }

        if (error.message === "FORBIDDEN") {
            return res.status(403).json({
                success: false,
                data: null,
                error: "FORBIDDEN"
            })
        }

        if (error.message === "CANCELLATION_DEADLINE_PASSED") {
            return res.status(400).json({
                success: false,
                data: null,
                error: "CANCELLATION_DEADLINE_PASSED"
            })
        }

        if (error.message === "ALREADY_CANCELLED") {
            return res.status(400).json({
                success: false,
                data: null,
                error: "ALREADY_CANCELLED"
            })
        }
    }
}


export const reviews = async (req: Request, res: Response) => {
    const validate = reviewSchema.safeParse(req.body)
    const userId = (req as AuthRequest).user.userId

    if (!validate.success) {
        return res.status(400).json({
            success: false,
            data: null,
            error: "INVALID_REQUEST"
        })
    }

    const { bookingId, rating, comment } = validate.data;

    if (rating < 1 || rating > 5) {
        return res.status(400).json({
            success: false,
            data: null,
            error: "INVALID_REQUEST"
        })
    }

    try {

        const booking = await prisma.bookings.findFirst({
            where: {
                id: bookingId
            }
        })

        if (!booking) {
            throw new Error("BOOKING_NOT_FOUND")
        }

        if (booking.user_id !== userId) {
            throw new Error("FORBIDDEN")
        }

        const today = new Date()
        const checkOut = new Date(booking.check_out_date)

        if (checkOut < today || booking.status !== "confirmed") {
            throw new Error("BOOKING_NOT_ELIGIBLE")
        }

        const existingReview = await prisma.reviews.findFirst({
            where: { booking_id: bookingId, user_id: userId }
        })

        if (existingReview) {
            throw new Error("ALREADY_REVIEWED")
        }

        const newReview = await prisma.reviews.create({
            data: {
                user_id: userId,
                booking_id: bookingId,
                hotel_id: booking.hotel_id,
                rating: rating,
                comment: comment || ""
            }
        })

        return res.status(201).json({
            success: true,
            data: {
                id: newReview.id,
                userId: newReview.user_id,
                hotelId: newReview.hotel_id,
                bookingId: newReview.booking_id,
                rating: newReview.booking_id,
                comment: newReview.comment,
                createdAt: newReview.created_at
            },
            error: null
        })


    } catch (error: any) {
        if (error.message === "BOOKING_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                data: null,
                error: "BOOKING_NOT_FOUND"
            })
        }

        if (error.message === "BOOKING_NOT_ELIGIBLE") {
            return res.status(400).json({
                success: false,
                data: null,
                error: "BOOKING_NOT_ELIGIBLE"
            })
        }

        if (error.message === "ALREADY_REVIEWED") {
            return res.status(400).json({
                success: false,
                data: null,
                error: "ALREADY_REVIEWED"
            })
        }

        if (error.message === "FORBIDDEN") {
            return res.status(403).json({
                success: false,
                data: null,
                error: "FORBIDDEN"
            })
        }
    }
}

