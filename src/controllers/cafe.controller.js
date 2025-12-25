const db = require('../config/db');

// Create cafe (owner)
exports.createCafe = async (req, res) => {
  try {
    const { name, location, description, avg_price, capacity, theme } = req.body;

    const [result] = await db.query(
      `INSERT INTO cafes (owner_id, name, location, description, avg_price, capacity, theme)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, name, location, description, avg_price, capacity, theme]
    );

    res.status(201).json({
      success: true,
      message: 'Cafe created successfully',
      cafe_id: result.insertId
    });
  } catch (err) {
    console.error('Create cafe error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all cafes (PUBLIC)
exports.getAllCafes = async (req, res) => {
  try {
    const [cafes] = await db.query(
      `SELECT id, name, location, description, avg_price, capacity, theme, owner_id, created_at
       FROM cafes ORDER BY created_at DESC`
    );
    res.json({ success: true, cafes });
  } catch (err) {
    console.error('Get cafes error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single cafe by id (PUBLIC)
exports.getCafeById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, location, description, avg_price, capacity, theme, owner_id, created_at
       FROM cafes WHERE id = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Cafe not found' });
    }

    res.json({ success: true, cafe: rows[0] });
  } catch (err) {
    console.error('Get cafe by id error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Owner: Get only own cafes
exports.getMyCafes = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const [cafes] = await db.query(
      `SELECT id, name, location, description, avg_price, capacity, theme, created_at
       FROM cafes
       WHERE owner_id = ?
       ORDER BY created_at DESC`,
      [ownerId]
    );

    res.json({
      success: true,
      cafes
    });
  } catch (err) {
    console.error('Get my cafes error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update cafe (owner only)
exports.updateCafe = async (req, res) => {
  try {
    const cafeId = req.params.id;
    const ownerId = req.user.id;
    const { name, location, description, avg_price, capacity, theme } = req.body;

    // Check that this cafe belongs to this owner
    const [rows] = await db.query(
      'SELECT id FROM cafes WHERE id = ? AND owner_id = ?',
      [cafeId, ownerId]
    );

    if (!rows.length) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this cafe'
      });
    }

    await db.query(
      `UPDATE cafes
       SET name = ?, location = ?, description = ?, avg_price = ?, capacity = ?, theme = ?
       WHERE id = ?`,
      [name, location, description, avg_price, capacity, theme, cafeId]
    );

    res.json({
      success: true,
      message: 'Cafe updated successfully'
    });
  } catch (err) {
    console.error('Update cafe error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete cafe (owner only)
exports.deleteCafe = async (req, res) => {
  try {
    const cafeId = req.params.id;
    const ownerId = req.user.id;

    // Check ownership
    const [rows] = await db.query(
      'SELECT id FROM cafes WHERE id = ? AND owner_id = ?',
      [cafeId, ownerId]
    );

    if (!rows.length) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this cafe'
      });
    }

    await db.query('DELETE FROM cafes WHERE id = ?', [cafeId]);

    res.json({
      success: true,
      message: 'Cafe deleted successfully'
    });
  } catch (err) {
    console.error('Delete cafe error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// Search + Filter cafes (PUBLIC)
exports.searchCafes = async (req, res) => {
  try {
    const { location, theme, min_price, max_price } = req.query;

    let query = `
      SELECT id, name, location, description, avg_price, capacity, theme, owner_id, created_at
      FROM cafes WHERE 1=1
    `;
    let params = [];

    if (location) {
      query += ` AND location LIKE ?`;
      params.push(`%${location}%`);
    }
    if (theme) {
      query += ` AND theme LIKE ?`;
      params.push(`%${theme}%`);
    }
    if (min_price) {
      query += ` AND CAST(avg_price AS DECIMAL(10,2)) >= ?`;
      params.push(min_price);
    }
    if (max_price) {
      query += ` AND CAST(avg_price AS DECIMAL(10,2)) <= ?`;
      params.push(max_price);
    }

    query += ` ORDER BY created_at DESC`;

    const [cafes] = await db.query(query, params);
    res.json({ success: true, cafes });
  } catch (err) {
    console.error('Search cafes error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
