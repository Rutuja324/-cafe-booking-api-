const db = require('../config/db');


// Customer: see own bookings
exports.getMyBookings = async (req, res) => {
  try {
    const customerId = req.user.id;

    const [bookings] = await db.query(
      `SELECT b.id, b.booking_date, b.booking_time, b.people_count, b.status,
              b.special_requests,
              c.name AS cafe_name, c.location
       FROM bookings b
       JOIN cafes c ON b.cafe_id = c.id
       WHERE b.user_id = ?
       ORDER BY b.booking_date DESC, b.created_at DESC`,
      [customerId]
    );

    res.json({ success: true, bookings });
  } catch (err) {
    console.error('Get my bookings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Owner: bookings for all their cafes
exports.getBookingsForOwner = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const [bookings] = await db.query(
      `SELECT b.id, b.booking_date, b.booking_time, b.people_count, b.status,
              b.special_requests,
              c.id AS cafe_id, c.name AS cafe_name,
              u.id AS user_id, u.name AS customer_name, u.email AS customer_email
       FROM bookings b
       JOIN cafes c ON b.cafe_id = c.id
       JOIN users u ON b.user_id = u.id
       WHERE c.owner_id = ?
       ORDER BY b.booking_date DESC, b.created_at DESC`,
      [ownerId]
    );

    res.json({ success: true, bookings });
  } catch (err) {
    console.error('Get owner bookings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin: all bookings
exports.getAdminBookings = async (req, res) => {
  try {
    const [bookings] = await db.query(
      `SELECT b.id, b.booking_date, b.booking_time, b.people_count, b.status,
              b.special_requests,
              c.id AS cafe_id, c.name AS cafe_name,
              u.id AS user_id, u.name AS customer_name, u.email AS customer_email
       FROM bookings b
       JOIN cafes c ON b.cafe_id = c.id
       JOIN users u ON b.user_id = u.id
       ORDER BY b.booking_date DESC, b.created_at DESC`
    );

    res.json({ success: true, bookings });
  } catch (err) {
    console.error('Get all bookings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// Owner/Admin: Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body; // 'confirmed', 'cancelled'
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    // Check booking exists and get cafe owner
    const [booking] = await db.query(
      `SELECT b.*, c.owner_id 
       FROM bookings b 
       JOIN cafes c ON b.cafe_id = c.id 
       WHERE b.id = ?`, 
      [bookingId]
    );

    if (!booking.length) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const bookingData = booking[0];

    // Admin can update any, Owner only their cafe's
    if (userRole === 'admin' || (userRole === 'owner' && bookingData.owner_id === userId)) {
      await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId]);
      res.json({ success: true, message: `Booking ${status}` });
    } else {
      res.status(403).json({ success: false, message: 'Unauthorized' });
    }
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// Customer: Cancel own booking
exports.cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const customerId = req.user.id;

    const [booking] = await db.query(
      'SELECT status FROM bookings WHERE id = ? AND user_id = ?', 
      [bookingId, customerId]
    );

    if (!booking.length) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking[0].status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cannot cancel confirmed booking' });
    }

    await db.query('UPDATE bookings SET status = "cancelled" WHERE id = ?', [bookingId]);
    res.json({ success: true, message: 'Booking cancelled' });
  } catch (err) {
    console.error('Cancel error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
exports.createBooking = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { cafe_id, booking_date, booking_time, people_count, special_requests } = req.body;

    // VALIDATIONS
    if (!cafe_id || !booking_date || !booking_time || !people_count) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (people_count < 1 || people_count > 50) {
      return res.status(400).json({ success: false, message: 'People count must be 1-50' });
    }
    if (isNaN(new Date(booking_date))) {
      return res.status(400).json({ success: false, message: 'Invalid booking date' });
    }

    // Check cafe exists
    const [cafes] = await db.query('SELECT id, capacity FROM cafes WHERE id = ?', [cafe_id]);
    if (!cafes.length) {
      return res.status(400).json({ success: false, message: 'Cafe not found' });
    }
    if (people_count > cafes[0].capacity) {
      return res.status(400).json({ success: false, message: 'Exceeds cafe capacity' });
    }

    const [result] = await db.query(
      `INSERT INTO bookings (cafe_id, user_id, booking_date, booking_time, people_count, special_requests, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [cafe_id, customerId, booking_date, booking_time, people_count, special_requests || null]
    );

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking_id: result.insertId
    });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// Admin: Dashboard stats
exports.getAdminStats = async (req, res) => {
  try {
    const [
      [totalBookings],
      [totalConfirmed],
      [totalRevenue],
      [totalCafes],
      [activeOwners]
    ] = await Promise.all([
      db.query("SELECT COUNT(*) as count FROM bookings"),
      db.query("SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'"),
      db.query("SELECT SUM(people_count * 250) as revenue FROM bookings WHERE status = 'confirmed'"),
      db.query("SELECT COUNT(*) as count FROM cafes"),
      db.query("SELECT COUNT(DISTINCT owner_id) as count FROM cafes WHERE owner_id IS NOT NULL")
    ]);

    res.json({
      success: true,
      stats: {
        totalBookings: totalBookings[0].count,
        totalConfirmed: totalConfirmed[0].count,
        estimatedRevenue: parseFloat(totalRevenue[0].revenue || 0),
        totalCafes: totalCafes[0].count,
        activeOwners: activeOwners[0].count
      }
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
