
const checkCancellation = (checkInDateStr, nowStr) => {
    const now = new Date(nowStr);
    const checkIn = new Date(checkInDateStr);
    const diff = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);

    console.log(`Now: ${now.toISOString()}, CheckIn: ${checkIn.toISOString()}`);
    console.log(`Diff (hours): ${diff}`);

    if (diff < 24) {
        console.log("Result: CANCELLATION_DEADLINE_PASSED");
    } else {
        console.log("Result: ALLOWED");
    }
    console.log('---');
};

console.log("Testing Cancellation Logic:\n");

// Case 1: > 24 hours (e.g. 25 hours)
checkCancellation("2026-02-01T10:00:00Z", "2026-01-31T09:00:00Z");

// Case 2: < 24 hours (e.g. 23 hours)
checkCancellation("2026-02-01T10:00:00Z", "2026-01-31T11:00:00Z");

// Case 3: Exact 24 hours
checkCancellation("2026-02-01T10:00:00Z", "2026-01-31T10:00:00Z");

// Case 4: Past check-in
checkCancellation("2026-02-01T10:00:00Z", "2026-02-01T11:00:00Z");

// Case 5: Timezone offset issues (local vs UTC)
// Simulating typical issue where checkIn might be stored as midnight UTC
// and now is mid-day local.
const tomorrowZero = new Date();
tomorrowZero.setDate(tomorrowZero.getDate() + 1);
tomorrowZero.setHours(0, 0, 0, 0);

const now = new Date();
// If now is, say, 10 PM tonight. And checkIn is tomorrow midnight. Diff is 2 hours.
// If checkin is "tomorrow" date only, typically means 00:00 UTC? or Local?
