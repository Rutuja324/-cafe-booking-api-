const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();

// ===== IMPORT ROUTES =====
const authRoutes = require('./routes/auth.routes');
const cafeRoutes = require('./routes/cafe.routes');
const bookingRoutes = require('./routes/booking.routes');

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ===== HEALTH CHECKS =====
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Cafe Management Backend Connected!'
  });
});

app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM users LIMIT 5');
    res.json({
      success: true,
      message: 'Database connected!',
      users: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== ROUTES (MOUNT LAST) =====
app.use('/api/auth', authRoutes);
app.use('/api/cafes', cafeRoutes);
app.use('/api/bookings', bookingRoutes);   // ✅ mount here

module.exports = app;
