// Project Manager Frontend JavaScript

// Global configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Authentication utilities
const Auth = {
    getToken() {
        return localStorage.getItem('token');
    },
    
    setToken(token) {
        localStorage.setItem('token', token);
    },
    
    removeToken() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
    
    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },
    
    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },
    
    isAuthenticated() {
        return !!this.getToken();
    },
    
    logout() {
        this.removeToken();
        window.location.href = '/login';
    }
};

// API utilities
const API = {
    async request(endpoint, options = {}) {
        const token = Auth.getToken();
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            
            if (response.status === 401) {
                Auth.logout();
                return;
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    get(endpoint) {
        return this.request(endpoint);
    },

    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
};

// Notification system
const Notifications = {
    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle text-green-500',
            error: 'fas fa-exclamation-circle text-red-500',
            warning: 'fas fa-exclamation-triangle text-yellow-500',
            info: 'fas fa-info-circle text-blue-500'
        };
        
        notification.innerHTML = `
            <div class="p-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <i class="${iconMap[type]}"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium text-gray-900">${message}</p>
                    </div>
                    <div class="ml-auto pl-3">
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                                class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }
    },

    success(message, duration) {
        this.show(message, 'success', duration);
    },

    error(message, duration) {
        this.show(message, 'error', duration);
    },

    warning(message, duration) {
        this.show(message, 'warning', duration);
    },

    info(message, duration) {
        this.show(message, 'info', duration);
    }
};

// Utility functions
const Utils = {
    formatDate(dateString) {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    formatDateTime(dateString) {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    getStatusBadge(status, type = 'project') {
        const statusClasses = {
            project: {
                planning: 'status-planning',
                active: 'status-active',
                'on-hold': 'status-on-hold',
                completed: 'status-completed',
                cancelled: 'status-cancelled'
            },
            task: {
                todo: 'status-todo',
                'in-progress': 'status-in-progress',
                review: 'status-review',
                done: 'status-done'
            }
        };

        const className = statusClasses[type][status] || 'status-planning';
        return `<span class="status-badge ${className}">${status.replace('-', ' ').toUpperCase()}</span>`;
    },

    getPriorityBadge(priority) {
        const className = `priority-${priority}`;
        const icons = {
            low: 'fas fa-arrow-down',
            medium: 'fas fa-minus',
            high: 'fas fa-arrow-up',
            urgent: 'fas fa-exclamation'
        };

        return `<span class="status-badge ${className}">
            <i class="${icons[priority]} mr-1"></i>${priority.toUpperCase()}
        </span>`;
    },

    getProgressBar(percentage) {
        const color = percentage >= 75 ? 'bg-green-500' : 
                     percentage >= 50 ? 'bg-blue-500' : 
                     percentage >= 25 ? 'bg-yellow-500' : 'bg-red-500';
        
        return `
            <div class="progress-bar">
                <div class="progress-fill ${color}" style="width: ${percentage}%"></div>
            </div>
            <span class="text-xs text-gray-600 mt-1">${percentage}%</span>
        `;
    },

    getAvatar(user, size = 'md') {
        const name = user.firstName && user.lastName ? 
                    `${user.firstName}+${user.lastName}` : 
                    user.email;
        const avatarUrl = user.avatar || 
                         `https://ui-avatars.com/api/?name=${name}&background=3B82F6&color=fff`;
        
        return `<img src="${avatarUrl}" alt="${user.firstName} ${user.lastName}" 
                     class="avatar avatar-${size}">`;
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            Notifications.success('Copied to clipboard');
        }).catch(() => {
            Notifications.error('Failed to copy to clipboard');
        });
    }
};

// Modal utilities
const Modal = {
    show(content, title = '') {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-medium text-gray-900">${title}</h3>
                    <button onclick="this.closest('.modal-overlay').remove()" 
                            class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Close on escape key
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        });
        
        document.body.appendChild(modal);
        return modal;
    },

    close() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }
};

// HTMX configuration
document.addEventListener('DOMContentLoaded', function() {
    // Add Authorization header to all HTMX requests
    document.body.addEventListener('htmx:configRequest', function(event) {
        const token = Auth.getToken();
        if (token) {
            event.detail.headers['Authorization'] = `Bearer ${token}`;
        }
    });

    // Handle HTMX errors
    document.body.addEventListener('htmx:responseError', function(event) {
        if (event.detail.xhr.status === 401) {
            Auth.logout();
        } else {
            const response = JSON.parse(event.detail.xhr.responseText);
            Notifications.error(response.message || 'An error occurred');
        }
    });

    // Handle successful HTMX responses
    document.body.addEventListener('htmx:afterRequest', function(event) {
        if (event.detail.successful) {
            // Add fade-in animation to new content
            const target = event.detail.target;
            if (target) {
                target.classList.add('fade-in');
            }
        }
    });

    // Check authentication on protected pages
    if (!window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register')) {
        if (!Auth.isAuthenticated()) {
            window.location.href = '/login';
        }
    }

    // Fix dropdown behavior - fallback for Alpine.js
    setTimeout(() => {
        initializeDropdowns();
    }, 100);
});

// Dropdown fallback functionality
function initializeDropdowns() {
    const dropdownButtons = document.querySelectorAll('[x-data] button');

    dropdownButtons.forEach(button => {
        const dropdown = button.closest('[x-data]');
        const menu = dropdown.querySelector('[x-show]');

        if (menu) {
            // Ensure menu is initially hidden
            menu.style.display = 'none';

            button.addEventListener('click', function(e) {
                e.stopPropagation();

                // Close all other dropdowns
                document.querySelectorAll('[x-show]').forEach(otherMenu => {
                    if (otherMenu !== menu) {
                        otherMenu.style.display = 'none';
                    }
                });

                // Toggle current dropdown
                if (menu.style.display === 'none') {
                    menu.style.display = 'block';
                } else {
                    menu.style.display = 'none';
                }
            });
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        const dropdowns = document.querySelectorAll('[x-show]');
        dropdowns.forEach(menu => {
            if (!menu.closest('[x-data]').contains(e.target)) {
                menu.style.display = 'none';
            }
        });
    });
}

// Export for global use
window.Auth = Auth;
window.API = API;
window.Notifications = Notifications;
window.Utils = Utils;
window.Modal = Modal;

// Global modal functions - these will be overridden by page-specific functions
window.openCreateModal = function() {
    console.log('Default openCreateModal - should be overridden by page');
};

window.openInviteModal = function() {
    console.log('Default openInviteModal - should be overridden by page');
};

window.closeModal = function() {
    console.log('Default closeModal - should be overridden by page');
};

window.closeInviteModal = function() {
    console.log('Default closeInviteModal - should be overridden by page');
};

window.logout = function() {
    Auth.logout();
};
