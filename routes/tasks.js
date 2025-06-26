const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { Task, Project, User, Comment, ProjectMember } = require('../models');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');
const { htmxResponse, templates } = require('../middleware/htmx');

const router = express.Router();

// Add HTMX middleware
router.use(htmxResponse);

// Get all tasks for authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      projectId, 
      assigneeId, 
      search, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;

    // Build where conditions
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Get tasks from projects where user has access
    const tasks = await Task.findAndCountAll({
      where,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status'],
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
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    const responseData = {
      tasks: tasks.rows,
      pagination: {
        total: tasks.count,
        page: parseInt(page),
        pages: Math.ceil(tasks.count / limit),
        limit: parseInt(limit)
      }
    };

    // Use different templates based on context
    const template = req.query.limit ? templates.recentTasks : templates.tasksList;
    res.htmx.respond(responseData, template);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error fetching tasks' });
  }
});

// Get single task
router.get('/:id', auth, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Task.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status'],
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
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: Comment,
          as: 'comments',
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'firstName', 'lastName', 'avatar']
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found or access denied' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error fetching task' });
  }
});

// Create new task
router.post('/', auth, [
  body('title').trim().isLength({ min: 1 }).withMessage('Task title is required'),
  body('description').optional().trim(),
  body('projectId').isUUID().withMessage('Valid project ID is required'),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assigneeId').optional().isUUID(),
  body('dueDate').optional().isISO8601(),
  body('estimatedHours').optional().isInt({ min: 0 }),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    console.log('Task creation request body:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Task validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Remove empty id field if present
    const taskData = { ...req.body };
    if (taskData.id === '' || taskData.id === null || taskData.id === undefined) {
      delete taskData.id;
    }
    console.log('Cleaned task data:', taskData);

    const { projectId, assigneeId } = taskData;

    // Check if user has access to the project
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

    // If assigneeId is provided, verify they are a project member
    if (assigneeId) {
      const assignee = await User.findOne({
        include: [
          {
            model: Project,
            as: 'projects',
            where: { id: projectId },
            attributes: [],
            through: { attributes: [] },
            required: true
          }
        ],
        where: { id: assigneeId }
      });

      if (!assignee) {
        return res.status(400).json({ message: 'Assignee is not a member of this project' });
      }
    }

    const task = await Task.create({
      ...taskData,
      projectId,
      assigneeId,
      createdById: req.user.userId
    });

    // Fetch complete task data
    const completeTask = await Task.findByPk(task.id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        }
      ]
    });

    res.status(201).json({ task: completeTask });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error creating task' });
  }
});

// Update task
router.put('/:id', auth, [
  param('id').isUUID(),
  body('title').optional().trim().isLength({ min: 1 }).withMessage('Task title cannot be empty'),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assigneeId').optional().isUUID(),
  body('dueDate').optional().isISO8601(),
  body('estimatedHours').optional().isInt({ min: 0 }),
  body('actualHours').optional().isInt({ min: 0 }),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Task.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Project,
          as: 'project',
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
        }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found or access denied' });
    }

    const { assigneeId, ...updateData } = req.body;

    // If assigneeId is being updated, verify they are a project member
    if (assigneeId !== undefined) {
      if (assigneeId) {
        const assignee = await User.findOne({
          include: [
            {
              model: Project,
              as: 'projects',
              where: { id: task.projectId },
              attributes: [],
              through: { attributes: [] },
              required: true
            }
          ],
          where: { id: assigneeId }
        });

        if (!assignee) {
          return res.status(400).json({ message: 'Assignee is not a member of this project' });
        }
      }
      updateData.assigneeId = assigneeId;
    }

    await task.update(updateData);

    // Fetch updated task data
    const updatedTask = await Task.findByPk(task.id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        }
      ]
    });

    res.json({ task: updatedTask });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error updating task' });
  }
});

// Delete task
router.delete('/:id', auth, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Task.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Project,
          as: 'project',
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
        }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found or access denied' });
    }

    await task.destroy();

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error deleting task' });
  }
});

// Add comment to task
router.post('/:id/comments', auth, [
  param('id').isUUID(),
  body('content').trim().isLength({ min: 1 }).withMessage('Comment content is required'),
  body('type').optional().isIn(['comment', 'status-change', 'assignment'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Task.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Project,
          as: 'project',
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
        }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found or access denied' });
    }

    const comment = await Comment.create({
      content: req.body.content,
      type: req.body.type || 'comment',
      taskId: task.id,
      authorId: req.user.userId
    });

    // Fetch complete comment data
    const completeComment = await Comment.findByPk(comment.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        }
      ]
    });

    res.status(201).json({ comment: completeComment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error adding comment' });
  }
});

module.exports = router;
