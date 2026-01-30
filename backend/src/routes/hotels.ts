import type { Request, Response } from "express";
import { addRoomToHotelSchema, createHotelSchema } from "../zod";
import { prisma } from "../db";
import type { AuthRequest } from "../middleware";


export const createHotel = async (req: Request, res: Response) => {
    const validate = createHotelSchema.safeParse(req.body);
    const owner_id = (req as AuthRequest).user.userId

    if (!validate.success) {
        return res.status(400).json({
            "success": false,
            "data": null,
            "error": "INVALID_REQUEST"
        })
    }

    const { name, description, city, country, amenities } = validate.data

    try {
        const hotel = await prisma.hotels.create({
            data: {
                owner_id,
                name,
                description: description || "",
                city,
                country,
                amenities: amenities || []
            }
        })

        return res.status(201).json({
            "success": true,
            "data": {
                "id": hotel.id,
                "ownerId": hotel.owner_id,
                "name": hotel.name,
                "description": hotel.description,
                "city": hotel.city,
                "country": hotel.country,
                "amenities": hotel.amenities,
                "rating": Number(hotel.rating),
                "totalReviews": hotel.total_reviews
            },
            "error": null
        })
    } catch (error) {
        console.error(error)
        return res.status(400).json({
            "success": false,
            "data": null,
            "error": "INVALID_REQUEST"
        })
    }
}


export const addRoomToHotel = async (req: Request, res: Response) => {
    const validate = addRoomToHotelSchema.safeParse(req.body)
    const { hotelId } = req.params as { hotelId: string }

    if (!validate.success) {
        return res.status(400).json({
            "success": false,
            "data": null,
            "error": "INVALID_REQUEST"
        })
    }

    const { roomNumber, roomType, pricePerNight, maxOccupancy } = validate.data

    try {

        const existingHotel = await prisma.hotels.findFirst({
            where: {
                id: hotelId
            }
        })

        if (!existingHotel) {
            return res.status(404).json({
                "success": false,
                "data": null,
                "error": "HOTEL_NOT_FOUND"
            })
        }

        const existingRoom = await prisma.rooms.findFirst({
            where: {
                hotel_id: hotelId,
                room_number: roomNumber
            }
        })

        if (existingRoom) {
            return res.status(400).json({
                "success": false,
                "data": null,
                "error": "ROOM_ALREADY_EXISTS"
            })
        }

        const room = await prisma.rooms.create({
            data: {
                hotel_id: hotelId,
                room_number: roomNumber,
                room_type: roomType || "Standard",
                price_per_night: pricePerNight,
                max_occupancy: maxOccupancy
            }
        })

        return res.status(201).json({
            "success": true,
            "data": {
                "id": room.id,
                "hotelId": room.hotel_id,
                "roomNumber": room.room_number,
                "roomType": room.room_type,
                "pricePerNight": Number(room.price_per_night),
                "maxOccupancy": room.max_occupancy
            },
            "error": null
        })

    } catch (error) {
        return res.status(400).json({
            "success": false,
            "data": null,
            "error": "INVALID_REQUEST"
        })
    }
}


export const getHotels = async (req: Request, res: Response) => {
    const { city, country, minPrice, maxPrice, minRating } = req.query as {
        city?: string;
        country?: string;
        minPrice?: string;
        maxPrice?: string;
        minRating?: string;
    }

    try {
        const whereClause: any = {
            rooms: {
                some: {} //Ensure hotel has at least one room
            }
        }

        if (city) {
            whereClause.city = { contains: city, mode: "insensitive" }
        }

        if (country) {
            whereClause.country = { contains: country, mode: "insensitive" }
        }

        if (minRating) {
            whereClause.rating = { gte: parseFloat(minRating) }
        }

        if (minPrice || maxPrice) {
            const priceFilter: any = {}
            if (minPrice) priceFilter.gte =  parseFloat(minPrice) 

            if (maxPrice) priceFilter.lte =  parseFloat(maxPrice)

            whereClause.rooms = {
                some: {
                    price_per_night: priceFilter
                }
            }
        }

        const hotels = await prisma.hotels.findMany({
            where: whereClause,
            include: {
                rooms: {
                    select: {
                        price_per_night: true
                    }
                }
            }
        });

        const formattedHotels = hotels.map(hotel => {
            const prices = hotel.rooms.map(r => Number(r.price_per_night))
            const minPricePerNight = prices.length > 0 ? Math.min(...prices) : 0;

            return {
                "id": hotel.id,
                "name": hotel.name,
                "description": hotel.description,
                "city": hotel.city,
                "country": hotel.country,
                "amenities": hotel.amenities,
                "rating": Number(hotel.rating),
                "totalReviews": hotel.total_reviews,
                "minPricePerNight": minPricePerNight
            }
        });

        const filteredHotels = formattedHotels.filter(hotel => {
            if (minPrice && hotel.minPricePerNight < parseFloat(minPrice)) {
                return false
            }

            if (maxPrice && hotel.minPricePerNight > parseFloat(maxPrice)) {
                return false
            }

            return true
        })

        return res.status(200).json({
            "success": true,
            "data": filteredHotels,
            "error": null
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            "success": false,
            "data": null,
            "error": "INTERNAL_SERVER_ERROR"
        })
    }
}


export const getHotelById = async (req: Request, res: Response) => {
    const { hotelId } = req.params as { hotelId: string }

    if (!hotelId) {
        return res.status(404).json({
            "success": false,
            "data": null,
            "error": "HOTEL_NOT_FOUND"
        })
    }

    try  {
        const hotel = await prisma.hotels.findFirst({
            where: {
                id: hotelId
            },
            include: {
                rooms: true
            }
        });

        if (!hotel) {
            return res.status(404).json({
                "success": false,
                "data": null,
                "error": "HOTEL_NOT_FOUND"
            })
        }

        const rooms = hotel.rooms.map(r => {
            return {
                "id": r.id,
                "roomNumber": r.room_number,
                "roomType": r.room_type,
                "pricePerNight": Number(r.price_per_night),
                "maxOccupancy": r.max_occupancy
            }
        })

        return res.status(200).json({
            "success": true,
            "data": {
                "id": hotel.id,
                "ownerId": hotel.owner_id,
                "name": hotel.name,
                "description": hotel.description,
                "city": hotel.city,
                "amenities": hotel.amenities,
                "rating": Number(hotel.rating),
                "totalReviews": hotel.total_reviews,
                "rooms": rooms,
            },
            "error": null
        })
    } catch (error) {

        return res.status(404).json({
            "success": false,
            "data": null,
            "error": "HOTEL_NOT_FOUND"
        })
    }
}