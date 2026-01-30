import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import * as auth from "./routes/auth"
import * as hotels from "./routes/hotels"
import * as bookings from "./routes/bookings"
import { authentication, authorize } from "./middleware"
import { createNewBooking } from "./routes/bookings"

const app = express()

app.use(express.json())
app.use(cookieParser())

app.use(cors({
    origin: ['http://localhost:5173']
}))

app.post("/api/auth/signup", auth.signup);
app.post('/api/auth/login', auth.login);

//only owner
app.post("/api/hotels", authentication, authorize(["owner"]), hotels.createHotel)
app.post("/api/hotels/:hotelId/rooms", authentication, authorize(['owner']), hotels.addRoomToHotel)
app.get("/api/hotels", authentication, hotels.getHotels)
app.get("/api/hotels/:hotelId", authentication, hotels.getHotelById)

//bookings
app.post("/api/bookings", authentication, authorize(["customer"]), bookings.createNewBooking)
app.get("/api/bookings", authentication, authorize(["customer"]), bookings.getAllBooking)
app.put("/api/bookings/:bookingId/cancel", authentication, authorize(["customer"]), bookings.cancelBooking)

//review
app.post("/api/reviews", authentication, authorize(["customer"]), bookings.reviews)

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`server is running at http://localhost:${PORT}`)
})
