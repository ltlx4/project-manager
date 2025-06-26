const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { User, Project, Task, ProjectMember, sequelize } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Get all users (admin only)
router.get('/', auth, authorize(['admin']), async (req, res) => {
  try {
    const {
      search,
      role,
      isActive,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where conditions
    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const users = await User.findAndCountAll({
      where,
      attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'avatar', 'isActive', 'createdAt'],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset
    });

    // Check if this is an HTMX request
    if (req.headers['hx-request']) {
      // Return HTML for HTMX
      let html = '';

      if (users.rows.length === 0) {
        html = `
          <div class="col-span-full text-center py-12">
            <i class="fas fa-users text-4xl text-gray-300 mb-4"></i>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
            <p class="text-gray-500">Try adjusting your search criteria or invite new members.</p>
          </div>
        `;
      } else {
        users.rows.forEach(user => {
          const statusBadge = user.isActive
            ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>'
            : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactive</span>';

          const roleBadge = {
            admin: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Admin</span>',
            manager: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Manager</span>',
            member: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Member</span>'
          }[user.role] || '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Member</span>';

          html += `
            <div class="bg-white shadow rounded-lg p-6">
              <div class="flex items-center space-x-4">
                <img class="h-12 w-12 rounded-full" src="${user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName + ' ' + user.lastName)}&background=3B82F6&color=fff`}" alt="${user.firstName} ${user.lastName}">
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-medium text-gray-900 truncate">${user.firstName} ${user.lastName}</h3>
                  <p class="text-sm text-gray-500 truncate">${user.email}</p>
                  <div class="mt-2 flex space-x-2">
                    ${roleBadge}
                    ${statusBadge}
                  </div>
                </div>
                <div class="flex-shrink-0">
                  <button class="text-gray-400 hover:text-gray-600" onclick="editUser('${user.id}')">
                    <i class="fas fa-edit"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        });
      }

      res.send(html);
    } else {
      // Return JSON for API requests
      res.json({
        users: users.rows,
        pagination: {
          total: users.count,
          page: parseInt(page),
          pages: Math.ceil(users.count / limit),
          limit: parseInt(limit)
        }
      });
    }
  } catch (error) {
    console.error('Get users error:', error);
    if (req.headers['hx-request']) {
      res.send(`
        <div class="col-span-full text-center py-12">
          <i class="fas fa-exclamation-triangle text-4xl text-red-300 mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Error loading team members</h3>
          <p class="text-gray-500">Please try again later.</p>
        </div>
      `);
    } else {
      res.status(500).json({ message: 'Server error fetching users' });
    }
  }
});

// Search users for project assignment
router.get('/search', auth, [
  query('q').trim().isLength({ min: 1 }).withMessage('Search query is required'),
  query('projectId').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { q: searchQuery, projectId, limit = 10 } = req.query;

    const where = {
      isActive: true,
      [Op.or]: [
        { firstName: { [Op.iLike]: `%${searchQuery}%` } },
        { lastName: { [Op.iLike]: `%${searchQuery}%` } },
        { email: { [Op.iLike]: `%${searchQuery}%` } }
      ]
    };

    // If projectId is provided, exclude users already in the project
    let excludeUserIds = [];
    if (projectId) {
      const projectMembers = await ProjectMember.findAll({
        where: { projectId },
        attributes: ['userId']
      });
      excludeUserIds = projectMembers.map(member => member.userId);
    }

    if (excludeUserIds.length > 0) {
      where.id = { [Op.notIn]: excludeUserIds };
    }

    const users = await User.findAll({
      where,
      attributes: ['id', 'email', 'firstName', 'lastName', 'avatar', 'role'],
      limit: parseInt(limit),
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error searching users' });
  }
});

// Get single user
router.get('/:id', auth, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Users can only view their own profile unless they're admin
    if (req.params.id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'avatar', 'isActive', 'createdAt'],
      include: [
        {
          model: Project,
          as: 'ownedProjects',
          attributes: ['id', 'name', 'status', 'priority'],
          limit: 5,
          order: [['createdAt', 'DESC']]
        },
        {
          model: Project,
          as: 'projects',
          attributes: ['id', 'name', 'status', 'priority'],
          through: { attributes: ['role'] },
          limit: 5,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get task statistics
    const taskStats = await Task.findAll({
      where: { assigneeId: user.id },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const formattedTaskStats = {
      todo: 0,
      'in-progress': 0,
      review: 0,
      done: 0
    };

    taskStats.forEach(stat => {
      formattedTaskStats[stat.status] = parseInt(stat.count);
    });

    res.json({ 
      user: {
        ...user.toJSON(),
        taskStats: formattedTaskStats
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error fetching user' });
  }
});

// Update user (admin only, except for own profile)
router.put('/:id', auth, [
  param('id').isUUID(),
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
  body('role').optional().isIn(['admin', 'manager', 'member']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const targetUserId = req.params.id;
    const isOwnProfile = targetUserId === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    // Users can only update their own profile unless they're admin
    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findByPk(targetUserId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { role, isActive, ...profileData } = req.body;

    // Only admins can change role and isActive status
    const updateData = { ...profileData };
    if (isAdmin) {
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    await user.update(updateData);

    res.json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error updating user' });
  }
});

// Deactivate user (admin only)
router.delete('/:id', auth, authorize(['admin']), param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow admin to deactivate themselves
    if (user.id === req.user.userId) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    await user.update({ isActive: false });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Server error deactivating user' });
  }
});

// Invite user (admin only)
router.post('/invite', auth, authorize(['admin']), [
  body('email').isEmail().withMessage('Valid email is required'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('role').isIn(['admin', 'manager', 'member']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, firstName, lastName, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create new user with temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newUser = await User.create({
      email,
      firstName,
      lastName,
      role,
      password: hashedPassword,
      isActive: true
    });

    // In a real application, you would send an email with login credentials
    // For now, we'll just return success

    res.status(201).json({
      message: 'User invited successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role
      },
      tempPassword // In production, this should be sent via email, not returned in response
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ message: 'Server error inviting user' });
  }
});

// Get user's projects
router.get('/:id/projects', auth, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Users can only view their own projects unless they're admin
    if (req.params.id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const projects = await Project.findAndCountAll({
      include: [
        {
          model: User,
          as: 'members',
          where: { id: req.params.id },
          attributes: [],
          through: { attributes: ['role'] },
          required: true
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    res.json({
      projects: projects.rows,
      pagination: {
        total: projects.count,
        page: parseInt(page),
        pages: Math.ceil(projects.count / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user projects error:', error);
    res.status(500).json({ message: 'Server error fetching user projects' });
  }
});

module.exports = router;
