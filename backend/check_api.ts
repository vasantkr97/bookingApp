import axios from "axios";

const API_URL = "http://localhost:3000/api";
// We need a token. We'll try to signup a new user.
const email = `verifier_${Date.now()}@example.com`;

async function verify() {
    try {
        console.log("1. Signing up...");
        const signup = await axios.post(`${API_URL}/auth/signup`, {
            name: "Verifier",
            email,
            password: "password",
            role: "owner"
        });
        const token = ""; // Login to get token? Signup doesn't return token usually? 
        // Wait, index.test.ts says signup returns token? No, login does.
        // Let's login.
        
        console.log("2. Logging in...");
        const login = await axios.post(`${API_URL}/auth/login`, {
            email,
            password: "password"
        });
        const authToken = login.data.data.token;
        const headers = { Authorization: `Bearer ${authToken}` };

        // Create Hotel with mixed rooms
        console.log("3. Creating Hotel...");
        const hotel = await axios.post(`${API_URL}/hotels`, {
            name: "Mixed Hotel " + Date.now(),
            city: "TestCity",
            country: "TestCountry",
            amenities: ["wifi"]
        }, { headers });
        const hotelId = hotel.data.data.id;

        // Create Cheap Room (100)
        await axios.post(`${API_URL}/hotels/${hotelId}/rooms`, {
            roomNumber: "101", roomType: "Cheap", pricePerNight: 100, maxOccupancy: 2
        }, { headers });

        // Create Expensive Room (5000)
        await axios.post(`${API_URL}/hotels/${hotelId}/rooms`, {
            roomNumber: "102", roomType: "Lux", pricePerNight: 5000, maxOccupancy: 2
        }, { headers });

        // Test Filter
        console.log("4. Testing Filter minPrice=4000...");
        const res = await axios.get(`${API_URL}/hotels?minPrice=4000`, { headers });
        
        const found = res.data.data.find((h: any) => h.id === hotelId);
        if (found) {
            console.log("FAIL: Hotel found but should be filtered out (minPricePerNight is 100)");
        } else {
            console.log("PASS: Hotel correctly filtered out.");
        }

        console.log("5. Testing Filter minPrice=50...");
        const res2 = await axios.get(`${API_URL}/hotels?minPrice=50`, { headers });
        const found2 = res2.data.data.find((h: any) => h.id === hotelId);
        if (found2) {
             console.log("PASS: Hotel found when minPrice is low.");
             console.log("MinPricePerNight:", found2.minPricePerNight);
        } else {
             console.log("FAIL: Hotel NOT found when minPrice is low.");
        }

    } catch (e: any) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}

verify();
