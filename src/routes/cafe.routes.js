const express = require('express');
const router = express.Router();
const cafeController = require('../controllers/cafe.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

// Owner only: Create cafe
router.post('/', verifyToken, requireRole(['owner']), cafeController.createCafe);
// Owner: get only own cafes  ← CHANGED: /my/owner → /my
router.get('/my', verifyToken, requireRole(['owner']), cafeController.getMyCafes);

// Public: List all cafes
router.get('/', cafeController.getAllCafes);

// Public: Get single cafe by id
router.get('/:id', cafeController.getCafeById);
// Owner only: Update cafe
router.put('/:id', verifyToken, requireRole(['owner']), cafeController.updateCafe);

// Owner only: Delete cafe
router.delete('/:id', verifyToken, requireRole(['owner']), cafeController.deleteCafe);
router.get('/search', cafeController.searchCafes);

module.exports = router;
