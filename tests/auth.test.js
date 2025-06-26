const request = require('supertest');
const app = require('../server');
require('./setup');
const { User } = require('../models');
const { 
  createTestUser, 
  generateToken,
  expectValidationError,
  expectSuccessResponse,
  expectErrorResponse
} = require('./helpers/testUtils');

describe('Authentication Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: 'member'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expectSuccessResponse(response, 201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should not register user with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expectValidationError(response, 'email', 'valid email');
    });

    it('should not register user with short password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expectValidationError(response, 'password', '6 characters');
    });

    it('should not register user with missing required fields', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123'
        // Missing firstName and lastName
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should not register user with duplicate email', async () => {
      // Create a user first
      await createTestUser({ email: 'existing@example.com' });

      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expectErrorResponse(response, 400, 'already exists');
    });

    it('should register user with default role when role not specified', async () => {
      const userData = {
        email: 'defaultrole@example.com',
        password: 'password123',
        firstName: 'Default',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expectSuccessResponse(response, 201);
      expect(response.body.user.role).toBe('member');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'login@example.com',
        firstName: 'Login',
        lastName: 'Test'
      });
    });

    it('should login user with correct credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expectSuccessResponse(response);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should not login user with incorrect email', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expectErrorResponse(response, 401, 'Invalid credentials');
    });

    it('should not login user with incorrect password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expectErrorResponse(response, 401, 'Invalid credentials');
    });

    it('should not login inactive user', async () => {
      // Deactivate the user
      await testUser.update({ isActive: false });

      const loginData = {
        email: 'login@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expectErrorResponse(response, 401, 'Invalid credentials');
    });

    it('should not login with invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expectValidationError(response, 'email', 'valid email');
    });

    it('should not login without password', async () => {
      const loginData = {
        email: 'login@example.com'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expectValidationError(response, 'password', 'required');
    });
  });

  describe('GET /api/auth/me', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'profile@example.com',
        firstName: 'Profile',
        lastName: 'Test'
      });
      token = generateToken(testUser);
    });

    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expectSuccessResponse(response);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expectErrorResponse(response, 401, 'No token provided');
    });

    it('should not get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expectErrorResponse(response, 401, 'Invalid token');
    });
  });

  describe('PUT /api/auth/me', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'update@example.com',
        firstName: 'Update',
        lastName: 'Test'
      });
      token = generateToken(testUser);
    });

    it('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        avatar: 'https://example.com/avatar.jpg'
      };

      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.user.firstName).toBe(updateData.firstName);
      expect(response.body.user.lastName).toBe(updateData.lastName);
      expect(response.body.user.avatar).toBe(updateData.avatar);
    });

    it('should not update with empty firstName', async () => {
      const updateData = {
        firstName: '',
        lastName: 'Test'
      };

      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expectValidationError(response, 'firstName', 'cannot be empty');
    });

    it('should not update with invalid avatar URL', async () => {
      const updateData = {
        avatar: 'not-a-url'
      };

      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expectValidationError(response, 'avatar', 'valid URL');
    });
  });

  describe('PUT /api/auth/change-password', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'password@example.com',
        firstName: 'Password',
        lastName: 'Test'
      });
      token = generateToken(testUser);
    });

    it('should change password with correct current password', async () => {
      const passwordData = {
        currentPassword: 'password123',
        newPassword: 'newpassword123'
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(passwordData);

      expectSuccessResponse(response);
      expect(response.body.message).toBe('Password changed successfully');
    });

    it('should not change password with incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(passwordData);

      expectErrorResponse(response, 400, 'Current password is incorrect');
    });

    it('should not change password with short new password', async () => {
      const passwordData = {
        currentPassword: 'password123',
        newPassword: '123'
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(passwordData);

      expectValidationError(response, 'newPassword', '6 characters');
    });
  });

  describe('POST /api/auth/logout', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = await createTestUser();
      token = generateToken(testUser);
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expectSuccessResponse(response);
      expect(response.body.message).toBe('Logout successful');
    });

    it('should not logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expectErrorResponse(response, 401, 'No token provided');
    });
  });
});
