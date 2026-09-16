import type BetterSqlite3 from 'better-sqlite3';
import bcrypt from 'bcryptjs';

export const seedDatabase = (db: BetterSqlite3.Database): void => {
  // Check if events already exist to prevent duplicate seed entries
  const existingEventsCount = db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
  if (existingEventsCount && existingEventsCount.count > 0) {
    return;
  }

  // 1. Ensure a development organizer account exists
  const organizerEmail = 'organizer.dev@eventhub.test';
  let organizer = db.prepare('SELECT id FROM users WHERE email = ?').get(organizerEmail) as { id: number } | undefined;

  if (!organizer) {
    // Development-only sample password for local testing
    const devPassword = 'DevOrganizer2026!';
    const passwordHash = bcrypt.hashSync(devPassword, 10);

    const insertOrganizer = db.prepare(`
      INSERT INTO users (name, email, passwordHash, role)
      VALUES (?, ?, ?, ?)
    `);

    const result = insertOrganizer.run(
      'Campus Event Operations',
      organizerEmail,
      passwordHash,
      'ORGANIZER'
    );
    organizer = { id: Number(result.lastInsertRowid) };
  }

  const organizerId = organizer.id;

  // 2. Insert ~5 Sample Events across diverse categories
  const sampleEvents = [
    {
      name: 'AI & Cross-Platform App Hackathon 2026',
      description: 'A 24-hour sprint building cutting-edge mobile and web applications with fellow student developers.',
      date: '2026-10-15',
      time: '09:00 AM',
      location: 'Student Innovation Center, Hall A',
      category: 'Technology',
      price: 0.0,
      availableSeats: 120,
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Campus Spring Acoustic Music Festival',
      description: 'An evening of live acoustic performances featuring student bands, local solo artists, and food trucks.',
      date: '2026-10-22',
      time: '06:30 PM',
      location: 'University Amphitheater',
      category: 'Music',
      price: 10.0,
      availableSeats: 350,
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Inter-College Badminton Championship',
      description: 'Competitive singles and doubles tournament open to all registered university departments.',
      date: '2026-11-05',
      time: '10:00 AM',
      location: 'Campus Sports Complex, Indoor Courts',
      category: 'Sports',
      price: 5.0,
      availableSeats: 64,
      image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Tech Career & Internship Symposium',
      description: 'Network with tech leaders, attend resume workshops, and interview with top industry recruiters.',
      date: '2026-11-12',
      time: '01:00 PM',
      location: 'Auditorium North',
      category: 'Education',
      price: 0.0,
      availableSeats: 200,
      image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Green Campus Farmers & Artisan Fair',
      description: 'Celebrate sustainability with local organic produce, student art, and eco-friendly workshops.',
      date: '2026-11-20',
      time: '11:00 AM',
      location: 'Main Quad Green',
      category: 'Community',
      price: 0.0,
      availableSeats: 500,
      image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const insertEvent = db.prepare(`
    INSERT INTO events (organizerId, name, description, date, time, location, category, price, availableSeats, image)
    VALUES (@organizerId, @name, @description, @date, @time, @location, @category, @price, @availableSeats, @image)
  `);

  const insertMany = db.transaction((events) => {
    for (const event of events) {
      insertEvent.run({ ...event, organizerId });
    }
  });

  insertMany(sampleEvents);
  console.log(`[Database Seed] Successfully seeded ${sampleEvents.length} sample events.`);
};
