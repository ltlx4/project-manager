const { sequelize } = require('../models');

// Test database setup
beforeAll(async () => {
  // Use test database
  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = 'project_manager_test';
  
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    console.log('✅ Test database connected and synced');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
});

// Clean up after all tests
afterAll(async () => {
  try {
    await sequelize.close();
    console.log('✅ Test database connection closed');
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error);
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    // Clear all tables
    await sequelize.truncate({ cascade: true, restartIdentity: true });
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
  }
});
