const bcrypt = require('bcryptjs');
const { User, Project, Task, Comment, ProjectMember, sequelize } = require('../models');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await sequelize.sync({ force: true });
    console.log('✅ Database tables created/reset');

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const users = await User.bulkCreate([
      {
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff'
      },
      {
        email: 'manager@example.com',
        password: hashedPassword,
        firstName: 'Project',
        lastName: 'Manager',
        role: 'manager',
        avatar: 'https://ui-avatars.com/api/?name=Project+Manager&background=28A745&color=fff'
      },
      {
        email: 'john.doe@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'member',
        avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=6F42C1&color=fff'
      },
      {
        email: 'jane.smith@example.com',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'member',
        avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=E83E8C&color=fff'
      },
      {
        email: 'bob.wilson@example.com',
        password: hashedPassword,
        firstName: 'Bob',
        lastName: 'Wilson',
        role: 'member',
        avatar: 'https://ui-avatars.com/api/?name=Bob+Wilson&background=FD7E14&color=fff'
      }
    ], { returning: true });

    console.log('✅ Users created');

    // Create projects
    const projects = await Project.bulkCreate([
      {
        name: 'E-commerce Platform',
        description: 'Building a modern e-commerce platform with React and Node.js',
        status: 'active',
        priority: 'high',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        budget: 50000.00,
        progress: 35,
        ownerId: users[1].id // Project Manager
      },
      {
        name: 'Mobile App Development',
        description: 'Cross-platform mobile application using React Native',
        status: 'planning',
        priority: 'medium',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-09-30'),
        budget: 30000.00,
        progress: 10,
        ownerId: users[1].id // Project Manager
      },
      {
        name: 'Data Analytics Dashboard',
        description: 'Real-time analytics dashboard for business intelligence',
        status: 'active',
        priority: 'urgent',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-05-31'),
        budget: 25000.00,
        progress: 60,
        ownerId: users[0].id // Admin
      },
      {
        name: 'API Microservices',
        description: 'Microservices architecture for scalable backend',
        status: 'on-hold',
        priority: 'low',
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-08-31'),
        budget: 40000.00,
        progress: 20,
        ownerId: users[1].id // Project Manager
      }
    ], { returning: true });

    console.log('✅ Projects created');

    // Create project members
    const projectMembers = [];
    
    // E-commerce Platform members
    projectMembers.push(
      { projectId: projects[0].id, userId: users[1].id, role: 'owner' },
      { projectId: projects[0].id, userId: users[2].id, role: 'member' },
      { projectId: projects[0].id, userId: users[3].id, role: 'member' },
      { projectId: projects[0].id, userId: users[4].id, role: 'viewer' }
    );

    // Mobile App Development members
    projectMembers.push(
      { projectId: projects[1].id, userId: users[1].id, role: 'owner' },
      { projectId: projects[1].id, userId: users[2].id, role: 'admin' },
      { projectId: projects[1].id, userId: users[3].id, role: 'member' }
    );

    // Data Analytics Dashboard members
    projectMembers.push(
      { projectId: projects[2].id, userId: users[0].id, role: 'owner' },
      { projectId: projects[2].id, userId: users[2].id, role: 'member' },
      { projectId: projects[2].id, userId: users[4].id, role: 'member' }
    );

    // API Microservices members
    projectMembers.push(
      { projectId: projects[3].id, userId: users[1].id, role: 'owner' },
      { projectId: projects[3].id, userId: users[3].id, role: 'admin' },
      { projectId: projects[3].id, userId: users[4].id, role: 'member' }
    );

    await ProjectMember.bulkCreate(projectMembers);
    console.log('✅ Project members assigned');

    // Create tasks
    const tasks = await Task.bulkCreate([
      // E-commerce Platform tasks
      {
        title: 'Setup project structure',
        description: 'Initialize React project with proper folder structure and dependencies',
        status: 'done',
        priority: 'high',
        dueDate: new Date('2024-01-15'),
        estimatedHours: 8,
        actualHours: 6,
        tags: ['setup', 'react', 'frontend'],
        projectId: projects[0].id,
        assigneeId: users[2].id,
        createdById: users[1].id
      },
      {
        title: 'Design user authentication',
        description: 'Implement user registration, login, and JWT authentication',
        status: 'in-progress',
        priority: 'high',
        dueDate: new Date('2024-02-01'),
        estimatedHours: 16,
        actualHours: 12,
        tags: ['auth', 'security', 'backend'],
        projectId: projects[0].id,
        assigneeId: users[3].id,
        createdById: users[1].id
      },
      {
        title: 'Product catalog API',
        description: 'Create REST API endpoints for product management',
        status: 'todo',
        priority: 'medium',
        dueDate: new Date('2024-02-15'),
        estimatedHours: 20,
        actualHours: 0,
        tags: ['api', 'products', 'backend'],
        projectId: projects[0].id,
        assigneeId: users[2].id,
        createdById: users[1].id
      },
      
      // Mobile App Development tasks
      {
        title: 'Research React Native setup',
        description: 'Investigate best practices for React Native development',
        status: 'done',
        priority: 'medium',
        dueDate: new Date('2024-03-10'),
        estimatedHours: 4,
        actualHours: 5,
        tags: ['research', 'react-native', 'mobile'],
        projectId: projects[1].id,
        assigneeId: users[2].id,
        createdById: users[1].id
      },
      {
        title: 'Create wireframes',
        description: 'Design app wireframes and user flow',
        status: 'review',
        priority: 'high',
        dueDate: new Date('2024-03-20'),
        estimatedHours: 12,
        actualHours: 10,
        tags: ['design', 'wireframes', 'ux'],
        projectId: projects[1].id,
        assigneeId: users[3].id,
        createdById: users[1].id
      },

      // Data Analytics Dashboard tasks
      {
        title: 'Database schema design',
        description: 'Design database schema for analytics data',
        status: 'done',
        priority: 'urgent',
        dueDate: new Date('2024-02-10'),
        estimatedHours: 8,
        actualHours: 7,
        tags: ['database', 'schema', 'analytics'],
        projectId: projects[2].id,
        assigneeId: users[2].id,
        createdById: users[0].id
      },
      {
        title: 'Real-time data pipeline',
        description: 'Implement real-time data processing pipeline',
        status: 'in-progress',
        priority: 'urgent',
        dueDate: new Date('2024-03-01'),
        estimatedHours: 24,
        actualHours: 18,
        tags: ['pipeline', 'real-time', 'data'],
        projectId: projects[2].id,
        assigneeId: users[4].id,
        createdById: users[0].id
      }
    ], { returning: true });

    console.log('✅ Tasks created');

    // Create comments
    await Comment.bulkCreate([
      {
        content: 'Great work on the project setup! The folder structure looks clean.',
        type: 'comment',
        taskId: tasks[0].id,
        authorId: users[1].id
      },
      {
        content: 'Task status changed from todo to done',
        type: 'status-change',
        taskId: tasks[0].id,
        authorId: users[2].id
      },
      {
        content: 'I need some clarification on the authentication requirements.',
        type: 'comment',
        taskId: tasks[1].id,
        authorId: users[3].id
      },
      {
        content: 'The wireframes look good, but we might need to adjust the navigation flow.',
        type: 'comment',
        taskId: tasks[4].id,
        authorId: users[1].id
      },
      {
        content: 'Task assigned to Bob Wilson',
        type: 'assignment',
        taskId: tasks[6].id,
        authorId: users[0].id
      }
    ]);

    console.log('✅ Comments created');
    console.log('🎉 Database seeding completed successfully!');
    
    // Print summary
    console.log('\n📊 Seeding Summary:');
    console.log(`- Users: ${users.length}`);
    console.log(`- Projects: ${projects.length}`);
    console.log(`- Project Members: ${projectMembers.length}`);
    console.log(`- Tasks: ${tasks.length}`);
    console.log('- Comments: 5');
    
    console.log('\n👤 Test Users:');
    console.log('- admin@example.com (Admin)');
    console.log('- manager@example.com (Project Manager)');
    console.log('- john.doe@example.com (Member)');
    console.log('- jane.smith@example.com (Member)');
    console.log('- bob.wilson@example.com (Member)');
    console.log('\n🔑 Password for all users: password123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
};

module.exports = { seedDatabase };

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
