import type BetterSqlite3 from 'better-sqlite3';

export const initSchema = (db: BetterSqlite3.Database): void => {
  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('USER', 'ORGANIZER')) DEFAULT 'USER',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Events Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organizerId INTEGER NOT NULL,
      name TEXT NOT NULL,
      image TEXT,
      description TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0.0 CHECK(price >= 0),
      availableSeats INTEGER NOT NULL CHECK(availableSeats >= 0),
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizerId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. Bookings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      eventId INTEGER NOT NULL,
      numberOfSeats INTEGER NOT NULL CHECK(numberOfSeats > 0),
      status TEXT NOT NULL CHECK(status IN ('CONFIRMED', 'CANCELLED')) DEFAULT 'CONFIRMED',
      bookingDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    );
  `);

  // Useful indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizerId);
    CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(userId);
    CREATE INDEX IF NOT EXISTS idx_bookings_event ON bookings(eventId);
  `);
};
