async function runTests() {
  const baseUrl = 'http://localhost:5000/api';
  console.log('--- STARTING EVENT API TESTS ---');

  // Test 1: GET /api/events
  const res1 = await fetch(`${baseUrl}/events`);
  const data1 = await res1.json();
  console.log('Test 1 (GET /api/events): status =', res1.status, 'count =', data1.events?.length);
  if (res1.status !== 200 || !Array.isArray(data1.events) || data1.events.length !== 5) {
    throw new Error('Test 1 Failed');
  }

  // Check event structure
  const first = data1.events[0];
  const requiredKeys = ['id', 'name', 'image', 'description', 'date', 'time', 'location', 'category', 'price', 'availableSeats'];
  for (const k of requiredKeys) {
    if (!(k in first)) throw new Error(`Missing key ${k} in event`);
  }
  if ('passwordHash' in first || 'password' in first) {
    throw new Error('Sensitive field leaked in event payload');
  }
  console.log('Event fields verification: PASS');

  // Test 2: Search (case-insensitive)
  const res2 = await fetch(`${baseUrl}/events?search=technology`);
  const data2 = await res2.json();
  console.log('Test 2 (Search "technology"): status =', res2.status, 'count =', data2.events?.length);
  if (res2.status !== 200 || data2.events.length === 0) throw new Error('Test 2 Failed');

  // Test 2b: Search upper case
  const res2b = await fetch(`${baseUrl}/events?search=HACKATHON`);
  const data2b = await res2b.json();
  console.log('Test 2b (Search "HACKATHON"): status =', res2b.status, 'count =', data2b.events?.length);
  if (res2b.status !== 200 || data2b.events.length !== 1) throw new Error('Test 2b Failed');

  // Test 3: Category filter
  const res3 = await fetch(`${baseUrl}/events?category=Sports`);
  const data3 = await res3.json();
  console.log('Test 3 (Category "Sports"): status =', res3.status, 'count =', data3.events?.length);
  if (res3.status !== 200 || data3.events.length !== 1 || data3.events[0].category !== 'Sports') throw new Error('Test 3 Failed');

  // Test 3b: Category lowercase
  const res3b = await fetch(`${baseUrl}/events?category=sports`);
  const data3b = await res3b.json();
  console.log('Test 3b (Category lowercase "sports"): status =', res3b.status, 'count =', data3b.events?.length);
  if (res3b.status !== 200 || data3b.events.length !== 1) throw new Error('Test 3b Failed');

  // Test 4: Search + Category combined
  const res4 = await fetch(`${baseUrl}/events?search=campus&category=Music`);
  const data4 = await res4.json();
  console.log('Test 4 (Combined search="campus" & category="Music"): status =', res4.status, 'count =', data4.events?.length);
  if (res4.status !== 200 || data4.events.length !== 1) throw new Error('Test 4 Failed');

  // Test 5: Get event by ID
  const validId = data1.events[0].id;
  const res5 = await fetch(`${baseUrl}/events/${validId}`);
  const data5 = await res5.json();
  console.log('Test 5 (Get event by ID): status =', res5.status, 'name =', data5.event?.name);
  if (res5.status !== 200 || data5.event?.id !== validId) throw new Error('Test 5 Failed');

  // Test 6: Non-existing event ID -> 404
  const res6 = await fetch(`${baseUrl}/events/999999`);
  const data6 = await res6.json();
  console.log('Test 6 (Non-existing event ID 999999): status =', res6.status, 'error =', data6.error);
  if (res6.status !== 404 || !data6.error) throw new Error('Test 6 Failed');

  // Test 7: Health check regression
  const res7 = await fetch(`${baseUrl}/health`);
  const data7 = await res7.json();
  console.log('Test 7 (Health check regression): status =', res7.status, 'status =', data7.status);
  if (res7.status !== 200 || data7.status !== 'ok') throw new Error('Test 7 Failed');

  console.log('--- ALL BACKEND EVENT TESTS PASSED (7/7) ---');
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
