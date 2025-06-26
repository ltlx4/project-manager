// HTMX response middleware and templates

const htmxResponse = (req, res, next) => {
  // Check if request is from HTMX
  const isHtmx = req.headers['hx-request'] === 'true';
  
  // Add HTMX helper methods to response object
  res.htmx = {
    // Check if this is an HTMX request
    isHtmx,
    
    // Send HTML response for HTMX or JSON for API
    respond(data, template = null) {
      if (isHtmx && template) {
        res.send(template(data));
      } else {
        res.json(data);
      }
    },
    
    // Trigger HTMX events
    trigger(event, data = {}) {
      res.set('HX-Trigger', JSON.stringify({ [event]: data }));
      return res.htmx;
    },
    
    // Redirect with HTMX
    redirect(url) {
      res.set('HX-Redirect', url);
      return res.htmx;
    },
    
    // Refresh the page
    refresh() {
      res.set('HX-Refresh', 'true');
      return res.htmx;
    },
    
    // Replace URL in browser
    replaceUrl(url) {
      res.set('HX-Replace-Url', url);
      return res.htmx;
    }
  };
  
  next();
};

// Template functions for HTMX responses
const templates = {
  // Dashboard stats template
  dashboardStats(data) {
    const { summary } = data;
    return `
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-folder text-primary text-2xl"></i>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Total Projects</dt>
                <dd class="text-lg font-medium text-gray-900">${summary.projectsCount || 0}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-tasks text-success text-2xl"></i>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Assigned Tasks</dt>
                <dd class="text-lg font-medium text-gray-900">${summary.assignedTasksCount || 0}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-clock text-warning text-2xl"></i>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Overdue Tasks</dt>
                <dd class="text-lg font-medium text-gray-900">${summary.overdueTasks || 0}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-check-circle text-success text-2xl"></i>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Completed Tasks</dt>
                <dd class="text-lg font-medium text-gray-900">${summary.taskStats?.done || 0}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // Recent projects template
  recentProjects(data) {
    const { projects } = data;
    
    if (!projects || projects.length === 0) {
      return `
        <div class="text-center py-8">
          <i class="fas fa-folder-open text-gray-300 text-4xl mb-4"></i>
          <p class="text-gray-500">No projects found</p>
          <button 
            hx-get="/projects/new" 
            hx-target="#modal-container"
            class="mt-4 btn btn-primary">
            Create Your First Project
          </button>
        </div>
      `;
    }
    
    return projects.map(project => `
      <div class="border-b border-gray-200 pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h4 class="text-sm font-medium text-gray-900">
              <a href="/projects/${project.id}" class="hover:text-primary">
                ${project.name}
              </a>
            </h4>
            <p class="text-sm text-gray-500 mt-1">${project.description || 'No description'}</p>
            <div class="flex items-center mt-2 space-x-4">
              <span class="status-badge status-${project.status}">${project.status.toUpperCase()}</span>
              <span class="text-xs text-gray-500">
                <i class="fas fa-tasks mr-1"></i>
                ${project.taskStats?.total || 0} tasks
              </span>
            </div>
          </div>
          <div class="ml-4">
            <div class="text-right">
              <div class="text-xs text-gray-500 mb-1">${project.taskStats?.progress || 0}% complete</div>
              <div class="w-16 bg-gray-200 rounded-full h-2">
                <div class="bg-primary h-2 rounded-full" style="width: ${project.taskStats?.progress || 0}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  },

  // Recent tasks template
  recentTasks(data) {
    const { tasks } = data;
    
    if (!tasks || tasks.length === 0) {
      return `
        <div class="text-center py-8">
          <i class="fas fa-tasks text-gray-300 text-4xl mb-4"></i>
          <p class="text-gray-500">No tasks assigned</p>
        </div>
      `;
    }
    
    return tasks.map(task => `
      <div class="border-b border-gray-200 pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h4 class="text-sm font-medium text-gray-900">
              <a href="/tasks/${task.id}" class="hover:text-primary">
                ${task.title}
              </a>
            </h4>
            <p class="text-xs text-gray-500 mt-1">
              ${task.project?.name || 'No project'}
            </p>
            <div class="flex items-center mt-2 space-x-2">
              <span class="status-badge status-${task.status}">${task.status.replace('-', ' ').toUpperCase()}</span>
              <span class="status-badge priority-${task.priority}">
                ${task.priority.toUpperCase()}
              </span>
            </div>
          </div>
          <div class="ml-4 text-right">
            ${task.dueDate ? `
              <div class="text-xs text-gray-500">
                Due: ${new Date(task.dueDate).toLocaleDateString()}
              </div>
            ` : ''}
            ${task.assignee ? `
              <div class="flex items-center justify-end mt-1">
                <img src="https://ui-avatars.com/api/?name=${task.assignee.firstName}+${task.assignee.lastName}&background=3B82F6&color=fff" 
                     alt="${task.assignee.firstName} ${task.assignee.lastName}" 
                     class="h-5 w-5 rounded-full">
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  },

  // Notification count template
  notificationCount(data) {
    const count = data.count || 0;
    if (count > 0) {
      return count.toString();
    }
    return '';
  },

  // Activity list template
  activityList(activities) {
    if (!activities || activities.length === 0) {
      return `
        <div class="p-6 text-center">
          <i class="fas fa-history text-gray-300 text-4xl mb-4"></i>
          <p class="text-gray-500">No recent activity</p>
        </div>
      `;
    }

    return activities.map(activity => `
      <div class="p-6 flex items-center space-x-4">
        <div class="flex-shrink-0">
          <div class="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
            <i class="fas fa-tasks text-blue-600 text-sm"></i>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900">
            ${activity.title}
          </p>
          <p class="text-sm text-gray-500">
            ${activity.project} • ${activity.assignee} • ${activity.status}
          </p>
          <p class="text-xs text-gray-400">
            ${new Date(activity.updatedAt).toLocaleString()}
          </p>
        </div>
      </div>
    `).join('');
  },

  // Full projects list template
  projectsList(data) {
    const { projects } = data;

    if (!projects || projects.length === 0) {
      return `
        <div class="bg-white shadow rounded-lg p-8 text-center">
          <i class="fas fa-folder-open text-gray-300 text-6xl mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
          <p class="text-gray-500 mb-6">Get started by creating your first project</p>
          <button onclick="openCreateModal()" class="btn btn-primary">
            <i class="fas fa-plus mr-2"></i>Create Project
          </button>
        </div>
      `;
    }

    return projects.map(project => `
      <div class="bg-white shadow rounded-lg hover:shadow-md transition-shadow">
        <div class="p-6">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-lg font-medium text-gray-900 mb-2">
                <a href="/projects/${project.id}" class="hover:text-primary">
                  ${project.name}
                </a>
              </h3>
              <p class="text-gray-600 text-sm mb-4">${project.description || 'No description'}</p>

              <div class="flex items-center space-x-4 mb-4">
                <span class="status-badge status-${project.status}">${project.status.toUpperCase()}</span>
                <span class="status-badge priority-${project.priority}">${project.priority.toUpperCase()}</span>
                <span class="text-sm text-gray-500">
                  <i class="fas fa-tasks mr-1"></i>
                  ${project.taskStats?.total || 0} tasks
                </span>
              </div>

              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  ${project.owner ? `
                    <img src="https://ui-avatars.com/api/?name=${project.owner.firstName}+${project.owner.lastName}&background=3B82F6&color=fff"
                         alt="${project.owner.firstName} ${project.owner.lastName}"
                         class="h-6 w-6 rounded-full">
                    <span class="text-sm text-gray-600">${project.owner.firstName} ${project.owner.lastName}</span>
                  ` : ''}
                </div>
                <div class="text-right">
                  <div class="text-xs text-gray-500 mb-1">${project.taskStats?.progress || 0}% complete</div>
                  <div class="w-20 bg-gray-200 rounded-full h-2">
                    <div class="bg-primary h-2 rounded-full" style="width: ${project.taskStats?.progress || 0}%"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  },

  // Full tasks list template
  tasksList(data) {
    const { tasks } = data;

    if (!tasks || tasks.length === 0) {
      return `
        <div class="p-8 text-center">
          <i class="fas fa-tasks text-gray-300 text-6xl mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p class="text-gray-500 mb-6">Create your first task to get started</p>
          <button onclick="openCreateModal()" class="btn btn-primary">
            <i class="fas fa-plus mr-2"></i>Create Task
          </button>
        </div>
      `;
    }

    return tasks.map(task => `
      <div class="p-6 hover:bg-gray-50 border-b border-gray-200 last:border-b-0">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h4 class="text-base font-medium text-gray-900 mb-1">
              <a href="/tasks/${task.id}" class="hover:text-primary">
                ${task.title}
              </a>
            </h4>
            <p class="text-sm text-gray-600 mb-3">${task.description || 'No description'}</p>

            <div class="flex items-center space-x-4 mb-3">
              <span class="status-badge status-${task.status}">${task.status.replace('-', ' ').toUpperCase()}</span>
              <span class="status-badge priority-${task.priority}">${task.priority.toUpperCase()}</span>
              ${task.project ? `
                <span class="text-xs text-gray-500">
                  <i class="fas fa-folder mr-1"></i>
                  <a href="/projects/${task.project.id}" class="hover:text-primary">${task.project.name}</a>
                </span>
              ` : ''}
            </div>

            <div class="flex items-center space-x-4 text-xs text-gray-500">
              ${task.dueDate ? `
                <span>
                  <i class="fas fa-calendar mr-1"></i>
                  Due: ${new Date(task.dueDate).toLocaleDateString()}
                </span>
              ` : ''}
              ${task.estimatedHours ? `
                <span>
                  <i class="fas fa-clock mr-1"></i>
                  ${task.estimatedHours}h estimated
                </span>
              ` : ''}
              <span>
                <i class="fas fa-calendar-plus mr-1"></i>
                Created: ${new Date(task.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div class="ml-6 flex flex-col items-end space-y-2">
            ${task.assignee ? `
              <div class="flex items-center space-x-2">
                <img src="https://ui-avatars.com/api/?name=${task.assignee.firstName}+${task.assignee.lastName}&background=3B82F6&color=fff"
                     alt="${task.assignee.firstName} ${task.assignee.lastName}"
                     class="h-6 w-6 rounded-full">
                <span class="text-sm text-gray-600">${task.assignee.firstName} ${task.assignee.lastName}</span>
              </div>
            ` : `
              <span class="text-sm text-gray-400">Unassigned</span>
            `}

            ${task.createdBy ? `
              <div class="text-xs text-gray-500">
                Created by ${task.createdBy.firstName} ${task.createdBy.lastName}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }
};

module.exports = {
  htmxResponse,
  templates
};
