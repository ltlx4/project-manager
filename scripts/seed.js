const bcrypt = require('bcryptjs');
const { User, Project, Task, ProjectMember, Notification } = require('../models');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const userData = [
      {
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true
      },
      {
        email: 'manager@example.com',
        password: hashedPassword,
        firstName: 'Project',
        lastName: 'Manager',
        role: 'manager',
        isActive: true
      },
      {
        email: 'john.doe@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'member',
        isActive: true
      },
      {
        email: 'jane.smith@example.com',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'member',
        isActive: true
      },
      {
        email: 'bob.wilson@example.com',
        password: hashedPassword,
        firstName: 'Bob',
        lastName: 'Wilson',
        role: 'member',
        isActive: true
      }
    ];

    // Create users one by one to get proper IDs
    const users = [];
    for (const user of userData) {
      const [createdUser] = await User.findOrCreate({
        where: { email: user.email },
        defaults: user
      });
      users.push(createdUser);
    }

    console.log('✅ Users created');

    // Create projects
    const projects = await Project.bulkCreate([
      {
        name: 'E-commerce Platform',
        description: 'Building a modern e-commerce platform with React and Node.js',
        status: 'active',
        priority: 'high',
        ownerId: users[1].id, // Project Manager
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        budget: 50000.00,
        progress: 65
      },
      {
        name: 'Mobile App Development',
        description: 'Cross-platform mobile app using React Native',
        status: 'planning',
        priority: 'medium',
        ownerId: users[1].id,
        startDate: new Date('2024-02-15'),
        endDate: new Date('2024-08-15'),
        budget: 35000.00,
        progress: 25
      },
      {
        name: 'Data Analytics Dashboard',
        description: 'Real-time analytics dashboard for business intelligence',
        status: 'active',
        priority: 'urgent',
        ownerId: users[0].id, // Admin
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-05-15'),
        budget: 25000.00,
        progress: 80
      },
      {
        name: 'Website Redesign',
        description: 'Complete redesign of company website',
        status: 'completed',
        priority: 'low',
        ownerId: users[1].id,
        startDate: new Date('2023-10-01'),
        endDate: new Date('2023-12-31'),
        budget: 15000.00,
        progress: 100
      }
    ], { ignoreDuplicates: true });

    console.log('✅ Projects created');

    // Add project members
    const projectMembers = [];
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      
      // Add owner as admin
      projectMembers.push({
        projectId: project.id,
        userId: project.ownerId,
        role: 'admin',
        joinedAt: new Date()
      });

      // Add other members
      for (let j = 2; j < users.length; j++) {
        if (Math.random() > 0.3) { // 70% chance to add member
          projectMembers.push({
            projectId: project.id,
            userId: users[j].id,
            role: Math.random() > 0.7 ? 'admin' : 'member',
            joinedAt: new Date()
          });
        }
      }
    }

    await ProjectMember.bulkCreate(projectMembers, { ignoreDuplicates: true });
    console.log('✅ Project members added');

    // Create tasks
    const tasks = [];
    const taskStatuses = ['todo', 'in-progress', 'review', 'done'];
    const priorities = ['low', 'medium', 'high', 'urgent'];
    
    const taskTemplates = [
      'Setup project structure',
      'Design database schema',
      'Implement user authentication',
      'Create API endpoints',
      'Build frontend components',
      'Write unit tests',
      'Setup CI/CD pipeline',
      'Deploy to staging',
      'Performance optimization',
      'Security audit',
      'User acceptance testing',
      'Documentation',
      'Code review',
      'Bug fixes',
      'Feature implementation'
    ];

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const numTasks = Math.floor(Math.random() * 8) + 5; // 5-12 tasks per project
      
      for (let j = 0; j < numTasks; j++) {
        const template = taskTemplates[Math.floor(Math.random() * taskTemplates.length)];
        const assigneeIndex = Math.floor(Math.random() * users.length);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 30) + 1);
        
        tasks.push({
          title: `${template} - ${project.name}`,
          description: `Detailed description for ${template.toLowerCase()} task in ${project.name}`,
          status: taskStatuses[Math.floor(Math.random() * taskStatuses.length)],
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          projectId: project.id,
          assigneeId: users[assigneeIndex].id,
          createdById: project.ownerId,
          dueDate: dueDate,
          estimatedHours: Math.floor(Math.random() * 20) + 5,
          actualHours: Math.floor(Math.random() * 15),
          tags: ['development', 'frontend', 'backend', 'testing'].slice(0, Math.floor(Math.random() * 3) + 1)
        });
      }
    }

    await Task.bulkCreate(tasks, { ignoreDuplicates: true });
    console.log('✅ Tasks created');

    // Create notifications
    const notifications = [];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const numNotifications = Math.floor(Math.random() * 5) + 2;
      
      for (let j = 0; j < numNotifications; j++) {
        notifications.push({
          type: ['task_assigned', 'task_completed', 'project_update', 'comment_added'][Math.floor(Math.random() * 4)],
          title: 'Sample Notification',
          message: `This is a sample notification for ${user.firstName}`,
          userId: user.id,
          isRead: Math.random() > 0.5,
          data: { sampleData: true }
        });
      }
    }

    await Notification.bulkCreate(notifications, { ignoreDuplicates: true });
    console.log('✅ Notifications created');

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Sample accounts:');
    console.log('Admin: admin@example.com / password123');
    console.log('Manager: manager@example.com / password123');
    console.log('Member: john.doe@example.com / password123');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

module.exports = seedDatabase;

// Run if called directly
if (require.main === module) {
  const { sequelize } = require('../models');
  
  seedDatabase().then(() => {
    sequelize.close();
    process.exit(0);
  }).catch(error => {
    console.error(error);
    process.exit(1);
  });
}
