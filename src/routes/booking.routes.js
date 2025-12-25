const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

// Customer creates a booking
router.post('/', verifyToken, requireRole(['customer']), bookingController.createBooking);

// Customer gets own bookings
router.get('/my', verifyToken, requireRole(['customer']), bookingController.getMyBookings);

// Owner gets bookings for their cafes
router.get('/owner', verifyToken, requireRole(['owner']), bookingController.getBookingsForOwner);

// Admin gets all bookings
router.get('/admin', verifyToken, requireRole(['admin']), bookingController.getAdminBookings);
router.put('/:id/status', verifyToken, requireRole(['owner', 'admin']), bookingController.updateBookingStatus);

router.delete('/:id', verifyToken, requireRole(['customer']), bookingController.cancelBooking);
router.get('/stats', verifyToken, requireRole(['admin']), bookingController.getAdminStats);

module.exports = router;
