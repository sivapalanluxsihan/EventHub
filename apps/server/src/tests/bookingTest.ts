import { getDb } from '../database/index.js';

const BASE_URL = 'http://localhost:5000/api';

async function runBookingTests() {
  console.log('=== EventHub Booking Automated Test Suite (20 Tests) ===\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  };

  const db = getDb();

  // Setup test users
  const timestamp = Date.now();
  const userAEmail = `studentA_${timestamp}@eventhub.test`;
  const userBEmail = `studentB_${timestamp}@eventhub.test`;
  const testPassword = 'TestPassword123!';

  let tokenA = '';
  let tokenB = '';
  let userAId = 0;
  let userBId = 0;

  // Register User A
  const regARes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Student A', email: userAEmail, password: testPassword }),
  });
  const regAData = (await regARes.json()) as any;
  tokenA = regAData.token;
  userAId = regAData.user.id;

  // Register User B
  const regBRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Student B', email: userBEmail, password: testPassword }),
  });
  const regBData = (await regBRes.json()) as any;
  tokenB = regBData.token;
  userBId = regBData.user.id;

  // Create temporary test event (10 seats)
  const createEventStmt = db.prepare(`
    INSERT INTO events (organizerId, name, description, date, time, location, category, price, availableSeats)
    VALUES (?, 'Automated Test Event', 'For booking verification', '2026-12-01', '10:00 AM', 'Room 101', 'Technology', 15.0, 10)
  `);
  const eventInsert = createEventStmt.run(userAId);
  const testEventId = Number(eventInsert.lastInsertRowid);

  let bookingAId = 0;

  try {
    // 1. Authenticated user can create booking
    const res1 = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ eventId: testEventId, numberOfSeats: 3 }),
    });
    const data1 = (await res1.json()) as any;
    bookingAId = data1.booking?.id;
    assert(
      res1.status === 201 && data1.booking && data1.booking.numberOfSeats === 3 && data1.booking.status === 'CONFIRMED',
      '1. Authenticated user can create booking',
      JSON.stringify(data1)
    );

    // 2. Unauthenticated user cannot create booking
    const res2 = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: testEventId, numberOfSeats: 1 }),
    });
    assert(res2.status === 401, '2. Unauthenticated user cannot create booking (401)');

    // 3. Missing eventId rejected
    const res3 = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ numberOfSeats: 1 }),
    });
    assert(res3.status === 400, '3. Missing eventId rejected (400)');

    // 4. Invalid eventId rejected
    const res4 = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ eventId: 'invalid-id', numberOfSeats: 1 }),
    });
    assert(res4.status === 400, '4. Invalid eventId rejected (400)');

    // 5. Invalid numberOfSeats rejected
    const res5 = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ eventId: testEventId, numberOfSeats: 'two' }),
    });
    assert(res5.status === 400, '5. Invalid numberOfSeats rejected (400)');

    // 6. Zero seats rejected
    const res6 = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ eventId: testEventId, numberOfSeats: 0 }),
    });
    assert(res6.status === 400, '6. Zero seats rejected (400)');

    // 7. Negative seats rejected
    const res7 = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ eventId: testEventId, numberOfSeats: -2 }),
    });
    assert(res7.status === 400, '7. Negative seats rejected (400)');

    // 8. Non-integer seats rejected
    const res8 = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ eventId: testEventId, numberOfSeats: 1.5 }),
    });
    assert(res8.status === 400, '8. Non-integer seats rejected (400)');

    // 9. Non-existing event rejected (404)
    const res9 = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ eventId: 999999, numberOfSeats: 1 }),
    });
    assert(res9.status === 404, '9. Non-existing event rejected (404)');

    // 10. Booking exceeding available seats rejected (testEvent has 10 - 3 = 7 seats left)
    const res10 = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ eventId: testEventId, numberOfSeats: 8 }),
    });
    const data10 = (await res10.json()) as any;
    assert(
      res10.status === 400 && data10.error?.toLowerCase().includes('not enough seats'),
      '10. Booking exceeding available seats rejected (400 Not enough seats available)',
      JSON.stringify(data10)
    );

    // 11. Successful booking creates database record
    const dbBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingAId) as any;
    assert(
      dbBooking && dbBooking.userId === userAId && dbBooking.eventId === testEventId && dbBooking.numberOfSeats === 3 && dbBooking.status === 'CONFIRMED',
      '11. Successful booking creates database record'
    );

    // 12. Successful booking decreases availableSeats (10 - 3 = 7)
    const dbEventAfterBooking = db.prepare('SELECT availableSeats FROM events WHERE id = ?').get(testEventId) as any;
    assert(
      dbEventAfterBooking && dbEventAfterBooking.availableSeats === 7,
      '12. Successful booking decreases availableSeats from 10 to 7'
    );

    // 13. User can retrieve own bookings
    const res13 = await fetch(`${BASE_URL}/bookings`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data13 = (await res13.json()) as any;
    assert(
      res13.status === 200 && Array.isArray(data13.bookings) && data13.bookings.some((b: any) => b.id === bookingAId),
      '13. User can retrieve own bookings with event information'
    );

    // 14. User cannot retrieve another user's booking in listing
    const res14 = await fetch(`${BASE_URL}/bookings`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const data14 = (await res14.json()) as any;
    assert(
      res14.status === 200 && Array.isArray(data14.bookings) && !data14.bookings.some((b: any) => b.id === bookingAId),
      "14. User cannot retrieve another user's booking in bookings list"
    );

    // 15. User cannot access another user's booking by ID (403 Forbidden)
    const res15 = await fetch(`${BASE_URL}/bookings/${bookingAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(res15.status === 403, "15. User cannot access another user's booking by ID (403 Forbidden)");

    // 16. User can cancel own confirmed booking
    const res16 = await fetch(`${BASE_URL}/bookings/${bookingAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data16 = (await res16.json()) as any;
    assert(
      res16.status === 200 && data16.booking?.status === 'CANCELLED',
      '16. User can cancel own confirmed booking'
    );

    // 17. Cancellation changes status to CANCELLED in database
    const dbBookingAfterCancel = db.prepare('SELECT status FROM bookings WHERE id = ?').get(bookingAId) as any;
    assert(
      dbBookingAfterCancel && dbBookingAfterCancel.status === 'CANCELLED',
      '17. Cancellation changes status to CANCELLED in database'
    );

    // 18. Cancellation restores availableSeats (7 + 3 = 10)
    const dbEventAfterCancel = db.prepare('SELECT availableSeats FROM events WHERE id = ?').get(testEventId) as any;
    assert(
      dbEventAfterCancel && dbEventAfterCancel.availableSeats === 10,
      '18. Cancellation restores availableSeats back to 10'
    );

    // 19. Cancelled booking cannot be cancelled twice
    const res19 = await fetch(`${BASE_URL}/bookings/${bookingAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(res19.status === 400, '19. Cancelled booking cannot be cancelled twice (400)');

    // 20. Database remains consistent after failed transaction (rollback verification)
    const beforeFailedCount = (db.prepare('SELECT COUNT(*) as count FROM bookings WHERE eventId = ?').get(testEventId) as any).count;
    const res20 = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ eventId: testEventId, numberOfSeats: 999 }), // Exceeds 10 seats
    });
    const dbEventAfterFailed = db.prepare('SELECT availableSeats FROM events WHERE id = ?').get(testEventId) as any;
    const afterFailedCount = (db.prepare('SELECT COUNT(*) as count FROM bookings WHERE eventId = ?').get(testEventId) as any).count;

    assert(
      res20.status === 400 &&
      dbEventAfterFailed.availableSeats === 10 &&
      afterFailedCount === beforeFailedCount,
      '20. Database remains consistent after failed transaction (seats and bookings unchanged)'
    );

  } finally {
    // Cleanup temporary test data
    db.prepare('DELETE FROM bookings WHERE eventId = ?').run(testEventId);
    db.prepare('DELETE FROM events WHERE id = ?').run(testEventId);
    db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(userAId, userBId);
    console.log('\n[Cleanup] Temporary test users, bookings, and event removed.');
  }

  console.log(`\n=== Verification Result: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runBookingTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
