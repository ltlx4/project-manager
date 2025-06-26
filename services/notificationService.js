const { Notification } = require('../models');

class NotificationService {
  // Create a notification
  static async createNotification(userId, type, title, message, data = {}) {
    try {
      return await Notification.create({
        userId,
        type,
        title,
        message,
        data
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Task assigned notification
  static async notifyTaskAssigned(assigneeId, task, assignedBy) {
    const title = 'New Task Assigned';
    const message = `You have been assigned to task "${task.title}" by ${assignedBy.firstName} ${assignedBy.lastName}`;
    const data = {
      taskId: task.id,
      projectId: task.projectId,
      assignedById: assignedBy.id
    };

    return this.createNotification(assigneeId, 'task_assigned', title, message, data);
  }

  // Task completed notification
  static async notifyTaskCompleted(taskOwnerId, task, completedBy) {
    const title = 'Task Completed';
    const message = `Task "${task.title}" has been completed by ${completedBy.firstName} ${completedBy.lastName}`;
    const data = {
      taskId: task.id,
      projectId: task.projectId,
      completedById: completedBy.id
    };

    return this.createNotification(taskOwnerId, 'task_completed', title, message, data);
  }

  // Project invitation notification
  static async notifyProjectInvitation(userId, project, invitedBy, role) {
    const title = 'Project Invitation';
    const message = `You have been invited to join project "${project.name}" as ${role} by ${invitedBy.firstName} ${invitedBy.lastName}`;
    const data = {
      projectId: project.id,
      invitedById: invitedBy.id,
      role
    };

    return this.createNotification(userId, 'project_invitation', title, message, data);
  }

  // Comment added notification
  static async notifyCommentAdded(taskAssigneeId, task, comment, commentAuthor) {
    if (taskAssigneeId === commentAuthor.id) {
      return; // Don't notify if user commented on their own task
    }

    const title = 'New Comment';
    const message = `${commentAuthor.firstName} ${commentAuthor.lastName} commented on task "${task.title}"`;
    const data = {
      taskId: task.id,
      projectId: task.projectId,
      commentId: comment.id,
      authorId: commentAuthor.id
    };

    return this.createNotification(taskAssigneeId, 'comment_added', title, message, data);
  }

  // Deadline reminder notification
  static async notifyDeadlineReminder(userId, task, daysUntilDue) {
    const title = 'Deadline Reminder';
    const message = `Task "${task.title}" is due in ${daysUntilDue} day(s)`;
    const data = {
      taskId: task.id,
      projectId: task.projectId,
      daysUntilDue
    };

    return this.createNotification(userId, 'deadline_reminder', title, message, data);
  }

  // Task overdue notification
  static async notifyTaskOverdue(userId, task, daysOverdue) {
    const title = 'Task Overdue';
    const message = `Task "${task.title}" is ${daysOverdue} day(s) overdue`;
    const data = {
      taskId: task.id,
      projectId: task.projectId,
      daysOverdue
    };

    return this.createNotification(userId, 'task_overdue', title, message, data);
  }

  // Project update notification
  static async notifyProjectUpdate(memberIds, project, updatedBy, updateType) {
    const title = 'Project Update';
    const message = `Project "${project.name}" has been updated by ${updatedBy.firstName} ${updatedBy.lastName}`;
    const data = {
      projectId: project.id,
      updatedById: updatedBy.id,
      updateType
    };

    // Create notifications for all members except the one who made the update
    const notifications = memberIds
      .filter(memberId => memberId !== updatedBy.id)
      .map(memberId => 
        this.createNotification(memberId, 'project_update', title, message, data)
      );

    return Promise.all(notifications);
  }

  // Bulk create notifications
  static async createBulkNotifications(notifications) {
    try {
      return await Notification.bulkCreate(notifications);
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // Get notification preferences (placeholder for future implementation)
  static async getUserNotificationPreferences(userId) {
    // This would typically fetch from a user preferences table
    // For now, return default preferences
    return {
      email: true,
      push: true,
      inApp: true,
      types: {
        task_assigned: true,
        task_completed: true,
        task_overdue: true,
        project_invitation: true,
        project_update: false,
        comment_added: true,
        deadline_reminder: true
      }
    };
  }

  // Check if user should receive notification based on preferences
  static async shouldNotifyUser(userId, notificationType) {
    const preferences = await this.getUserNotificationPreferences(userId);
    return preferences.inApp && preferences.types[notificationType];
  }

  // Clean up old notifications (older than 30 days)
  static async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const deletedCount = await Notification.destroy({
        where: {
          createdAt: {
            [Op.lt]: thirtyDaysAgo
          },
          isRead: true
        }
      });

      console.log(`Cleaned up ${deletedCount} old notifications`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
