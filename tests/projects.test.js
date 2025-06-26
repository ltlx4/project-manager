const request = require('supertest');
const app = require('../server');
require('./setup');
const { 
  createTestUser, 
  createTestAdmin,
  createTestManager,
  generateToken,
  createTestProject,
  createMultipleUsers,
  addUserToProject,
  expectValidationError,
  expectSuccessResponse,
  expectErrorResponse
} = require('./helpers/testUtils');

describe('Project Routes', () => {
  let testUser, testManager, testAdmin, userToken, managerToken, adminToken;

  beforeEach(async () => {
    testUser = await createTestUser();
    testManager = await createTestManager();
    testAdmin = await createTestAdmin();
    
    userToken = generateToken(testUser);
    managerToken = generateToken(testManager);
    adminToken = generateToken(testAdmin);
  });

  describe('GET /api/projects', () => {
    let project1, project2;

    beforeEach(async () => {
      project1 = await createTestProject(testManager.id, {
        name: 'Project One',
        status: 'active',
        priority: 'high'
      });
      
      project2 = await createTestProject(testManager.id, {
        name: 'Project Two',
        status: 'planning',
        priority: 'medium'
      });

      // Add testUser to project1
      await addUserToProject(project1.id, testUser.id, 'member');
    });

    it('should get projects for authenticated user', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${userToken}`);

      expectSuccessResponse(response);
      expect(response.body.projects).toBeDefined();
      expect(response.body.projects.length).toBe(1);
      expect(response.body.projects[0].id).toBe(project1.id);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter projects by status', async () => {
      // Add user to both projects
      await addUserToProject(project2.id, testUser.id, 'member');

      const response = await request(app)
        .get('/api/projects?status=active')
        .set('Authorization', `Bearer ${userToken}`);

      expectSuccessResponse(response);
      expect(response.body.projects.length).toBe(1);
      expect(response.body.projects[0].status).toBe('active');
    });

    it('should filter projects by priority', async () => {
      await addUserToProject(project2.id, testUser.id, 'member');

      const response = await request(app)
        .get('/api/projects?priority=high')
        .set('Authorization', `Bearer ${userToken}`);

      expectSuccessResponse(response);
      expect(response.body.projects.length).toBe(1);
      expect(response.body.projects[0].priority).toBe('high');
    });

    it('should search projects by name', async () => {
      await addUserToProject(project2.id, testUser.id, 'member');

      const response = await request(app)
        .get('/api/projects?search=One')
        .set('Authorization', `Bearer ${userToken}`);

      expectSuccessResponse(response);
      expect(response.body.projects.length).toBe(1);
      expect(response.body.projects[0].name).toContain('One');
    });

    it('should paginate projects', async () => {
      await addUserToProject(project2.id, testUser.id, 'member');

      const response = await request(app)
        .get('/api/projects?page=1&limit=1')
        .set('Authorization', `Bearer ${userToken}`);

      expectSuccessResponse(response);
      expect(response.body.projects.length).toBe(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should not get projects without authentication', async () => {
      const response = await request(app)
        .get('/api/projects');

      expectErrorResponse(response, 401, 'No token provided');
    });
  });

  describe('GET /api/projects/:id', () => {
    let project;

    beforeEach(async () => {
      project = await createTestProject(testManager.id);
      await addUserToProject(project.id, testUser.id, 'member');
    });

    it('should get single project with access', async () => {
      const response = await request(app)
        .get(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectSuccessResponse(response);
      expect(response.body.project).toBeDefined();
      expect(response.body.project.id).toBe(project.id);
      expect(response.body.project.taskStats).toBeDefined();
    });

    it('should not get project without access', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherToken = generateToken(otherUser);

      const response = await request(app)
        .get(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expectErrorResponse(response, 403, 'Access denied');
    });

    it('should not get non-existent project', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/projects/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 404, 'Project not found');
    });

    it('should not get project with invalid UUID', async () => {
      const response = await request(app)
        .get('/api/projects/invalid-uuid')
        .set('Authorization', `Bearer ${userToken}`);

      expectValidationError(response, 'id');
    });
  });

  describe('POST /api/projects', () => {
    it('should create project successfully', async () => {
      const projectData = {
        name: 'New Project',
        description: 'A new test project',
        status: 'planning',
        priority: 'high',
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        budget: 25000.00
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send(projectData);

      expectSuccessResponse(response, 201);
      expect(response.body.project).toBeDefined();
      expect(response.body.project.name).toBe(projectData.name);
      expect(response.body.project.ownerId).toBe(testUser.id);
      expect(response.body.project.owner).toBeDefined();
      expect(response.body.project.members).toBeDefined();
      expect(response.body.project.members.length).toBe(1);
      expect(response.body.project.members[0].ProjectMember.role).toBe('owner');
    });

    it('should create project with minimal data', async () => {
      const projectData = {
        name: 'Minimal Project'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send(projectData);

      expectSuccessResponse(response, 201);
      expect(response.body.project.name).toBe(projectData.name);
      expect(response.body.project.status).toBe('planning'); // default
      expect(response.body.project.priority).toBe('medium'); // default
    });

    it('should not create project without name', async () => {
      const projectData = {
        description: 'Project without name'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send(projectData);

      expectValidationError(response, 'name', 'required');
    });

    it('should not create project with empty name', async () => {
      const projectData = {
        name: '   ',
        description: 'Project with empty name'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send(projectData);

      expectValidationError(response, 'name', 'required');
    });

    it('should not create project with invalid status', async () => {
      const projectData = {
        name: 'Test Project',
        status: 'invalid-status'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send(projectData);

      expectValidationError(response, 'status');
    });

    it('should not create project with invalid priority', async () => {
      const projectData = {
        name: 'Test Project',
        priority: 'invalid-priority'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send(projectData);

      expectValidationError(response, 'priority');
    });

    it('should not create project with invalid date format', async () => {
      const projectData = {
        name: 'Test Project',
        startDate: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send(projectData);

      expectValidationError(response, 'startDate');
    });

    it('should not create project without authentication', async () => {
      const projectData = {
        name: 'Unauthorized Project'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData);

      expectErrorResponse(response, 401, 'No token provided');
    });
  });

  describe('PUT /api/projects/:id', () => {
    let project;

    beforeEach(async () => {
      project = await createTestProject(testUser.id);
    });

    it('should update project as owner', async () => {
      const updateData = {
        name: 'Updated Project Name',
        description: 'Updated description',
        status: 'active',
        priority: 'urgent'
      };

      const response = await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.project.name).toBe(updateData.name);
      expect(response.body.project.description).toBe(updateData.description);
      expect(response.body.project.status).toBe(updateData.status);
      expect(response.body.project.priority).toBe(updateData.priority);
    });

    it('should update project as member with admin role', async () => {
      await addUserToProject(project.id, testManager.id, 'admin');

      const updateData = {
        name: 'Updated by Admin Member'
      };

      const response = await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.project.name).toBe(updateData.name);
    });

    it('should not update project without access', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherToken = generateToken(otherUser);

      const updateData = {
        name: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(updateData);

      expectErrorResponse(response, 403, 'Access denied');
    });

    it('should not update non-existent project', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .put(`/api/projects/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Update' });

      expectErrorResponse(response, 404, 'Project not found');
    });

    it('should not update project with invalid data', async () => {
      const updateData = {
        name: '',
        status: 'invalid-status'
      };

      const response = await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('DELETE /api/projects/:id', () => {
    let project;

    beforeEach(async () => {
      project = await createTestProject(testUser.id);
    });

    it('should delete project as owner', async () => {
      const response = await request(app)
        .delete(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectSuccessResponse(response);
      expect(response.body.message).toBe('Project deleted');
    });

    it('should not delete project without access', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherToken = generateToken(otherUser);

      const response = await request(app)
        .delete(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expectErrorResponse(response, 403, 'Access denied');
    });

    it('should not delete non-existent project', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .delete(`/api/projects/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 404, 'Project not found');
    });

    it('should not delete project with invalid UUID', async () => {
      const response = await request(app)
        .delete('/api/projects/invalid-uuid')
        .set('Authorization', `Bearer ${userToken}`);

      expectValidationError(response, 'id');
    });
  });
});
