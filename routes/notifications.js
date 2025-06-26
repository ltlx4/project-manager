const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { Notification } = require('../models');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');
const { htmxResponse, templates } = require('../middleware/htmx');

const router = express.Router();

// Add HTMX middleware
router.use(htmxResponse);

// Get all notifications for authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const { 
      isRead, 
      type, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;

    // Build where conditions
    const where = { userId: req.user.userId };
    if (isRead !== undefined) where.isRead = isRead === 'true';
    if (type) where.type = type;

    const notifications = await Notification.findAndCountAll({
      where,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset
    });

    res.json({
      notifications: notifications.rows,
      pagination: {
        total: notifications.count,
        page: parseInt(page),
        pages: Math.ceil(notifications.count / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// Get unread notifications count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.count({
      where: {
        userId: req.user.userId,
        isRead: false
      }
    });

    res.htmx.respond({ count }, templates.notificationCount);
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error fetching unread count' });
  }
});

// Mark notification as read
router.put('/:id/read', auth, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        userId: req.user.userId
      }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.update({
      isRead: true,
      readAt: new Date()
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error marking notification as read' });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.update(
      {
        isRead: true,
        readAt: new Date()
      },
      {
        where: {
          userId: req.user.userId,
          isRead: false
        }
      }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Server error marking all notifications as read' });
  }
});

// Delete notification
router.delete('/:id', auth, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        userId: req.user.userId
      }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.destroy();

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error deleting notification' });
  }
});

// Delete all read notifications
router.delete('/read', auth, async (req, res) => {
  try {
    const deletedCount = await Notification.destroy({
      where: {
        userId: req.user.userId,
        isRead: true
      }
    });

    res.json({ 
      message: 'Read notifications deleted',
      deletedCount
    });
  } catch (error) {
    console.error('Delete read notifications error:', error);
    res.status(500).json({ message: 'Server error deleting read notifications' });
  }
});

module.exports = router;
