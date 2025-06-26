# Project Management API - Detailed Documentation

## Table of Contents
1. [Authentication](#authentication)
2. [Projects](#projects)
3. [Tasks](#tasks)
4. [Users](#users)
5. [Comments](#comments)
6. [Error Codes](#error-codes)

## Authentication

### POST /api/auth/register

Register a new user account.

**Request:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "member"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "member",
    "avatar": null
  }
}
```

**Validation Rules:**
- `email`: Must be a valid email address
- `password`: Minimum 6 characters
- `firstName`: Required, non-empty string
- `lastName`: Required, non-empty string
- `role`: Optional, one of: 'admin', 'manager', 'member'

### POST /api/auth/login

Authenticate user and receive JWT token.

**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "member",
    "avatar": null
  }
}
```

### GET /api/auth/me

Get current user profile.

**Request:**
```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "member",
    "avatar": "https://example.com/avatar.jpg",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Projects

### GET /api/projects

Get all projects for the authenticated user.

**Request:**
```http
GET /api/projects?page=1&limit=10&status=active&priority=high&search=ecommerce
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 10, max: 100)
- `status` (string, optional): Filter by status ('planning', 'active', 'on-hold', 'completed', 'cancelled')
- `priority` (string, optional): Filter by priority ('low', 'medium', 'high', 'urgent')
- `search` (string, optional): Search in project name and description

**Response (200 OK):**
```json
{
  "projects": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "E-commerce Platform",
      "description": "Building a modern e-commerce platform with React and Node.js",
      "status": "active",
      "priority": "high",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-06-30T00:00:00.000Z",
      "budget": "50000.00",
      "progress": 35,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "owner": {
        "id": "owner-uuid",
        "firstName": "Project",
        "lastName": "Manager",
        "email": "manager@example.com",
        "avatar": null
      },
      "members": [
        {
          "id": "member-uuid",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com",
          "avatar": null,
          "ProjectMember": {
            "role": "member"
          }
        }
      ],
      "taskStats": {
        "total": 15,
        "completed": 8,
        "progress": 53
      }
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "pages": 3,
    "limit": 10
  }
}
```

### POST /api/projects

Create a new project.

**Request:**
```http
POST /api/projects
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Mobile App Development",
  "description": "Cross-platform mobile application using React Native",
  "status": "planning",
  "priority": "medium",
  "startDate": "2024-03-01",
  "endDate": "2024-09-30",
  "budget": 30000.00
}
```

**Validation Rules:**
- `name`: Required, non-empty string
- `description`: Optional string
- `status`: Optional, one of: 'planning', 'active', 'on-hold', 'completed', 'cancelled'
- `priority`: Optional, one of: 'low', 'medium', 'high', 'urgent'
- `startDate`: Optional, ISO 8601 date string
- `endDate`: Optional, ISO 8601 date string
- `budget`: Optional, decimal number

**Response (201 Created):**
```json
{
  "project": {
    "id": "new-project-uuid",
    "name": "Mobile App Development",
    "description": "Cross-platform mobile application using React Native",
    "status": "planning",
    "priority": "medium",
    "startDate": "2024-03-01T00:00:00.000Z",
    "endDate": "2024-09-30T00:00:00.000Z",
    "budget": "30000.00",
    "progress": 0,
    "ownerId": "user-uuid",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "owner": {
      "id": "user-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "avatar": null
    },
    "members": [
      {
        "id": "user-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "avatar": null,
        "ProjectMember": {
          "role": "owner"
        }
      }
    ]
  }
}
```

### GET /api/projects/:id

Get a specific project by ID.

**Request:**
```http
GET /api/projects/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "project": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "E-commerce Platform",
    "description": "Building a modern e-commerce platform with React and Node.js",
    "status": "active",
    "priority": "high",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-06-30T00:00:00.000Z",
    "budget": "50000.00",
    "progress": 35,
    "ownerId": "owner-uuid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "owner": {
      "id": "owner-uuid",
      "firstName": "Project",
      "lastName": "Manager",
      "email": "manager@example.com",
      "avatar": null
    },
    "members": [
      {
        "id": "member-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "avatar": null,
        "ProjectMember": {
          "role": "member"
        }
      }
    ],
    "tasks": [
      {
        "id": "task-uuid",
        "title": "Setup project structure",
        "description": "Initialize React project with proper folder structure",
        "status": "done",
        "priority": "high",
        "dueDate": "2024-01-15T00:00:00.000Z",
        "estimatedHours": 8,
        "actualHours": 6,
        "tags": ["setup", "react", "frontend"],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "assignee": {
          "id": "assignee-uuid",
          "firstName": "Jane",
          "lastName": "Smith",
          "avatar": null
        }
      }
    ],
    "taskStats": {
      "total": 15,
      "todo": 3,
      "inProgress": 5,
      "review": 2,
      "done": 5
    }
  }
}
```

## Tasks

### GET /api/tasks

Get all tasks for the authenticated user.

**Request:**
```http
GET /api/tasks?projectId=550e8400-e29b-41d4-a716-446655440000&status=todo&page=1&limit=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `projectId` (UUID, optional): Filter by project ID
- `status` (string, optional): Filter by status ('todo', 'in-progress', 'review', 'done')
- `priority` (string, optional): Filter by priority
- `assigneeId` (UUID, optional): Filter by assignee
- `search` (string, optional): Search in task title and description
- `page` (integer, optional): Page number
- `limit` (integer, optional): Items per page
- `sortBy` (string, optional): Sort field (default: 'createdAt')
- `sortOrder` (string, optional): Sort order ('ASC' or 'DESC', default: 'DESC')

### POST /api/tasks

Create a new task.

**Request:**
```http
POST /api/tasks
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "Implement user authentication",
  "description": "Create login and registration functionality with JWT",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "todo",
  "priority": "high",
  "assigneeId": "assignee-uuid",
  "dueDate": "2024-02-01",
  "estimatedHours": 16,
  "tags": ["auth", "security", "backend"]
}
```

**Validation Rules:**
- `title`: Required, non-empty string
- `description`: Optional string
- `projectId`: Required, valid UUID of accessible project
- `status`: Optional, one of: 'todo', 'in-progress', 'review', 'done'
- `priority`: Optional, one of: 'low', 'medium', 'high', 'urgent'
- `assigneeId`: Optional, UUID of project member
- `dueDate`: Optional, ISO 8601 date string
- `estimatedHours`: Optional, positive integer
- `tags`: Optional, array of strings

## Error Codes

### 400 Bad Request
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email",
      "value": "invalid-email"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "message": "Access denied. No token provided."
}
```

### 403 Forbidden
```json
{
  "message": "Access denied. Insufficient permissions.",
  "required": ["admin"],
  "current": "member"
}
```

### 404 Not Found
```json
{
  "message": "Project not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal Server Error",
  "error": "Detailed error message (development only)"
}
```
