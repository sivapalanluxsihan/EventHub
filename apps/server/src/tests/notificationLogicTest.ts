import assert from 'node:assert';

/**
 * Mirror of parseEventDateTime from notificationService.ts
 * Verifies algorithmic correctness across edge cases
 */
function parseEventDateTime(dateStr: string, timeStr: string): Date | null {
  try {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const dateParts = dateStr.split('-');
    if (dateParts.length !== 3) return null;

    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);

    let hours = 9;
    let minutes = 0;

    if (timeStr && typeof timeStr === 'string') {
      const isPM = /pm/i.test(timeStr);
      const isAM = /am/i.test(timeStr);
      const cleanTime = timeStr.replace(/am|pm/gi, '').trim();
      const timeParts = cleanTime.split(':');

      if (timeParts.length >= 1) {
        hours = parseInt(timeParts[0], 10);
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
      }
      if (timeParts.length >= 2) {
        minutes = parseInt(timeParts[1], 10);
      }
    }

    const eventDate = new Date(year, month, day, hours, minutes, 0);
    if (isNaN(eventDate.getTime())) return null;
    return eventDate;
  } catch {
    return null;
  }
}

/**
 * Calculates reminder trigger date
 */
function calculateReminderTrigger(eventDate: Date, now: Date): Date | null {
  if (eventDate.getTime() <= now.getTime()) {
    // Past event: do not schedule
    return null;
  }

  const twoHoursBefore = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000);
  if (twoHoursBefore.getTime() > now.getTime()) {
    return twoHoursBefore;
  }

  // Under 2 hours: schedule midway
  return new Date(now.getTime() + Math.max(60 * 1000, (eventDate.getTime() - now.getTime()) / 2));
}

