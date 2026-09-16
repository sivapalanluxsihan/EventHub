import { getDb } from '../database/index.js';

const BASE_URL = 'http://localhost:5000/api/auth';

async function runTests() {
  console.log('=== EventHub Authentication Automated Test Suite ===\n');
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

  const testEmail = `testuser_${Date.now()}@test.university.edu`;
  const otherEmail = `otheruser_${Date.now()}@test.university.edu`;
  const testPassword = 'SecurePassword123!';
  let userToken = '';
  let otherToken = '';
  let organizerToken = '';

  // 1. Valid registration
  const regRes = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Alice Student', email: testEmail, password: testPassword }),
  });
  const regData = await regRes.json() as any;
  userToken = regData.token;
  assert(
    regRes.status === 201 && regData.user && regData.user.email === testEmail.toLowerCase() && !regData.user.passwordHash,
    '1. Valid registration → success with JWT & safe user (no passwordHash)'
  );

  // Register second user for duplicate email tests
  const otherRes = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Bob Peer', email: otherEmail, password: testPassword }),
  });
  const otherData = await otherRes.json() as any;
  otherToken = otherData.token;

  // 2. Missing name
  const missingNameRes = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'noname@test.com', password: testPassword }),
  });
  assert(missingNameRes.status === 400, '2. Missing name → rejected (400)');

  // 3. Invalid email
  const invalidEmailRes = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Invalid Email', email: 'notanemail', password: testPassword }),
  });
  assert(invalidEmailRes.status === 400, '3. Invalid email → rejected (400)');

  // 4. Invalid/short password
  const shortPassRes = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Short Pass', email: 'shortpass@test.com', password: '123' }),
  });
  assert(shortPassRes.status === 400, '4. Invalid/short password → rejected (400)');

  // 5. Duplicate email
  const dupEmailRes = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Duplicate User', email: testEmail, password: testPassword }),
  });
  assert(dupEmailRes.status === 409, '5. Duplicate email → rejected (409 Conflict)');

  // 6. Correct credentials login
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  const loginData = await loginRes.json() as any;
  assert(
    loginRes.status === 200 && typeof loginData.token === 'string' && loginData.user && !loginData.user.passwordHash,
    '6. Correct credentials → success + JWT token'
  );

  // 7. Wrong password login
  const wrongPassRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'WrongPassword999' }),
  });
  assert(wrongPassRes.status === 401, '7. Wrong password → rejected (401 Unauthorized)');

  // 8. Unknown email login
  const unknownEmailRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ghost.user@test.com', password: testPassword }),
  });
  assert(unknownEmailRes.status === 401, '8. Unknown email → rejected (401 Unauthorized)');

  // 9. Valid JWT profile retrieval
  const profileRes = await fetch(`${BASE_URL}/profile`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const profileData = await profileRes.json() as any;
  assert(
    profileRes.status === 200 && profileData.user && profileData.user.email === testEmail.toLowerCase(),
    '9. Valid JWT → profile returned'
  );

  // 10. Missing JWT profile retrieval
  const missingTokenRes = await fetch(`${BASE_URL}/profile`);
  assert(missingTokenRes.status === 401, '10. Missing JWT → rejected (401)');

  // 11. Invalid JWT profile retrieval
  const invalidTokenRes = await fetch(`${BASE_URL}/profile`, {
    headers: { Authorization: 'Bearer this.is.an.invalid.token' },
  });
  assert(invalidTokenRes.status === 401, '11. Invalid JWT → rejected (401)');

  // 12. Profile does not expose passwordHash
  assert(
    profileData.user && profileData.user.passwordHash === undefined,
    '12. Profile does not expose passwordHash'
  );

  // 13. Valid name update
  const updatedName = 'Alice Student, BSc';
  const updateNameRes = await fetch(`${BASE_URL}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ name: updatedName }),
  });
  const updateNameData = await updateNameRes.json() as any;
  assert(
    updateNameRes.status === 200 && updateNameData.user.name === updatedName,
    '13. Valid name update → success'
  );

  // 14. Valid email update
  const newEmail = `new_email_${Date.now()}@test.university.edu`;
  const updateEmailRes = await fetch(`${BASE_URL}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ email: newEmail }),
  });
  const updateEmailData = await updateEmailRes.json() as any;
  assert(
    updateEmailRes.status === 200 && updateEmailData.user.email === newEmail.toLowerCase(),
    '14. Valid email update → success'
  );

  // 15. Duplicate email update
  const dupEmailUpdateRes = await fetch(`${BASE_URL}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ email: otherEmail }),
  });
  assert(dupEmailUpdateRes.status === 409, '15. Duplicate email on update → rejected (409 Conflict)');

  // 16. Attempt to change role
  const roleChangeRes = await fetch(`${BASE_URL}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ role: 'ORGANIZER' }),
  });
  assert(roleChangeRes.status === 403, '16. Attempt to change role → rejected (403 Forbidden)');

  // 17. Attempt to modify id / password
  const idModRes = await fetch(`${BASE_URL}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ id: 9999, password: 'HackedPassword' }),
  });
  assert(idModRes.status === 400, '17. Attempt to modify id/password → rejected (400 Bad Request)');

  // 18. USER does not satisfy ORGANIZER requirement
  const userOrgReqRes = await fetch(`${BASE_URL}/test-organizer`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(userOrgReqRes.status === 403, "18. USER does not satisfy ORGANIZER requirement (403 Forbidden)");

  // 19. ORGANIZER satisfies ORGANIZER requirement
  // Login with seed development organizer
  const orgLoginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'organizer.dev@eventhub.test', password: 'DevOrganizer2026!' }),
  });
  const orgLoginData = await orgLoginRes.json() as any;
  organizerToken = orgLoginData.token;

  const orgReqRes = await fetch(`${BASE_URL}/test-organizer`, {
    headers: { Authorization: `Bearer ${organizerToken}` },
  });
  const orgReqData = await orgReqRes.json() as any;
  assert(
    orgReqRes.status === 200 && orgReqData.status === 'ok',
    '19. ORGANIZER satisfies ORGANIZER requirement (200 OK)'
  );

  // Clean up temporary test accounts to keep database pristine
  const db = getDb();
  db.prepare('DELETE FROM users WHERE email = ? OR email = ? OR email = ?').run(testEmail.toLowerCase(), otherEmail.toLowerCase(), newEmail.toLowerCase());

  console.log(`\n=== Verification Finished: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
