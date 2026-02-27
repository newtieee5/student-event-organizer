import { StudentEvent, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

const postEmail = async (endpoint: string, payload: any) => {
    const url = API_URL ? `${API_URL}${endpoint}` : endpoint;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Email failed: ${response.statusText}`);
    return response.json();
};

export const sendEmail = async (to: string, subject: string, body: string, name: string, type: 'code' | 'message' = 'message') => {
  // Legacy support using auth/send-confirmation
  try {
     return await postEmail('/api/auth/send-confirmation', {
        email: to,
        name: name,
        subject: subject,
        body: body,
        type: type
     });
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

/* New Enhanced Email Services */

// 1. Password Reset
export const sendPasswordResetEmail = async (email: string, resetLink: string) => {
    const subject = "Reset Your Password - AcademiEvent";
    const html = `
        <p>You requested a password reset for your AcademiEvent account.</p>
        <p>Please click the button below to reset your password. This link is valid for 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you didn't request this, you can safely ignore this email.</p>
    `;
    return postEmail('/api/send-email', { to: email, subject, html });
};

// 2. Welcome Message
export const sendWelcomeEmail = async (user: User) => {
    const subject = "Welcome to AcademiEvent!";
    const html = `
        <h2>Welcome aboard!</h2>
        <p>We're thrilled to have you join our community of students and organizers.</p>
        <p>With AcademiEvent, you can:</p>
        <ul>
            <li>Organize your academic and social life</li>
            <li>Track your event budgets</li>
            <li>Discover campus events in the Marketplace</li>
        </ul>
        <p>Get started by creating your first event or exploring the marketplace!</p>
    `;
    return postEmail('/api/send-email', { to: user.email, subject, html, name: user.name });
};

// 3. Traffic Updates
export const sendTrafficAlert = async (user: User, eventTitle: string, delayMinutes: number) => {
    const subject = `Traffic Alert: Delay for ${eventTitle}`;
    const html = `
        <div style="background-color: #fff3cd; color: #856404; padding: 15px; border-radius: 8px; border: 1px solid #ffeeba;">
            <strong>Heads up!</strong> We've detected heavier traffic than usual on your route to <em>${eventTitle}</em>.
        </div>
        <p>Current estimates show a delay of approximately <strong>${delayMinutes} minutes</strong>.</p>
        <p>We recommend leaving earlier to arrive on time.</p>
    `;
    return postEmail('/api/send-email', { to: user.email, subject, html, name: user.name });
};

// 4. Event Reminders
export const sendEventReminder = async (user: User, event: StudentEvent) => {
    const subject = `Reminder: ${event.title} is starting soon`;
    const html = `
        <p>This is a friendly reminder that <strong>${event.title}</strong> is coming up.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${event.date}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${event.time}</p>
            <p style="margin: 5px 0;"><strong>Location:</strong> ${event.location}</p>
        </div>
        <p>Don't forget to check your tasks and budget!</p>
    `;
    return postEmail('/api/send-email', { to: user.email, subject, html, name: user.name });
};

// 5. Budget Summary
export const sendBudgetSummary = async (user: User, event: StudentEvent) => {
     const statusColor = event.totalSpent > event.totalBudget ? '#dc3545' : '#198754';
     const subject = `Budget Summary: ${event.title}`;
     const html = `
        <p>Here is the current budget status for <strong>${event.title}</strong>:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px;">Total Budget</td>
                <td style="padding: 10px; text-align: right; font-weight: bold;">KES ${event.totalBudget}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px;">Total Spent</td>
                <td style="padding: 10px; text-align: right; font-weight: bold; color: ${statusColor}">KES ${event.totalSpent}</td>
            </tr>
            <tr>
                <td style="padding: 10px;">Remaining</td>
                <td style="padding: 10px; text-align: right;">KES ${event.totalBudget - event.totalSpent}</td>
            </tr>
        </table>
        ${event.totalSpent > event.totalBudget ? '<p style="color: #dc3545;"><strong>Warning:</strong> You are over budget!</p>' : '<p style="color: #198754;">You are within budget. Great job!</p>'}
     `;
     return postEmail('/api/send-email', { to: user.email, subject, html, name: user.name });
};

// 6. New Marketplace Event
export const sendNewEventNotification = async (user: User, event: any) => { // using any for organizer event structure
    const subject = `New Event: ${event.title}`;
    const html = `
        <p>A new event has been posted in the Marketplace that might interest you!</p>
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 20px 0;">
             ${event.image ? `<img src="${event.image}" style="width: 100%; height: 150px; object-fit: cover;" />` : ''}
             <div style="padding: 15px;">
                <h3 style="margin-top: 0;">${event.title}</h3>
                <p style="color: #666;">${event.date} at ${event.time}</p>
                <p><strong>Organizer:</strong> ${event.organizerName || 'Campus Organizer'}</p>
                <div style="margin-top: 15px;">
                   <a href="${import.meta.env.VITE_APP_URL || '#'}/marketplace" style="background-color: #2563eb; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px;">View Event</a>
                </div>
             </div>
        </div>
    `;
    return postEmail('/api/send-email', { to: user.email, subject, html, name: user.name });
};
