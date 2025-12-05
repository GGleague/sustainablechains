const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const dbPath = (() => {
  const custom = process.env.DATABASE_PATH;
  if (!custom) return path.join(__dirname, 'database.sqlite');
  const dir = path.dirname(custom);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return custom;
})();
const db = new Database(dbPath);

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

function init() {
  db.prepare(`CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    contact_name TEXT,
    description TEXT,
    logo_url TEXT,
    story TEXT,
    categories TEXT,
    stripe_customer_id TEXT,
    status TEXT NOT NULL,
    created_at TEXT,
    updated_at TEXT
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS supply_chain_points (
    id INTEGER PRIMARY KEY,
    brand_id INTEGER NOT NULL,
    title TEXT,
    description TEXT,
    address TEXT,
    latitude REAL,
    longitude REAL,
    ethical_highlight TEXT,
    photo_url TEXT,
    status TEXT NOT NULL,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY(brand_id) REFERENCES brands(id)
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY,
    brand_id INTEGER NOT NULL,
    plan_type TEXT NOT NULL,
    status TEXT NOT NULL,
    stripe_subscription_id TEXT,
    renewal_date TEXT,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY(brand_id) REFERENCES brands(id)
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY,
    brand_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    plan_type TEXT NOT NULL,
    stripe_invoice_id TEXT,
    due_date TEXT,
    status TEXT NOT NULL,
    created_at TEXT,
    FOREIGN KEY(brand_id) REFERENCES brands(id)
  )`).run();

  function addColumnIfMissing(table, column, definition) {
    const info = db.prepare(`PRAGMA table_info(${table})`).all();
    const exists = info.some((c) => c.name === column);
    if (!exists) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    }
  }

  addColumnIfMissing('brands', 'stripe_customer_id', 'TEXT');
  addColumnIfMissing('subscriptions', 'stripe_subscription_id', 'TEXT');
  addColumnIfMissing('invoices', 'stripe_invoice_id', 'TEXT');

  db.prepare(`CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  )`).run();

  const admin = db.prepare('SELECT * FROM admin_users WHERE email = ?').get('admin@example.com');
  if (!admin) {
    db.prepare('INSERT INTO admin_users (email, password_hash) VALUES (?, ?)').run(
      'admin@example.com',
      hashPassword('admin123')
    );
  }

  // Seed demo data if no brands exist yet
  const brandCount = db.prepare('SELECT COUNT(*) as count FROM brands').get().count;
  if (brandCount === 0) {
    const now = new Date().toISOString();
    const demoBrands = [
      {
        name: 'Everkind Threads',
        email: 'hello@everkind.com',
        password: 'everkind123',
        contact_name: 'Mara Quinn',
        description: 'Organic cotton basics with fair-wage partners in Portugal.',
        logo_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=300&q=80',
        story: 'Cut-and-sew in Porto, dyeing in Braga, packaging in Lisbon using recycled mailers.',
        categories: 'apparel,basics',
        status: 'ACTIVE'
      },
      {
        name: 'Bright Bean Coffee',
        email: 'contact@brightbean.com',
        password: 'bright123',
        contact_name: 'Luis Ortega',
        description: 'Direct-trade coffee with transparent roasting and compostable packaging.',
        logo_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=300&q=80',
        story: 'Sourcing from cooperative partners in Colombia; roasting in Austin; fulfillment via carbon-neutral carrier.',
        categories: 'beverage,coffee',
        status: 'ACTIVE'
      }
    ];

    const brandStmt = db.prepare(`INSERT INTO brands
      (name, email, password_hash, contact_name, description, logo_url, story, categories, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    const subStmt = db.prepare(`INSERT INTO subscriptions
      (brand_id, plan_type, status, renewal_date, created_at, updated_at)
      VALUES (?, ?, 'ACTIVE', ?, ?, ?)`);

    const invStmt = db.prepare(`INSERT INTO invoices
      (brand_id, amount, plan_type, due_date, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`); 

    demoBrands.forEach((b, idx) => {
      const created = brandStmt.run(
        b.name,
        b.email,
        hashPassword(b.password),
        b.contact_name,
        b.description,
        b.logo_url,
        b.story,
        b.categories,
        b.status,
        now,
        now
      );
      const brandId = created.lastInsertRowid;
      const plan = idx === 0 ? 'MONTHLY' : 'ANNUAL';
      const renewal = plan === 'MONTHLY'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      subStmt.run(brandId, plan, renewal, now, now);
      invStmt.run(brandId, plan === 'MONTHLY' ? 49 : 499, plan, renewal, 'DUE', now);
    });

    const pointStmt = db.prepare(`INSERT INTO supply_chain_points
      (brand_id, title, description, address, latitude, longitude, ethical_highlight, photo_url, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`); 

    // Points for Everkind Threads
    pointStmt.run(
      1,
      'Porto Cut & Sew',
      'Small-batch garment assembly with third-party audits.',
      'Porto, Portugal',
      41.1579,
      -8.6291,
      'Fair wages, SA8000-aligned',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80',
      'APPROVED',
      now,
      now
    );
    pointStmt.run(
      1,
      'Braga Dye House',
      'Low-impact dyes, closed-loop water treatment.',
      'Braga, Portugal',
      41.5454,
      -8.4265,
      'OEKO-TEX certified dyes',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80',
      'APPROVED',
      now,
      now
    );

    // Points for Bright Bean Coffee
    pointStmt.run(
      2,
      'Antioquia Cooperative',
      'Farmers cooperative with transparent premiums.',
      'Antioquia, Colombia',
      6.5536,
      -75.0941,
      'Floor price + quality bonus',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
      'APPROVED',
      now,
      now
    );
    pointStmt.run(
      2,
      'Austin Roastery',
      'Electric-powered roasting facility with onsite QA.',
      'Austin, TX',
      30.2672,
      -97.7431,
      'Renewable electricity + third-party safety audits',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
      'APPROVED',
      now,
      now
    );
  }
}

init();

module.exports = {
  db,
  hashPassword
};
