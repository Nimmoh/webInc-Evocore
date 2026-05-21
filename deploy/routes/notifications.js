'use strict';

/**
 * Notification Service - Automated Email/SMS Notifications
 * Handles automated notifications for:
 * - New contact form submissions
 * - New service/product created
 * - System alerts
 */

const { Contact, Service, Product } = require('../db/mongo');

class NotificationService {
    constructor() {
        this.emailQueue = [];
        this.smsQueue = [];
    }

    /**
     * Send notification for new contact submission
     */
    async notifyNewContact(contactData) {
        const notification = {
            type: 'new_contact',
            to: process.env.ADMIN_EMAIL || 'admin@evocore.co.ke',
            subject: `New Inquiry from ${contactData.name}`,
            data: contactData,
            timestamp: new Date().toISOString()
        };

        // In production, this would send actual email via SMTP/SendGrid
        console.log('[Notification] New contact submission:', notification);

        // Save notification to database for tracking
        await this.saveNotification(notification);

        return notification;
    }

    /**
     * Send notification for new service created
     */
    async notifyNewService(serviceData) {
        const notification = {
            type: 'new_service',
            to: process.env.ADMIN_EMAIL || 'admin@evocore.co.ke',
            subject: `New Service Created: ${serviceData.title}`,
            data: serviceData,
            timestamp: new Date().toISOString()
        };

        console.log('[Notification] New service created:', notification);
        await this.saveNotification(notification);

        return notification;
    }

    /**
     * Send notification for new product created
     */
    async notifyNewProduct(productData) {
        const notification = {
            type: 'new_product',
            to: process.env.ADMIN_EMAIL || 'admin@evocore.co.ke',
            subject: `New Product Created: ${productData.name}`,
            data: productData,
            timestamp: new Date().toISOString()
        };

        console.log('[Notification] New product created:', notification);
        await this.saveNotification(notification);

        return notification;
    }

    /**
     * Save notification to database for audit trail
     */
    async saveNotification(notification) {
        // In production, you might have a Notification model
        // For now, log to console and could save to a file/collection
        console.log('[Notification] Saved:', notification.type, notification.timestamp);
    }

    /**
     * Get notification history
     */
    async getNotifications(limit = 50) {
        // Would query from database in production
        return {
            success: true,
            message: 'Notification history would be retrieved from database',
            count: 0,
            notifications: []
        };
    }
}

module.exports = { NotificationService };