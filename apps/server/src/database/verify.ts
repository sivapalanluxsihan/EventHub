import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { config } from '../config/env.js';
import { seedDatabase } from './seed.js';

console.log('=== EventHub Database Verification Suite ===\n');

// 1. Database file check
console.log('1. Database file check:');
const exists = fs.existsSync(config.dbPath);
const stat = exists ? fs.statSync(config.dbPath) : null;
console.log(`   Database Path: ${config.dbPath}`);
console.log(`   Exists: ${exists}, Size: ${stat?.size ?? 0} bytes`);

const db = new Database(config.dbPath);
db.pragma('foreign_keys = ON');

// 2, 3, 4. Tables check
console.log('\n2, 3, 4. Checking required tables (users, events, bookings):');
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
  .all() as { name: string }[];
const tableNames = tables.map((t) => t.name);
console.log(`   Tables Found: ${tableNames.join(', ')}`);
console.log(`   users table exists: ${tableNames.includes('users')}`);
console.log(`   events table exists: ${tableNames.includes('events')}`);
console.log(`   bookings table exists: ${tableNames.includes('bookings')}`);

// 5. Foreign keys pragma check
console.log('\n5. Foreign keys enforcement check:');
const fkStatus = db.pragma('foreign_keys', { simple: true });
console.log(`   Foreign keys pragma active: ${fkStatus === 1}`);

// 6. Sample events check
console.log('\n6. Sample events check:');
const events = db.prepare('SELECT id, name, category, availableSeats, price FROM events').all() as any[];
console.log(`   Total Sample Events: ${events.length}`);
events.forEach((e) => {
  console.log(`   - [ID ${e.id}] ${e.name} (${e.category}, Seats: ${e.availableSeats}, Price: $${e.price})`);
});

// 7 & 8. Checking Seed Idempotency
console.log('\n7 & 8. Checking restart & seed idempotency (no duplicate entries):');
seedDatabase(db);
const countAfterReSeed = (db.prepare('SELECT COUNT(*) as c FROM events').get() as any).c;
console.log(`   Event count after attempting re-seed: ${countAfterReSeed} (Expected: 5, Match: ${countAfterReSeed === 5})`);

// 9. Invalid foreign key rejection test
console.log('\n9. Testing foreign key constraint rejection:');
try {
  db.prepare('INSERT INTO bookings (userId, eventId, numberOfSeats) VALUES (?, ?, ?)').run(99999, 99999, 2);
  console.log('   FAIL: Insert succeeded when it should fail FK constraint');
} catch (err) {
  console.log(`   PASS: Foreign key violation correctly rejected: ${(err as Error).message}`);
}

// 10. availableSeats negative check constraint test
console.log('\n10. Testing availableSeats >= 0 check constraint:');
try {
  db.prepare(
    'INSERT INTO events (organizerId, name, date, time, location, category, price, availableSeats) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(1, 'Invalid Negative Seats Event', '2026-12-01', '10:00 AM', 'Campus Hall', 'Technology', 10, -5);
  console.log('   FAIL: Insert with negative seats succeeded');
} catch (err) {
  console.log(`   PASS: Negative seats correctly rejected by CHECK constraint: ${(err as Error).message}`);
}

console.log('\n=== All 10 Database Verification Checks Completed ===');
