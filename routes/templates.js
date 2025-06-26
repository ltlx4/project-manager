const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { Project, Task, User, ProjectMember } = require('../models');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Predefined project templates
const PROJECT_TEMPLATES = {
  'web-development': {
    name: 'Web Development Project',
    description: 'Template for web development projects with common tasks',
    tasks: [
      {
        title: 'Project Setup',
        description: 'Initialize project structure, dependencies, and development environment',
        priority: 'high',
        estimatedHours: 8,
        tags: ['setup', 'initialization']
      },
      {
        title: 'Database Design',
        description: 'Design database schema and relationships',
        priority: 'high',
        estimatedHours: 12,
        tags: ['database', 'design']
      },
      {
        title: 'API Development',
        description: 'Develop REST API endpoints',
        priority: 'high',
        estimatedHours: 24,
        tags: ['api', 'backend']
      },
      {
        title: 'Frontend Development',
        description: 'Develop user interface components',
        priority: 'medium',
        estimatedHours: 32,
        tags: ['frontend', 'ui']
      },
      {
        title: 'Authentication System',
        description: 'Implement user authentication and authorization',
        priority: 'high',
        estimatedHours: 16,
        tags: ['auth', 'security']
      },
      {
        title: 'Testing',
        description: 'Write and execute unit and integration tests',
        priority: 'medium',
        estimatedHours: 20,
        tags: ['testing', 'quality']
      },
      {
        title: 'Deployment',
        description: 'Deploy application to production environment',
        priority: 'medium',
        estimatedHours: 8,
        tags: ['deployment', 'production']
      }
    ]
  },
  'mobile-app': {
    name: 'Mobile App Development',
    description: 'Template for mobile application development projects',
    tasks: [
      {
        title: 'Requirements Analysis',
        description: 'Analyze and document app requirements',
        priority: 'high',
        estimatedHours: 16,
        tags: ['requirements', 'analysis']
      },
      {
        title: 'UI/UX Design',
        description: 'Design user interface and user experience',
        priority: 'high',
        estimatedHours: 24,
        tags: ['design', 'ui', 'ux']
      },
      {
        title: 'App Development',
        description: 'Develop mobile application features',
        priority: 'high',
        estimatedHours: 40,
        tags: ['development', 'mobile']
      },
      {
        title: 'API Integration',
        description: 'Integrate with backend APIs',
        priority: 'medium',
        estimatedHours: 16,
        tags: ['api', 'integration']
      },
      {
        title: 'Testing & QA',
        description: 'Test app on different devices and platforms',
        priority: 'high',
        estimatedHours: 20,
        tags: ['testing', 'qa']
      },
      {
        title: 'App Store Submission',
        description: 'Prepare and submit app to app stores',
        priority: 'medium',
        estimatedHours: 8,
        tags: ['submission', 'store']
      }
    ]
  },
  'data-analysis': {
    name: 'Data Analysis Project',
    description: 'Template for data analysis and reporting projects',
    tasks: [
      {
        title: 'Data Collection',
        description: 'Gather and collect required data sources',
        priority: 'high',
        estimatedHours: 12,
        tags: ['data', 'collection']
      },
      {
        title: 'Data Cleaning',
        description: 'Clean and preprocess raw data',
        priority: 'high',
        estimatedHours: 16,
        tags: ['data', 'cleaning']
      },
      {
        title: 'Exploratory Analysis',
        description: 'Perform exploratory data analysis',
        priority: 'medium',
        estimatedHours: 20,
        tags: ['analysis', 'exploration']
      },
      {
        title: 'Statistical Analysis',
        description: 'Apply statistical methods and models',
        priority: 'high',
        estimatedHours: 24,
        tags: ['statistics', 'modeling']
      },
      {
        title: 'Visualization',
        description: 'Create charts and visualizations',
        priority: 'medium',
        estimatedHours: 16,
        tags: ['visualization', 'charts']
      },
      {
        title: 'Report Generation',
        description: 'Generate final analysis report',
        priority: 'medium',
        estimatedHours: 12,
        tags: ['report', 'documentation']
      }
    ]
  },
  'marketing-campaign': {
    name: 'Marketing Campaign',
    description: 'Template for marketing campaign projects',
    tasks: [
      {
        title: 'Campaign Strategy',
        description: 'Develop campaign strategy and objectives',
        priority: 'high',
        estimatedHours: 8,
        tags: ['strategy', 'planning']
      },
      {
        title: 'Target Audience Research',
        description: 'Research and define target audience',
        priority: 'high',
        estimatedHours: 12,
        tags: ['research', 'audience']
      },
      {
        title: 'Content Creation',
        description: 'Create marketing content and materials',
        priority: 'medium',
        estimatedHours: 20,
        tags: ['content', 'creative']
      },
      {
        title: 'Campaign Launch',
        description: 'Launch marketing campaign across channels',
        priority: 'high',
        estimatedHours: 8,
        tags: ['launch', 'execution']
      },
      {
        title: 'Performance Monitoring',
        description: 'Monitor campaign performance and metrics',
        priority: 'medium',
        estimatedHours: 16,
        tags: ['monitoring', 'analytics']
      },
      {
        title: 'Campaign Optimization',
        description: 'Optimize campaign based on performance data',
        priority: 'medium',
        estimatedHours: 12,
        tags: ['optimization', 'improvement']
      }
    ]
  }
};