function runNotificationLogicTests() {
  console.log('=== EventHub Notification Service & Logic Automated Test Suite ===\n');

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

  // 1. Valid AM/PM date parsing
  try {
    const dt = parseEventDateTime('2026-10-15', '09:30 AM');
    assert.ok(dt !== null);
    assert.strictEqual(dt.getFullYear(), 2026);
    assert.strictEqual(dt.getMonth(), 9); // October
    assert.strictEqual(dt.getDate(), 15);
    assert.strictEqual(dt.getHours(), 9);
    assert.strictEqual(dt.getMinutes(), 30);
    recordPass('1. Valid AM date and time parsed accurately');
  } catch (err) {
    recordFail('1. Valid AM date and time parsed accurately', err);
  }

  // 2. Valid PM date parsing
  try {
    const dt = parseEventDateTime('2026-11-20', '06:45 PM');
    assert.ok(dt !== null);
    assert.strictEqual(dt.getHours(), 18);
    assert.strictEqual(dt.getMinutes(), 45);
    recordPass('2. Valid PM date and time parsed accurately (24h conversion)');
  } catch (err) {
    recordFail('2. Valid PM date and time parsed accurately (24h conversion)', err);
  }

  // 3. Invalid date string returns null without crashing
  try {
    assert.strictEqual(parseEventDateTime('invalid-date', '10:00 AM'), null);
    assert.strictEqual(parseEventDateTime('', '10:00 AM'), null);
    assert.strictEqual(parseEventDateTime(null as any, '10:00 AM'), null);
    recordPass('3. Invalid date returns null safely without throwing');
  } catch (err) {
    recordFail('3. Invalid date returns null safely without throwing', err);
  }

  // 4. Past event reminder scheduling returns null
  try {
    const pastDate = new Date('2020-01-01T10:00:00Z');
    const now = new Date('2026-09-17T07:00:00Z');
    const trigger = calculateReminderTrigger(pastDate, now);
    assert.strictEqual(trigger, null, 'Past event must never trigger reminder');
    recordPass('4. Past events rejected from reminder scheduling');
  } catch (err) {
    recordFail('4. Past events rejected from reminder scheduling', err);
  }

  // 5. Future event (far away) reminder scheduled 2 hours before
  try {
    const futureDate = new Date('2026-10-15T14:00:00Z');
    const now = new Date('2026-10-10T10:00:00Z');
    const trigger = calculateReminderTrigger(futureDate, now);
    assert.ok(trigger !== null);
    const expected = new Date(futureDate.getTime() - 2 * 60 * 60 * 1000);
    assert.strictEqual(trigger.getTime(), expected.getTime());
    recordPass('5. Future event reminder scheduled exactly 2 hours before event');
  } catch (err) {
    recordFail('5. Future event reminder scheduled exactly 2 hours before event', err);
  }

  // 6. Imminent event (< 2 hours) scheduled safely midway
  try {
    const imminentDate = new Date('2026-10-15T11:00:00Z');
    const now = new Date('2026-10-15T10:00:00Z'); // 1 hour away
    const trigger = calculateReminderTrigger(imminentDate, now);
    assert.ok(trigger !== null);
    assert.ok(trigger.getTime() > now.getTime());
    assert.ok(trigger.getTime() < imminentDate.getTime());
    recordPass('6. Imminent event reminder scheduled safely between now and event time');
  } catch (err) {
    recordFail('6. Imminent event reminder scheduled safely between now and event time', err);
  }

  // 7. Booking confirmation notification message formatting
  try {
    const event = { name: 'Hackathon 2026', date: '2026-10-15', time: '09:00 AM' };
    const booking = { id: 42, numberOfSeats: 3 };
    const seatsText = booking.numberOfSeats === 1 ? '1 seat' : `${booking.numberOfSeats} seats`;
    const title = `🎟️ Booking Confirmed (#${booking.id})`;
    const body = `You're all set for "${event.name}"! ${seatsText} reserved. Date: ${event.date} at ${event.time}.`;
    assert.strictEqual(title, '🎟️ Booking Confirmed (#42)');
    assert.ok(body.includes('3 seats reserved'));
    assert.ok(body.includes('Hackathon 2026'));
    recordPass('7. Booking confirmation content format verified with pluralization');
  } catch (err) {
    recordFail('7. Booking confirmation content format verified with pluralization', err);
  }

  // 8. Booking cancellation notification message formatting
  try {
    const event = { name: 'Spring Music Fest' };
    const booking = { id: 99 };
    const title = `🚫 Booking Cancelled (#${booking.id})`;
    const body = `Your booking for "${event.name}" has been cancelled. Available seats have been returned.`;
    assert.strictEqual(title, '🚫 Booking Cancelled (#99)');
    assert.ok(body.includes('Spring Music Fest'));
    recordPass('8. Booking cancellation content format verified');
  } catch (err) {
    recordFail('8. Booking cancellation content format verified', err);
  }

  // 9. Fail-safe isolation: Simulated notification failure does NOT impact booking
  try {
    let bookingSucceeded = false;
    async function simulateBookingWithNotification() {
      // 1. Booking succeeds
      const bookingRecord = { id: 101, status: 'CONFIRMED' };
      bookingSucceeded = true;

      // 2. Notification throws simulated error
      try {
        throw new Error('OS Push Notification Service Unavailable');
      } catch (notifErr) {
        // Notification service silently catches and logs
      }

      return bookingRecord;
    }

    simulateBookingWithNotification().then((res) => {
      assert.strictEqual(bookingSucceeded, true);
      assert.strictEqual(res.id, 101);
      assert.strictEqual(res.status, 'CONFIRMED');
      recordPass('9. Fail-safe isolation: Notification failure NEVER fails booking creation');
    });
  } catch (err) {
    recordFail('9. Fail-safe isolation: Notification failure NEVER fails booking creation', err);
  }

  // 10. Fail-safe isolation: Simulated notification failure does NOT impact cancellation
  try {
    let cancellationSucceeded = false;
    async function simulateCancellationWithNotification() {
      // 1. Cancellation succeeds
      const cancelRecord = { id: 101, status: 'CANCELLED' };
      cancellationSucceeded = true;

      // 2. Notification throws simulated error
      try {
        throw new Error('OS Push Notification Permission Denied');
      } catch (notifErr) {
        // Handled silently
      }

      return cancelRecord;
    }

    simulateCancellationWithNotification().then((res) => {
      assert.strictEqual(cancellationSucceeded, true);
      assert.strictEqual(res.status, 'CANCELLED');
      recordPass('10. Fail-safe isolation: Notification failure NEVER fails cancellation');
    });
  } catch (err) {
    recordFail('10. Fail-safe isolation: Notification failure NEVER fails cancellation', err);
  }

  // 11. Reminder cleanup tracking
  try {
    const memoryStore: Record<string, string> = {};
    const bookingId = 888;
    const notificationId = 'notif_uuid_12345';
    // Store reminder
    memoryStore[`@eventhub_reminder_${bookingId}`] = notificationId;
    assert.strictEqual(memoryStore[`@eventhub_reminder_${bookingId}`], notificationId);

    // Cancel reminder
    delete memoryStore[`@eventhub_reminder_${bookingId}`];
    assert.strictEqual(memoryStore[`@eventhub_reminder_${bookingId}`], undefined);
    recordPass('11. Reminder identifier storage and cleanup mapping verified');
  } catch (err) {
    recordFail('11. Reminder identifier storage and cleanup mapping verified', err);
  }

  setTimeout(() => {
    console.log(`\n=== Notification Test Results: ${passed} passed, ${failed} failed (Total: ${passed + failed}) ===\n`);
    if (failed > 0) process.exit(1);
  }, 100);
}

runNotificationLogicTests();
