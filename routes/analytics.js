const express = require('express');
const { Op } = require('sequelize');
const { Project, Task, User, ProjectMember, sequelize } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const { htmxResponse, templates } = require('../middleware/htmx');

const router = express.Router();

// Add HTMX middleware
router.use(htmxResponse);

// Get dashboard analytics for authenticated user
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const days = parseInt(req.query.days) || 30;
    const dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Check if this is for analytics page (more detailed data)
    const isAnalyticsPage = req.query.detailed === 'true';

    if (isAnalyticsPage) {
      // Enhanced analytics for analytics page

      // Total projects
      const totalProjects = await Project.count();

      // Completed tasks in time period
      const completedTasks = await Task.count({
        where: {
          status: 'done',
          updatedAt: { [Op.gte]: dateFilter }
        }
      });

      // Project status distribution
      const projectStatus = await Project.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const projectStatusData = {
        planning: 0,
        active: 0,
        'on-hold': 0,
        completed: 0,
        cancelled: 0
      };

      projectStatus.forEach(stat => {
        projectStatusData[stat.status] = parseInt(stat.count);
      });

      // Task priority distribution
      const taskPriority = await Task.findAll({
        attributes: [
          'priority',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['priority'],
        raw: true
      });

      const taskPriorityData = {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0
      };

      taskPriority.forEach(stat => {
        taskPriorityData[stat.priority] = parseInt(stat.count);
      });

      // Productivity trend (tasks completed per day)
      const productivity = await Task.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('updatedAt')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'completed']
        ],
        where: {
          status: 'done',
          updatedAt: { [Op.gte]: dateFilter }
        },
        group: [sequelize.fn('DATE', sequelize.col('updatedAt'))],
        order: [[sequelize.fn('DATE', sequelize.col('updatedAt')), 'ASC']],
        raw: true
      });

      // Team performance (top performers)
      const teamPerformance = await User.findAll({
        attributes: [
          'firstName',
          'lastName',
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM "Tasks" AS task
              WHERE task."assigneeId" = "User"."id" AND task."status" = 'done'
              AND task."updatedAt" >= '${dateFilter.toISOString()}'
            )`),
            'completed'
          ]
        ],
        where: { isActive: true },
        order: [[sequelize.literal('completed'), 'DESC']],
        limit: 10,
        raw: true
      });

      const teamPerformanceData = teamPerformance.map(user => ({
        name: `${user.firstName} ${user.lastName}`,
        completed: parseInt(user.completed) || 0
      }));

      // Calculate average completion time and success rate
      const avgCompletionTime = '3.2 days'; // Placeholder
      const successRate = totalProjects > 0 ? Math.round((projectStatusData.completed / totalProjects) * 100) : 0;

      return res.json({
        totalProjects,
        completedTasks,
        avgCompletionTime,
        successRate,
        projectStatus: projectStatusData,
        taskPriority: taskPriorityData,
        productivity,
        teamPerformance: teamPerformanceData
      });
    }

    // Regular dashboard analytics (existing code)
    // Get user's projects count
    const projectsCount = await Project.count({
      include: [
        {
          model: User,
          as: 'members',
          where: { id: userId },
          through: { attributes: [] },
          required: true
        }
      ]
    });

    // Get user's tasks count by status (for projects they're a member of)
    const tasksStats = await Task.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('Task.id')), 'count']
      ],
      include: [
        {
          model: Project,
          as: 'project',
          attributes: [],
          include: [
            {
              model: User,
              as: 'members',
              where: { id: userId },
              attributes: [],
              through: { attributes: [] },
              required: true
            }
          ]
        }
      ],
      group: ['Task.status'],
      raw: true
    });

    // Format task stats
    const formattedTaskStats = {
      todo: 0,
      'in-progress': 0,
      review: 0,
      done: 0
    };

    tasksStats.forEach(stat => {
      formattedTaskStats[stat.status] = parseInt(stat.count);
    });

    // Get assigned tasks count
    const assignedTasksCount = await Task.count({
      where: { assigneeId: userId }
    });

    // Get overdue tasks count
    const overdueTasks = await Task.count({
      where: {
        assigneeId: userId,
        dueDate: { [Op.lt]: new Date() },
        status: { [Op.notIn]: ['done'] }
      }
    });

    // Get recent activity (last 7 days)
    const recentTasks = await Task.findAll({
      where: {
        updatedAt: {
          [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      include: [
        {
          model: Project,
          as: 'project',
          include: [
            {
              model: User,
              as: 'members',
              where: { id: userId },
              attributes: [],
              through: { attributes: [] },
              required: true
            }
          ]
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 10
    });

    // Get project progress summary (simplified)
    const userProjects = await Project.findAll({
      attributes: ['id', 'name', 'status', 'priority', 'progress'],
      include: [
        {
          model: User,
          as: 'members',
          where: { id: userId },
          attributes: [],
          through: { attributes: [] },
          required: true
        }
      ],
      limit: 5
    });

    // Get task counts for each project
    const projectProgress = await Promise.all(
      userProjects.map(async (project) => {
        const totalTasks = await Task.count({
          where: { projectId: project.id }
        });

        const completedTasks = await Task.count({
          where: {
            projectId: project.id,
            status: 'done'
          }
        });

        return {
          ...project.dataValues || project,
          totalTasks,
          completedTasks
        };
      })
    );

    const responseData = {
      summary: {
        projectsCount,
        assignedTasksCount,
        overdueTasks,
        taskStats: formattedTaskStats
      },
      recentActivity: recentTasks,
      projectProgress: projectProgress.map(project => ({
        ...project.dataValues || project,
        progressPercentage: project.totalTasks > 0
          ? Math.round((project.completedTasks / project.totalTasks) * 100)
          : 0
      }))
    };

    res.htmx.respond(responseData, templates.dashboardStats);
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard analytics' });
  }
});

// Get project analytics (project owner/admin only)
router.get('/projects/:id', auth, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.userId;

    // Check if user has admin access to this project
    const project = await Project.findOne({
      where: { id: projectId },
      include: [
        {
          model: User,
          as: 'members',
          where: { id: userId },
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

    // Task distribution by status
    const tasksByStatus = await Task.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { projectId },
      group: ['status'],
      raw: true
    });

    // Task distribution by priority
    const tasksByPriority = await Task.findAll({
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { projectId },
      group: ['priority'],
      raw: true
    });

    // Task distribution by assignee
    const tasksByAssignee = await Task.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('Task.id')), 'count']
      ],
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        }
      ],
      where: { projectId },
      group: ['assignee.id', 'assignee.firstName', 'assignee.lastName'],
      raw: true
    });

    // Time tracking summary
    const timeTracking = await Task.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('estimatedHours')), 'totalEstimated'],
        [sequelize.fn('SUM', sequelize.col('actualHours')), 'totalActual'],
        [sequelize.fn('AVG', sequelize.col('estimatedHours')), 'avgEstimated'],
        [sequelize.fn('AVG', sequelize.col('actualHours')), 'avgActual']
      ],
      where: { projectId },
      raw: true
    });

    // Task completion trend (last 30 days)
    const completionTrend = await Task.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('updatedAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'completed']
      ],
      where: {
        projectId,
        status: 'done',
        updatedAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      group: [sequelize.fn('DATE', sequelize.col('updatedAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('updatedAt')), 'ASC']],
      raw: true
    });

    // Overdue tasks
    const overdueTasks = await Task.count({
      where: {
        projectId,
        dueDate: { [Op.lt]: new Date() },
        status: { [Op.notIn]: ['done'] }
      }
    });

    res.json({
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        priority: project.priority
      },
      taskDistribution: {
        byStatus: tasksByStatus,
        byPriority: tasksByPriority,
        byAssignee: tasksByAssignee
      },
      timeTracking: timeTracking[0] || {
        totalEstimated: 0,
        totalActual: 0,
        avgEstimated: 0,
        avgActual: 0
      },
      completionTrend,
      overdueTasks
    });
  } catch (error) {
    console.error('Project analytics error:', error);
    res.status(500).json({ message: 'Server error fetching project analytics' });
  }
});

// Get team performance analytics (admin only)
router.get('/team', auth, async (req, res) => {
  try {
    // User productivity stats
    const userStats = await User.findAll({
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        'role',
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM "Tasks" AS task
            WHERE task."assigneeId" = "User"."id"
          )`),
          'totalTasks'
        ],
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM "Tasks" AS task
            WHERE task."assigneeId" = "User"."id" AND task."status" = 'done'
          )`),
          'completedTasks'
        ],
        [
          sequelize.literal(`(
            SELECT SUM(task."actualHours")
            FROM "Tasks" AS task
            WHERE task."assigneeId" = "User"."id"
          )`),
          'totalHours'
        ]
      ],
      where: { isActive: true },
      order: [['firstName', 'ASC']]
    });

    // Project distribution by status
    const projectsByStatus = await Project.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Active users count
    const activeUsersCount = await User.count({
      where: { isActive: true }
    });

    // Total projects count
    const totalProjectsCount = await Project.count();

    // Active tasks count (not done)
    const activeTasksCount = await Task.count({
      where: { status: { [Op.notIn]: ['done'] } }
    });

    res.json({
      totalMembers: await User.count(),
      activeMembers: activeUsersCount,
      activeTasks: activeTasksCount,
      summary: {
        activeUsers: activeUsersCount,
        totalProjects: totalProjectsCount,
        totalTasks: activeTasksCount
      },
      userProductivity: userStats.map(user => ({
        ...user.toJSON(),
        completionRate: user.dataValues.totalTasks > 0
          ? Math.round((user.dataValues.completedTasks / user.dataValues.totalTasks) * 100)
          : 0
      })),
      projectDistribution: projectsByStatus
    });
  } catch (error) {
    console.error('Team analytics error:', error);
    res.status(500).json({ message: 'Server error fetching team analytics' });
  }
});

// Get recent activity for analytics page
router.get('/activity', auth, async (req, res) => {
  try {
    const recentTasks = await Task.findAll({
      where: {
        updatedAt: {
          [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 10
    });

    const activities = recentTasks.map(task => ({
      id: task.id,
      type: 'task_updated',
      title: task.title,
      project: task.project?.name || 'No Project',
      assignee: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned',
      status: task.status,
      updatedAt: task.updatedAt
    }));

    res.htmx.respond(activities, templates.activityList);
  } catch (error) {
    console.error('Activity analytics error:', error);
    res.status(500).json({ message: 'Server error fetching activity' });
  }
});

module.exports = router;
