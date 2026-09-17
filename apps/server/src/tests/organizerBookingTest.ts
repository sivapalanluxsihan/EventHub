import assert from 'node:assert';
import { getDb } from '../database/index.js';

const BASE_URL = 'http://localhost:5000/api';

async function runOrganizerBookingTests() {
  console.log('=== EventHub Organizer Booking Management Automated Test Suite ===\n');

  let passed = 0;
  let failed = 0;

  function recordPass(testName: string) {
    console.log(`[PASS] ${testName}`);
    passed++;
  }

  function recordFail(testName: string, err: any) {
    console.error(`[FAIL] ${testName}:`, err);
    failed++;
  }

  const db = getDb();
  const timestamp = Date.now();
  const userEmail = `booking_user_${timestamp}@test.com`;
  const orgAEmail = `orgA_booking_${timestamp}@test.com`;
  const orgBEmail = `orgB_booking_${timestamp}@test.com`;
  const testPassword = 'Password123!';

  let userToken = '';
  let orgAToken = '';
  let orgBToken = '';
  let eventWithNoBookingsId = 0;
  let eventWithBookingsId = 0;
  let orgBEventId = 0;
  let confirmedBookingId = 0;
  let cancelledBookingId = 0;

  try {
    // 1. Register normal USER
    const regUserRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Attendee',
        email: userEmail,
        password: testPassword,
      }),
    });
    const regUserData = (await regUserRes.json()) as any;
    userToken = regUserData.token;

    // 2. Register ORGANIZER A
    await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Organizer Alice',
        email: orgAEmail,
        password: testPassword,
      }),
    });
    db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE LOWER(email) = LOWER(?)").run(orgAEmail);
    const loginARes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: orgAEmail, password: testPassword }),
    });
    const loginAData = (await loginARes.json()) as any;
    orgAToken = loginAData.token;

    // 3. Register ORGANIZER B
    await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Organizer Bob',
        email: orgBEmail,
        password: testPassword,
      }),
    });
    db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE LOWER(email) = LOWER(?)").run(orgBEmail);
    const loginBRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: orgBEmail, password: testPassword }),
    });
    const loginBData = (await loginBRes.json()) as any;
    orgBToken = loginBData.token;

    // Setup events:
    // Event 1 (Org A, no bookings)
    const createEv1Res = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${orgAToken}`,
      },
      body: JSON.stringify({
        name: 'Empty Bookings Event',
        description: 'An event without any bookings',
        date: '2026-11-20',
        time: '10:00 AM',
        location: 'Hall A',
        category: 'Technology',
        price: 15,
        availableSeats: 50,
      }),
    });
    const ev1Data = (await createEv1Res.json()) as any;
    eventWithNoBookingsId = ev1Data.event.id;

    // Event 2 (Org A, will have bookings)
    const createEv2Res = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${orgAToken}`,
      },
      body: JSON.stringify({
        name: 'Active Booking Showcase',
        description: 'Event with confirmed and cancelled bookings',
        date: '2026-11-25',
        time: '02:00 PM',
        location: 'Auditorium 1',
        category: 'Business',
        price: 25,
        availableSeats: 100,
      }),
    });
    const ev2Data = (await createEv2Res.json()) as any;
    eventWithBookingsId = ev2Data.event.id;

    // Event 3 (Org B)
    const createEv3Res = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${orgBToken}`,
      },
      body: JSON.stringify({
        name: 'Org B Exclusive Workshop',
        description: 'Owned by Organizer B',
        date: '2026-12-01',
        time: '09:00 AM',
        location: 'Studio 4',
        category: 'Design',
        price: 30,
        availableSeats: 25,
      }),
    });
    const ev3Data = (await createEv3Res.json()) as any;
    orgBEventId = ev3Data.event.id;

    // Create 2 bookings for Event 2 by User:
    // Booking 1: 3 seats (will remain CONFIRMED)
    const b1Res = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ eventId: eventWithBookingsId, numberOfSeats: 3 }),
    });
    const b1Data = (await b1Res.json()) as any;
    confirmedBookingId = b1Data.booking.id;

    // Booking 2: 2 seats (will be CANCELLED)
    const b2Res = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ eventId: eventWithBookingsId, numberOfSeats: 2 }),
    });
    const b2Data = (await b2Res.json()) as any;
    cancelledBookingId = b2Data.booking.id;

    // Cancel Booking 2
    await fetch(`${BASE_URL}/bookings/${cancelledBookingId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    });

    // -------------------------------------------------------------
    // TEST 1: Unauthenticated request -> 401
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/organizer/events/${eventWithBookingsId}/bookings`);
      assert.strictEqual(res.status, 401, 'Unauthenticated request must return 401');
      recordPass('1. Unauthenticated request -> 401');
    } catch (err) {
      recordFail('1. Unauthenticated request -> 401', err);
    }

    // -------------------------------------------------------------
    // TEST 2: USER role access -> 403
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/organizer/events/${eventWithBookingsId}/bookings`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.strictEqual(res.status, 403, 'Normal USER must receive 403');
      recordPass('2. USER role -> 403 Forbidden');
    } catch (err) {
      recordFail('2. USER role -> 403 Forbidden', err);
    }

    // -------------------------------------------------------------
    // TEST 3: Organizer accessing own event bookings -> 200
    // -------------------------------------------------------------
    let ownEventData: any = null;
    try {
      const res = await fetch(`${BASE_URL}/organizer/events/${eventWithBookingsId}/bookings`, {
        headers: { Authorization: `Bearer ${orgAToken}` },
      });
      assert.strictEqual(res.status, 200, 'Organizer viewing own event must return 200');
      ownEventData = await res.json();
      assert.ok(ownEventData.event, 'Response must include event info');
      assert.ok(Array.isArray(ownEventData.bookings), 'Response must include bookings array');
      recordPass('3. Organizer own event -> 200 OK');
    } catch (err) {
      recordFail('3. Organizer own event -> 200 OK', err);
    }

    // -------------------------------------------------------------
    // TEST 4: Organizer accessing other organizer event -> 403
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/organizer/events/${orgBEventId}/bookings`, {
        headers: { Authorization: `Bearer ${orgAToken}` },
      });
      assert.strictEqual(res.status, 403, 'Organizer viewing another organizer event must return 403');
      recordPass('4. Organizer other organizer event -> 403 Forbidden');
    } catch (err) {
      recordFail('4. Organizer other organizer event -> 403 Forbidden', err);
    }

    // -------------------------------------------------------------
    // TEST 5: Nonexistent event -> 404
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/organizer/events/999999/bookings`, {
        headers: { Authorization: `Bearer ${orgAToken}` },
      });
      assert.strictEqual(res.status, 404, 'Nonexistent event must return 404');
      recordPass('5. Nonexistent event -> 404 Not Found');
    } catch (err) {
      recordFail('5. Nonexistent event -> 404 Not Found', err);
    }

    // -------------------------------------------------------------
    // TEST 6: Event with no bookings -> 200 with empty bookings array
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/organizer/events/${eventWithNoBookingsId}/bookings`, {
        headers: { Authorization: `Bearer ${orgAToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as any;
      assert.strictEqual(data.bookings.length, 0, 'Bookings list should be empty');
      recordPass('6. No bookings -> successful empty result []');
    } catch (err) {
      recordFail('6. No bookings -> successful empty result []', err);
    }

    // -------------------------------------------------------------
    // TEST 7: Confirmed booking returned
    // -------------------------------------------------------------
    try {
      const confirmed = ownEventData?.bookings.find((b: any) => b.id === confirmedBookingId);
      assert.ok(confirmed, 'Confirmed booking should exist in response');
      assert.strictEqual(confirmed.status, 'CONFIRMED');
      recordPass('7. Confirmed booking returned with status CONFIRMED');
    } catch (err) {
      recordFail('7. Confirmed booking returned with status CONFIRMED', err);
    }

    // -------------------------------------------------------------
    // TEST 8: Cancelled booking returned
    // -------------------------------------------------------------
    try {
      const cancelled = ownEventData?.bookings.find((b: any) => b.id === cancelledBookingId);
      assert.ok(cancelled, 'Cancelled booking should exist in response');
      assert.strictEqual(cancelled.status, 'CANCELLED');
      recordPass('8. Cancelled booking returned with status CANCELLED');
    } catch (err) {
      recordFail('8. Cancelled booking returned with status CANCELLED', err);
    }

    // -------------------------------------------------------------
    // TEST 9: Customer name returned
    // -------------------------------------------------------------
    try {
      const confirmed = ownEventData?.bookings.find((b: any) => b.id === confirmedBookingId);
      assert.strictEqual(confirmed.customerName, 'Alice Attendee');
      recordPass('9. Customer name returned accurately');
    } catch (err) {
      recordFail('9. Customer name returned accurately', err);
    }

    // -------------------------------------------------------------
    // TEST 10: Customer email returned
    // -------------------------------------------------------------
    try {
      const confirmed = ownEventData?.bookings.find((b: any) => b.id === confirmedBookingId);
      assert.strictEqual(confirmed.customerEmail, userEmail);
      recordPass('10. Customer email returned accurately');
    } catch (err) {
      recordFail('10. Customer email returned accurately', err);
    }

    // -------------------------------------------------------------
    // TEST 11: Seat count correct per booking
    // -------------------------------------------------------------
    try {
      const confirmed = ownEventData?.bookings.find((b: any) => b.id === confirmedBookingId);
      const cancelled = ownEventData?.bookings.find((b: any) => b.id === cancelledBookingId);
      assert.strictEqual(confirmed.numberOfSeats, 3, 'Confirmed booking should have 3 seats');
      assert.strictEqual(cancelled.numberOfSeats, 2, 'Cancelled booking should have 2 seats');
      recordPass('11. Seat count correct per booking');
    } catch (err) {
      recordFail('11. Seat count correct per booking', err);
    }

    // -------------------------------------------------------------
    // TEST 12: Confirmed seat total calculation accuracy
    // -------------------------------------------------------------
    try {
      const confirmedSeats = ownEventData?.bookings
        .filter((b: any) => b.status === 'CONFIRMED')
        .reduce((sum: number, b: any) => sum + b.numberOfSeats, 0);
      assert.strictEqual(confirmedSeats, 3, 'Confirmed seats total must equal exactly 3 (excluding cancelled)');
      recordPass('12. Confirmed seat total calculation correct (excludes cancelled)');
    } catch (err) {
      recordFail('12. Confirmed seat total calculation correct (excludes cancelled)', err);
    }

    // -------------------------------------------------------------
    // TEST 13: Security check: No password or passwordHash returned
    // -------------------------------------------------------------
    try {
      const rawString = JSON.stringify(ownEventData);
      assert.strictEqual(rawString.includes('passwordHash'), false, 'passwordHash must never be exposed');
      assert.strictEqual(rawString.includes('password'), false, 'password must never be exposed');
      recordPass('13. No password/passwordHash exposed in payload');
    } catch (err) {
      recordFail('13. No password/passwordHash exposed in payload', err);
    }

  } catch (globalErr) {
    console.error('Unexpected error during organizer booking test suite:', globalErr);
  } finally {
    // Cleanup created test records
    try {
      db.prepare('DELETE FROM bookings WHERE eventId IN (?, ?, ?)').run(
        eventWithNoBookingsId,
        eventWithBookingsId,
        orgBEventId
      );
      db.prepare('DELETE FROM events WHERE id IN (?, ?, ?)').run(
        eventWithNoBookingsId,
        eventWithBookingsId,
        orgBEventId
      );
      db.prepare('DELETE FROM users WHERE email IN (?, ?, ?)').run(
        userEmail,
        orgAEmail,
        orgBEmail
      );
    } catch (cleanErr) {
      console.error('Cleanup error:', cleanErr);
    }
  }

  console.log(`\n=== Test Results: ${passed} passed, ${failed} failed (Total: ${passed + failed}) ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runOrganizerBookingTests();
