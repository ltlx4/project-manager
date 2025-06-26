const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { Project, User, Task, ProjectMember } = require('../models');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');
const { htmxResponse, templates } = require('../middleware/htmx');

const router = express.Router();

// Add HTMX middleware
router.use(htmxResponse);

// Get all projects for authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Build where conditions
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Get projects where user is owner or member
    const projects = await Project.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
          through: { attributes: ['role'] },
          where: { id: req.user.userId },
          required: true
        },
        {
          model: Task,
          as: 'tasks',
          attributes: ['id', 'status'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    // Calculate task statistics for each project
    const projectsWithStats = projects.rows.map(project => {
      const tasks = project.tasks || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === 'done').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...project.toJSON(),
        taskStats: {
          total: totalTasks,
          completed: completedTasks,
          progress
        }
      };
    });

    const responseData = {
      projects: projectsWithStats,
      pagination: {
        total: projects.count,
        page: parseInt(page),
        pages: Math.ceil(projects.count / limit),
        limit: parseInt(limit)
      }
    };

    // Use different templates based on context
    const template = req.query.limit ? templates.recentProjects : templates.projectsList;
    res.htmx.respond(responseData, template);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error fetching projects' });
  }
});

// Get single project
router.get('/:id', auth, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
          through: { attributes: ['role'] }
        },
        {
          model: Task,
          as: 'tasks',
          include: [
            {
              model: User,
              as: 'assignee',
              attributes: ['id', 'firstName', 'lastName', 'avatar']
            }
          ],
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    const hasAccess = project.ownerId === req.user.userId || 
                     project.members.some(member => member.id === req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    // Calculate project statistics
    const tasks = project.tasks || [];
    const taskStats = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length
    };

    const projectData = {
      ...project.toJSON(),
      taskStats
    };

    res.json({ project: projectData });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error fetching project' });
  }
});

// Create new project
router.post('/', auth, [
  body('name').trim().isLength({ min: 1 }).withMessage('Project name is required'),
  body('description').optional().trim(),
  body('status').optional().isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('budget').optional().isDecimal()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const projectData = {
      ...req.body,
      ownerId: req.user.userId
    };

    const project = await Project.create(projectData);

    // Add owner as project member with admin role
    await ProjectMember.create({
      projectId: project.id,
      userId: req.user.userId,
      role: 'owner'
    });

    // Fetch complete project data
    const completeProject = await Project.findByPk(project.id, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
          through: { attributes: ['role'] }
        }
      ]
    });

    res.status(201).json({ project: completeProject });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error creating project' });
  }
});

// Update project
router.put('/:id', auth, [
  param('id').isUUID(),
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Project name is required'),
  body('description').optional().trim(),
  body('status').optional().isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('budget').optional().isDecimal()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    const hasAccess = project.ownerId === req.user.userId || 
                     project.members.some(member => member.id === req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    await project.update(req.body);

    res.json({ project });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error updating project' });
  }
});

// Delete project
router.delete('/:id', auth, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    const hasAccess = project.ownerId === req.user.userId || 
                     project.members.some(member => member.id === req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    await project.destroy();

    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error deleting project' });
  }
});

// Add member to project
router.post('/:id/members', auth, [
  param('id').isUUID(),
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('role').optional().isIn(['admin', 'member', 'viewer']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, role = 'member' } = req.body;
    const projectId = req.params.id;

    // Check if user has admin access to this project
    const project = await Project.findOne({
      where: { id: projectId },
      include: [
        {
          model: User,
          as: 'members',
          where: { id: req.user.userId },
          through: {
            attributes: ['role'],
            where: { role: ['owner', 'admin'] }
          },
          required: true
        }
      ]
    });

    if (!project) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Check if user exists and is active
    const userToAdd = await User.findOne({
      where: { id: userId, isActive: true },
      attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
    });

    if (!userToAdd) {
      return res.status(404).json({ message: 'User not found or inactive' });
    }

    // Check if user is already a member
    const existingMember = await ProjectMember.findOne({
      where: { projectId, userId }
    });

    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member of this project' });
    }

    // Add user to project
    await ProjectMember.create({
      projectId,
      userId,
      role
    });

    res.status(201).json({
      message: 'Member added successfully',
      member: {
        ...userToAdd.toJSON(),
        ProjectMember: { role }
      }
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error adding member' });
  }
});

// Update member role
router.put('/:id/members/:userId', auth, [
  param('id').isUUID(),
  param('userId').isUUID(),
  body('role').isIn(['admin', 'member', 'viewer']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { role } = req.body;
    const projectId = req.params.id;
    const userId = req.params.userId;

    // Check if user has admin access to this project
    const project = await Project.findOne({
      where: { id: projectId },
      include: [
        {
          model: User,
          as: 'members',
          where: { id: req.user.userId },
          through: {
            attributes: ['role'],
            where: { role: ['owner', 'admin'] }
          },
          required: true
        }
      ]
    });

    if (!project) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Cannot change owner role
    const memberToUpdate = await ProjectMember.findOne({
      where: { projectId, userId }
    });

    if (!memberToUpdate) {
      return res.status(404).json({ message: 'Member not found in this project' });
    }

    if (memberToUpdate.role === 'owner') {
      return res.status(400).json({ message: 'Cannot change owner role' });
    }

    await memberToUpdate.update({ role });

    res.json({ message: 'Member role updated successfully' });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ message: 'Server error updating member role' });
  }
});

// Remove member from project
router.delete('/:id/members/:userId', auth, [
  param('id').isUUID(),
  param('userId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const projectId = req.params.id;
    const userId = req.params.userId;

    // Check if user has admin access to this project
    const project = await Project.findOne({
      where: { id: projectId },
      include: [
        {
          model: User,
          as: 'members',
          where: { id: req.user.userId },
          through: {
            attributes: ['role'],
            where: { role: ['owner', 'admin'] }
          },
          required: true
        }
      ]
    });

    if (!project) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Find the member to remove
    const memberToRemove = await ProjectMember.findOne({
      where: { projectId, userId }
    });

    if (!memberToRemove) {
      return res.status(404).json({ message: 'Member not found in this project' });
    }

    // Cannot remove owner
    if (memberToRemove.role === 'owner') {
      return res.status(400).json({ message: 'Cannot remove project owner' });
    }

    // Remove member
    await memberToRemove.destroy();

    // Unassign user from all tasks in this project
    await Task.update(
      { assigneeId: null },
      { where: { projectId, assigneeId: userId } }
    );

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error removing member' });
  }
});

// Get project members
router.get('/:id/members', auth, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const projectId = req.params.id;

    // Check if user has access to this project
    const project = await Project.findOne({
      where: { id: projectId },
      include: [
        {
          model: User,
          as: 'members',
          where: { id: req.user.userId },
          attributes: [],
          through: { attributes: [] },
          required: true
        }
      ]
    });

    if (!project) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    // Get all project members
    const members = await User.findAll({
      include: [
        {
          model: Project,
          as: 'projects',
          where: { id: projectId },
          attributes: [],
          through: { attributes: ['role', 'joinedAt'] },
          required: true
        }
      ],
      attributes: ['id', 'firstName', 'lastName', 'email', 'avatar', 'role'],
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });

    res.json({ members });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ message: 'Server error fetching members' });
  }
});

module.exports = router;