// Get all available templates
router.get('/', auth, (req, res) => {
  try {
    const templates = Object.keys(PROJECT_TEMPLATES).map(key => ({
      id: key,
      name: PROJECT_TEMPLATES[key].name,
      description: PROJECT_TEMPLATES[key].description,
      taskCount: PROJECT_TEMPLATES[key].tasks.length,
      estimatedHours: PROJECT_TEMPLATES[key].tasks.reduce((total, task) => total + task.estimatedHours, 0)
    }));

    res.json({ templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Server error fetching templates' });
  }
});

// Get specific template details
router.get('/:templateId', auth, param('templateId').isIn(Object.keys(PROJECT_TEMPLATES)), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const template = PROJECT_TEMPLATES[req.params.templateId];
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({
      id: req.params.templateId,
      ...template
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ message: 'Server error fetching template' });
  }
});

// Create project from template
router.post('/:templateId/create', auth, [
  param('templateId').isIn(Object.keys(PROJECT_TEMPLATES)),
  body('name').trim().isLength({ min: 1 }).withMessage('Project name is required'),
  body('description').optional().trim(),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('budget').optional().isDecimal(),
  body('memberIds').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const template = PROJECT_TEMPLATES[req.params.templateId];
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const { name, description, startDate, endDate, priority = 'medium', budget, memberIds = [] } = req.body;

    // Create project
    const project = await Project.create({
      name,
      description: description || template.description,
      status: 'planning',
      priority,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      budget,
      progress: 0,
      ownerId: req.user.userId
    });

    // Add owner as project member
    await ProjectMember.create({
      projectId: project.id,
      userId: req.user.userId,
      role: 'owner'
    });

    // Add additional members if specified
    if (memberIds.length > 0) {
      const memberPromises = memberIds.map(memberId =>
        ProjectMember.create({
          projectId: project.id,
          userId: memberId,
          role: 'member'
        })
      );
      await Promise.all(memberPromises);
    }

    // Create tasks from template
    const taskPromises = template.tasks.map((taskTemplate, index) => {
      const dueDate = startDate 
        ? new Date(new Date(startDate).getTime() + (index + 1) * 7 * 24 * 60 * 60 * 1000) // Each task due 1 week apart
        : null;

      return Task.create({
        title: taskTemplate.title,
        description: taskTemplate.description,
        status: 'todo',
        priority: taskTemplate.priority,
        dueDate,
        estimatedHours: taskTemplate.estimatedHours,
        actualHours: 0,
        tags: taskTemplate.tags,
        projectId: project.id,
        createdById: req.user.userId
      });
    });

    const tasks = await Promise.all(taskPromises);

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
        },
        {
          model: Task,
          as: 'tasks',
          attributes: ['id', 'title', 'status', 'priority', 'dueDate', 'estimatedHours']
        }
      ]
    });

    res.status(201).json({
      message: 'Project created from template successfully',
      project: completeProject,
      template: {
        id: req.params.templateId,
        name: template.name
      }
    });
  } catch (error) {
    console.error('Create project from template error:', error);
    res.status(500).json({ message: 'Server error creating project from template' });
  }
});

// Save project as custom template (admin only)
router.post('/custom', auth, authorize(['admin']), [
  body('name').trim().isLength({ min: 1 }).withMessage('Template name is required'),
  body('description').trim().isLength({ min: 1 }).withMessage('Template description is required'),
  body('projectId').isUUID().withMessage('Valid project ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, projectId } = req.body;

    // Get project with tasks
    const project = await Project.findByPk(projectId, {
      include: [
        {
          model: Task,
          as: 'tasks',
          attributes: ['title', 'description', 'priority', 'estimatedHours', 'tags']
        }
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Create custom template object
    const customTemplate = {
      name,
      description,
      tasks: project.tasks.map(task => ({
        title: task.title,
        description: task.description,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
        tags: task.tags
      })),
      createdBy: req.user.userId,
      createdAt: new Date(),
      sourceProjectId: projectId
    };

    // In a real implementation, you would save this to a CustomTemplate model
    // For now, we'll just return the template structure
    res.status(201).json({
      message: 'Custom template created successfully',
      template: customTemplate
    });
  } catch (error) {
    console.error('Create custom template error:', error);
    res.status(500).json({ message: 'Server error creating custom template' });
  }
});

module.exports = router;
