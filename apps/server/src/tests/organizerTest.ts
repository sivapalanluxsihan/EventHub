import assert from 'node:assert';
import { getDb } from '../database/index.js';

const BASE_URL = 'http://localhost:5000/api';

async function runOrganizerTests() {
  console.log('=== EventHub Organizer Event Management Automated Test Suite ===\n');

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

  // Create temporary test users:
  // 1. Regular USER
  // 2. ORGANIZER A
  // 3. ORGANIZER B
  const timestamp = Date.now();
  const userEmail = `user_${timestamp}@test.com`;
  const orgAEmail = `organizerA_${timestamp}@test.com`;
  const orgBEmail = `organizerB_${timestamp}@test.com`;
  const testPassword = 'Password123!';

  let userToken = '';
  let orgAToken = '';
  let orgBToken = '';
  let testEventId = 0;
  let testEventWithBookingId = 0;

  try {
    // 1. Register USER
    const regUserRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Regular Test User',
        email: userEmail,
        password: testPassword,
        role: 'USER',
      }),
    });
    const regUserData = (await regUserRes.json()) as any;
    userToken = regUserData.token;

    // 2. Register ORGANIZER A and promote to ORGANIZER
    await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Organizer A',
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

    // 3. Register ORGANIZER B and promote to ORGANIZER
    await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Organizer B',
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

    // TEST 1: Unauthenticated create event -> 401
    try {
      const res = await fetch(`${BASE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Unauthorized Event',
          description: 'No token provided',
          date: '2026-12-01',
          time: '10:00 AM',
          location: 'Main Hall',
          category: 'Technology',
          price: 10,
          availableSeats: 50,
        }),
      });
      assert.strictEqual(res.status, 401, 'Expected 401 Unauthorized');
      recordPass('1. Unauthenticated create event rejected (401)');
    } catch (e) {
      recordFail('1. Unauthenticated create event rejected (401)', e);
    }

    // TEST 2: Regular USER create event -> 403 Forbidden
    try {
      const res = await fetch(`${BASE_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          name: 'User Created Event',
          description: 'User should not be able to create events',
          date: '2026-12-01',
          time: '10:00 AM',
          location: 'Main Hall',
          category: 'Technology',
          price: 10,
          availableSeats: 50,
        }),
      });
      assert.strictEqual(res.status, 403, 'Expected 403 Forbidden');
      recordPass('2. Regular USER create event rejected (403)');
    } catch (e) {
      recordFail('2. Regular USER create event rejected (403)', e);
    }

    // TEST 3: ORGANIZER A create event -> 201 Success
    try {
      const res = await fetch(`${BASE_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${orgAToken}`,
        },
        body: JSON.stringify({
          name: 'Campus Robotics Expo 2026',
          image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e',
          description: 'Showcase of cutting-edge autonomous robotics and student innovations.',
          date: '2026-11-20',
          time: '02:00 PM',
          location: 'Engineering Building, Atrium',
          category: 'Technology',
          price: 15.0,
          availableSeats: 100,
        }),
      });
      assert.strictEqual(res.status, 201, 'Expected 201 Created');
      const data = (await res.json()) as any;
      assert.ok(data.event && data.event.id, 'Expected event object with id');
      assert.strictEqual(data.event.name, 'Campus Robotics Expo 2026');
      assert.strictEqual(data.event.availableSeats, 100);
      assert.strictEqual(data.event.price, 15.0);
      testEventId = data.event.id;
      recordPass('3. ORGANIZER create event succeeded (201)');
    } catch (e) {
      recordFail('3. ORGANIZER create event succeeded (201)', e);
    }

    // TEST 4: Invalid event data rejected (400)
    // 4a. Missing name
    try {
      const res = await fetch(`${BASE_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${orgAToken}`,
        },
        body: JSON.stringify({
          description: 'Missing name',
          date: '2026-11-20',
          time: '02:00 PM',
          location: 'Hall',
          category: 'Technology',
          price: 15.0,
          availableSeats: 50,
        }),
      });
      assert.strictEqual(res.status, 400, 'Expected 400 for missing name');
      recordPass('4a. Missing event name rejected (400)');
    } catch (e) {
      recordFail('4a. Missing event name rejected (400)', e);
    }

    // 4b. Invalid date format
    try {
      const res = await fetch(`${BASE_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${orgAToken}`,
        },
        body: JSON.stringify({
          name: 'Bad Date Event',
          description: 'Valid description',
          date: '20-11-2026', // invalid format
          time: '02:00 PM',
          location: 'Hall',
          category: 'Technology',
          price: 15.0,
          availableSeats: 50,
        }),
      });
      assert.strictEqual(res.status, 400, 'Expected 400 for invalid date format');
      recordPass('4b. Invalid date format rejected (400)');
    } catch (e) {
      recordFail('4b. Invalid date format rejected (400)', e);
    }

    // 4c. Negative price
    try {
      const res = await fetch(`${BASE_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${orgAToken}`,
        },
        body: JSON.stringify({
          name: 'Negative Price Event',
          description: 'Valid description',
          date: '2026-11-20',
          time: '02:00 PM',
          location: 'Hall',
          category: 'Technology',
          price: -5.0,
          availableSeats: 50,
        }),
      });
      assert.strictEqual(res.status, 400, 'Expected 400 for negative price');
      recordPass('4c. Negative price rejected (400)');
    } catch (e) {
      recordFail('4c. Negative price rejected (400)', e);
    }

    // 4d. Negative or non-integer availableSeats
    try {
      const res = await fetch(`${BASE_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${orgAToken}`,
        },
        body: JSON.stringify({
          name: 'Invalid Seats Event',
          description: 'Valid description',
          date: '2026-11-20',
          time: '02:00 PM',
          location: 'Hall',
          category: 'Technology',
          price: 10.0,
          availableSeats: 12.5,
        }),
      });
      assert.strictEqual(res.status, 400, 'Expected 400 for non-integer seats');
      recordPass('4d. Non-integer availableSeats rejected (400)');
    } catch (e) {
      recordFail('4d. Non-integer availableSeats rejected (400)', e);
    }

    // TEST 5: Organizer can retrieve own events
    try {
      const res = await fetch(`${BASE_URL}/events/organizer/my-events`, {
        headers: {
          Authorization: `Bearer ${orgAToken}`,
        },
      });
      assert.strictEqual(res.status, 200, 'Expected 200 OK');
      const data = (await res.json()) as any;
      assert.ok(Array.isArray(data.events), 'Expected events array');
      assert.ok(
        data.events.some((e: any) => e.id === testEventId),
        'Expected newly created event in organizer list'
      );
      recordPass('5. Organizer can retrieve own events (200)');
    } catch (e) {
      recordFail('5. Organizer can retrieve own events (200)', e);
    }

    // TEST 6: Organizer cannot see another organizer's events in my-events
    try {
      const res = await fetch(`${BASE_URL}/events/organizer/my-events`, {
        headers: {
          Authorization: `Bearer ${orgBToken}`,
        },
      });
      assert.strictEqual(res.status, 200, 'Expected 200 OK');
      const data = (await res.json()) as any;
      assert.ok(
        !data.events.some((e: any) => e.id === testEventId),
        "Organizer B must not see Organizer A's event in my-events"
      );
      recordPass("6. Organizer does not receive another organizer's events (200)");
    } catch (e) {
      recordFail("6. Organizer does not receive another organizer's events (200)", e);
    }

    // TEST 7: Organizer cannot update another organizer's event (403 Forbidden)
    try {
      const res = await fetch(`${BASE_URL}/events/${testEventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${orgBToken}`,
        },
        body: JSON.stringify({
          name: "Organizer B Trying to Hijack A's Event",
        }),
      });
      assert.strictEqual(res.status, 403, 'Expected 403 Forbidden');
      recordPass("7. Organizer cannot modify another organizer's event (403)");
    } catch (e) {
      recordFail("7. Organizer cannot modify another organizer's event (403)", e);
    }

    // TEST 8: Organizer can update own event (200 OK)
    try {
      const res = await fetch(`${BASE_URL}/events/${testEventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${orgAToken}`,
        },
        body: JSON.stringify({
          name: 'Campus Robotics & AI Expo 2026',
          price: 20.0,
          availableSeats: 120,
        }),
      });
      assert.strictEqual(res.status, 200, 'Expected 200 OK');
      const data = (await res.json()) as any;
      assert.strictEqual(data.event.name, 'Campus Robotics & AI Expo 2026');
      assert.strictEqual(data.event.price, 20.0);
      assert.strictEqual(data.event.availableSeats, 120);
      recordPass('8. Organizer can update own event (200)');
    } catch (e) {
      recordFail('8. Organizer can update own event (200)', e);
    }

    // TEST 9: Updating non-existing event returns 404
    try {
      const res = await fetch(`${BASE_URL}/events/999999`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${orgAToken}`,
        },
        body: JSON.stringify({
          name: 'Non-existing',
        }),
      });
      assert.strictEqual(res.status, 404, 'Expected 404 Not Found');
      recordPass('9. Update non-existing event rejected (404)');
    } catch (e) {
      recordFail('9. Update non-existing event rejected (404)', e);
    }

    // TEST 10: Cannot delete event that has existing bookings (400 Bad Request)
    try {
      // Create an event for Organizer A and book seats for user
      const createRes = await fetch(`${BASE_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${orgAToken}`,
        },
        body: JSON.stringify({
          name: 'Event with Bookings',
          description: 'Cannot be deleted while bookings exist',
          date: '2026-12-10',
          time: '11:00 AM',
          location: 'Hall B',
          category: 'Education',
          price: 5.0,
          availableSeats: 30,
        }),
      });
      const createData = (await createRes.json()) as any;
      testEventWithBookingId = createData.event.id;

      // User books 1 seat
      await fetch(`${BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          eventId: testEventWithBookingId,
          numberOfSeats: 1,
        }),
      });

      // Organizer A tries to delete event with booking
      const delRes = await fetch(`${BASE_URL}/events/${testEventWithBookingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${orgAToken}`,
        },
      });
      assert.strictEqual(delRes.status, 400, 'Expected 400 Bad Request when deleting event with bookings');
      const delData = (await delRes.json()) as any;
      assert.ok(
        delData.error?.toLowerCase().includes('existing bookings') ||
        delData.error?.toLowerCase().includes('reservation'),
        'Expected error message indicating existing bookings'
      );
      recordPass('10. Deletion of event with existing bookings rejected (400)');
    } catch (e) {
      recordFail('10. Deletion of event with existing bookings rejected (400)', e);
    }

    // TEST 11: Organizer cannot delete another organizer's event (403 Forbidden)
    try {
      const res = await fetch(`${BASE_URL}/events/${testEventId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${orgBToken}`,
        },
      });
      assert.strictEqual(res.status, 403, 'Expected 403 Forbidden');
      recordPass("11. Organizer cannot delete another organizer's event (403)");
    } catch (e) {
      recordFail("11. Organizer cannot delete another organizer's event (403)", e);
    }

    // TEST 12: Organizer can delete eligible event without bookings (200 OK)
    try {
      const res = await fetch(`${BASE_URL}/events/${testEventId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${orgAToken}`,
        },
      });
      assert.strictEqual(res.status, 200, 'Expected 200 OK');
      const checkRes = await fetch(`${BASE_URL}/events/${testEventId}`);
      assert.strictEqual(checkRes.status, 404, 'Deleted event should now return 404');
      recordPass('12. Organizer can delete eligible event without bookings (200)');
    } catch (e) {
      recordFail('12. Organizer can delete eligible event without bookings (200)', e);
    }

    // TEST 13: Deleting non-existing event returns 404
    try {
      const res = await fetch(`${BASE_URL}/events/999999`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${orgAToken}`,
        },
      });
      assert.strictEqual(res.status, 404, 'Expected 404 Not Found');
      recordPass('13. Deleting non-existing event rejected (404)');
    } catch (e) {
      recordFail('13. Deleting non-existing event rejected (404)', e);
    }

    // TEST 14: Public events API still works without regressions
    try {
      const res = await fetch(`${BASE_URL}/events`);
      assert.strictEqual(res.status, 200, 'Expected 200 OK');
      const data = (await res.json()) as any;
      assert.ok(Array.isArray(data.events) && data.events.length > 0, 'Expected public events');
      recordPass('14. Public events API continues working regression-free (200)');
    } catch (e) {
      recordFail('14. Public events API continues working regression-free (200)', e);
    }

  } finally {
    // Cleanup temporary test data
    if (testEventWithBookingId) {
      db.prepare('DELETE FROM bookings WHERE eventId = ?').run(testEventWithBookingId);
      db.prepare('DELETE FROM events WHERE id = ?').run(testEventWithBookingId);
    }
    if (testEventId) {
      db.prepare('DELETE FROM bookings WHERE eventId = ?').run(testEventId);
      db.prepare('DELETE FROM events WHERE id = ?').run(testEventId);
    }
    db.prepare('DELETE FROM users WHERE email IN (?, ?, ?)').run(userEmail, orgAEmail, orgBEmail);
    console.log('\n[Cleanup] Temporary test users and events removed.');
  }

  console.log(`\n=== Organizer Test Result: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runOrganizerTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
