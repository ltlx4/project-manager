const request = require('supertest');
const app = require('../server');
require('./setup');
const { 
  createTestUser, 
  generateToken,
  createTestProject,
  createTestTask,
  addUserToProject,
  expectValidationError,
  expectSuccessResponse,
  expectErrorResponse
} = require('./helpers/testUtils');

describe('Task Routes', () => {
  let testUser, testUser2, userToken, user2Token, project, task;

  beforeEach(async () => {
    testUser = await createTestUser();
    testUser2 = await createTestUser({ email: 'user2@example.com' });
    
    userToken = generateToken(testUser);
    user2Token = generateToken(testUser2);
    
    project = await createTestProject(testUser.id);
    await addUserToProject(project.id, testUser2.id, 'member');
    
    task = await createTestTask(project.id, testUser.id);
  });

  describe('GET /api/tasks', () => {
    it('should get tasks for authenticated user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`);

      expectSuccessResponse(response);
      expect(response.body.tasks).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter tasks by project', async () => {
      const response = await request(app)
        .get(`/api/tasks?projectId=${project.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectSuccessResponse(response);
      expect(response.body.tasks.length).toBeGreaterThan(0);
      expect(response.body.tasks[0].project.id).toBe(project.id);
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=todo')
        .set('Authorization', `Bearer ${userToken}`);

      expectSuccessResponse(response);
      if (response.body.tasks.length > 0) {
        expect(response.body.tasks[0].status).toBe('todo');
      }
    });

    it('should not get tasks without authentication', async () => {
      const response = await request(app)
        .get('/api/tasks');

      expectErrorResponse(response, 401, 'No token provided');
    });
  });

  describe('POST /api/tasks', () => {
    it('should create task successfully', async () => {
      const taskData = {
        title: 'New Task',
        description: 'A new test task',
        projectId: project.id,
        status: 'todo',
        priority: 'high',
        assigneeId: testUser2.id,
        dueDate: '2024-02-01',
        estimatedHours: 8,
        tags: ['test', 'new']
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(taskData);

      expectSuccessResponse(response, 201);
      expect(response.body.task).toBeDefined();
      expect(response.body.task.title).toBe(taskData.title);
      expect(response.body.task.projectId).toBe(project.id);
      expect(response.body.task.assigneeId).toBe(testUser2.id);
      expect(response.body.task.createdById).toBe(testUser.id);
    });

    it('should not create task without title', async () => {
      const taskData = {
        description: 'Task without title',
        projectId: project.id
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(taskData);

      expectValidationError(response, 'title', 'required');
    });

    it('should not create task without projectId', async () => {
      const taskData = {
        title: 'Task without project'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(taskData);

      expectValidationError(response, 'projectId', 'required');
    });

    it('should not create task with invalid projectId', async () => {
      const taskData = {
        title: 'Task with invalid project',
        projectId: 'invalid-uuid'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(taskData);

      expectValidationError(response, 'projectId');
    });

    it('should not create task in project without access', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherProject = await createTestProject(otherUser.id);

      const taskData = {
        title: 'Unauthorized task',
        projectId: otherProject.id
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(taskData);

      expectErrorResponse(response, 403, 'Access denied');
    });

    it('should not assign task to non-member', async () => {
      const nonMember = await createTestUser({ email: 'nonmember@example.com' });

      const taskData = {
        title: 'Task with invalid assignee',
        projectId: project.id,
        assigneeId: nonMember.id
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(taskData);

      expectErrorResponse(response, 400, 'not a member');
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should get single task with access', async () => {
      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectSuccessResponse(response);
      expect(response.body.task).toBeDefined();
      expect(response.body.task.id).toBe(task.id);
      expect(response.body.task.project).toBeDefined();
      expect(response.body.task.createdBy).toBeDefined();
    });

    it('should not get task without access', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherToken = generateToken(otherUser);

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expectErrorResponse(response, 404, 'not found or access denied');
    });

    it('should not get non-existent task', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 404, 'not found or access denied');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task successfully', async () => {
      const updateData = {
        title: 'Updated Task Title',
        description: 'Updated description',
        status: 'in-progress',
        priority: 'urgent',
        actualHours: 4
      };

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.task.title).toBe(updateData.title);
      expect(response.body.task.status).toBe(updateData.status);
      expect(response.body.task.actualHours).toBe(updateData.actualHours);
    });

    it('should update task assignee', async () => {
      const updateData = {
        assigneeId: testUser2.id
      };

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.task.assigneeId).toBe(testUser2.id);
    });

    it('should not update task without access', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherToken = generateToken(otherUser);

      const updateData = {
        title: 'Unauthorized update'
      };

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(updateData);

      expectErrorResponse(response, 404, 'not found or access denied');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete task successfully', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectSuccessResponse(response);
      expect(response.body.message).toBe('Task deleted successfully');
    });

    it('should not delete task without access', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherToken = generateToken(otherUser);

      const response = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expectErrorResponse(response, 404, 'not found or access denied');
    });
  });

  describe('POST /api/tasks/:id/comments', () => {
    it('should add comment to task', async () => {
      const commentData = {
        content: 'This is a test comment',
        type: 'comment'
      };

      const response = await request(app)
        .post(`/api/tasks/${task.id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData);

      expectSuccessResponse(response, 201);
      expect(response.body.comment).toBeDefined();
      expect(response.body.comment.content).toBe(commentData.content);
      expect(response.body.comment.type).toBe(commentData.type);
      expect(response.body.comment.author).toBeDefined();
    });

    it('should not add comment without content', async () => {
      const commentData = {
        type: 'comment'
      };

      const response = await request(app)
        .post(`/api/tasks/${task.id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData);

      expectValidationError(response, 'content', 'required');
    });

    it('should not add comment to task without access', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherToken = generateToken(otherUser);

      const commentData = {
        content: 'Unauthorized comment'
      };

      const response = await request(app)
        .post(`/api/tasks/${task.id}/comments`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(commentData);

      expectErrorResponse(response, 404, 'not found or access denied');
    });
  });
});
