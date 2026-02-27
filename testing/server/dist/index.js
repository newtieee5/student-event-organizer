"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Configure Nodemailer with SMTP
// You need to create a .env file with your SMTP credentials
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
// Verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
        console.log('SMTP Connection Error:', error);
    }
    else {
        console.log('SMTP Server is ready to take our messages');
    }
});
// Endpoint to send emails
app.post('/api/send-email', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { to, subject, html, text } = req.body;
    if (!to || !subject || (!html && !text)) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const info = yield transporter.sendMail({
            from: process.env.SMTP_FROM || '"Student Event Org" <no-reply@example.com>',
            to,
            subject,
            text,
            html,
        });
        console.log('Message sent: %s', info.messageId);
        res.status(200).json({ message: 'Email sent successfully', messageId: info.messageId });
    }
    catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
}));
// Endpoint for custom authentication emails (e.g. signup confirmation)
// This implements the logic requested, adapted for Node.js from the PHP example
app.post('/api/auth/send-confirmation', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, name, code, subject, body, type } = req.body;
    const emailSubject = subject || 'Confirm your AcademiEvent account';
    // Use body content if provided, otherwise default for confirmation
    const emailBody = body || code || 'Welcome to AcademiEvent';
    const logo = `<img src='https://api.logo.com/api/v2/images?logo=lg_h8JgLHLDhIe7y11yZK&amp;name=ACADEMIEVENT&amp;u=2026-02-15T18%3A26%3A55.868Z&amp;width=500&amp;height=500&amp;format=webp&amp;fit=contain&amp;margin_ratio=0.3&amp;quality=30' width='80' height='80' style='border-radius:20px;' alt='AcademiEvent'>`;
    // Determine if body is a code (numeric and short) or a message
    // In Node check:
    const cleanBody = String(emailBody).replace(/<[^>]*>?/gm, '');
    const isCode = (cleanBody.length <= 8 && !isNaN(Number(cleanBody))) || (type === 'code');
    let mainContent = "";
    if (isCode) {
        mainContent = `
            <p>Use the verification code below to activate your account:</p>
            <div class='code-box'>${cleanBody}</div>
            <p>This code will expire in 10 minutes.</p>
         `;
    }
    else {
        // For generic messages
        mainContent = `<div style='background:#f1f5f9; padding:20px; border-radius:12px; font-size:16px; margin:20px 0;'>${emailBody}</div>`;
    }
    const signature = `
<table cellpadding="0" cellspacing="0" style="border-collapse: collapse; table-layout: fixed; font-family: Arial; white-space: nowrap; margin-top: 30px; margin-left: auto; margin-right: auto;"><tbody><tr><td style="text-align: left; vertical-align: top; padding: 4px 24px 0px 0px;"><table cellpadding="0" cellspacing="0" width="110px" style="border-collapse: collapse; table-layout: fixed; margin: 0px auto;"><tbody><tr><td style="text-align: left; vertical-align: top;"><img alt="logo image" src="https://api.logo.com/api/v2/images?logo=lg_h8JgLHLDhIe7y11yZK&amp;name=ACADEMIEVENT&amp;u=2026-02-15T18%3A26%3A55.868Z&amp;width=500&amp;height=500&amp;format=webp&amp;fit=contain&amp;margin_ratio=0.3&amp;quality=30" style="display: block; max-width: 100%; height: auto; margin-bottom: 0px; border-radius: 50%;"></td></tr></tbody></table><table cellpadding="0" cellspacing="0" style="border-collapse: collapse; table-layout: fixed; display: none; margin: 0px auto;"><tbody><tr></tr></tbody></table></td><td style="text-align: left; vertical-align: top;"><table cellpadding="0" cellspacing="0" style="border-collapse: collapse; table-layout: fixed;"><tbody><tr><td style="text-align: left; vertical-align: top; line-height: 24px;"><span style="font-size: 18px; margin: 0px; padding: 0px 20px 0px 0px; color: rgb(0, 0, 0); white-space: nowrap; font-weight: bold;">Newton mukaria</span></td></tr><tr><td style="text-align: left; vertical-align: top; line-height: 24px;"><span style="font-size: 14px; margin: 0px; padding: 0px 8px 0px 0px; color: rgb(0, 0, 0); white-space: nowrap;">ACADEMIEVENT</span><span style="font-size: 14px; margin: 0px; padding: 0px 20px 0px 8px; color: rgb(0, 0, 0); white-space: nowrap; border-left: 1px solid rgb(0, 0, 0);">DEVELOPER</span></td></tr><tr><td style="text-align: left; vertical-align: top; line-height: 16px;"><a href="tel:+254101265734" target="_blank" rel="nofollow noreferrer" style="text-decoration: none; color: inherit;"><span style="font-size: 12px; margin: 0px; padding: 0px 20px 0px 0px; color: rgb(0, 0, 0); white-space: nowrap;">+254101265734</span></a></td></tr><tr><td style="text-align: left; vertical-align: top; line-height: 16px;"><a href="mailto:newtila2006@gmail.com" target="_blank" rel="nofollow noreferrer" style="text-decoration: none; color: inherit;"><span style="font-size: 12px; margin: 0px; padding: 0px 20px 0px 0px; color: rgb(0, 0, 0); white-space: nowrap;">newtila2006@gmail.com</span></a></td></tr><tr><td style="text-align: left; vertical-align: top; line-height: 16px;"><a href="https://www.academievent.com" target="_blank" rel="nofollow noreferrer" style="text-decoration: none; color: inherit;"><span style="font-size: 12px; margin: 0px; padding: 0px 20px 0px 0px; color: rgb(0, 0, 0); white-space: nowrap;">www.academievent.com</span></a></td></tr><tr><td style="text-align: left; vertical-align: top; line-height: 16px;"><a href="https://www.google.com/maps/search/?api=1&amp;query=Nairobi" target="_blank" rel="nofollow noreferrer" style="text-decoration: none; color: inherit;"><span style="font-size: 12px; margin: 0px; padding: 0px 20px 0px 0px; color: rgb(0, 0, 0); white-space: nowrap;">Nairobi</span></a></td></tr><tr><td style="text-align: left; vertical-align: top;"><table cellpadding="0" cellspacing="0" style="border-collapse: collapse; table-layout: fixed; font-size: 5.6px; margin: 6px 0px 0px;"><tbody><tr><td style="text-align: left; vertical-align: top; line-height: 12px;"><a href="https://logo.com/email-signature-maker"><span style="font-size: 8px; margin: 0px; padding: 0px 20px 0px 0px; color: rgb(63, 131, 248); white-space: nowrap; font-weight: 900; text-decoration: underline; text-align: left;">Get your own signature</span></a></td></tr><tr><td style="text-align: left; vertical-align: top; line-height: 12px;"><span style="font-size: 8px; margin: 0px; padding: 0px 20px 0px 0px; color: rgb(126, 125, 125); white-space: nowrap; text-align: left;">Powered by LOGO.com</span></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table>
    `;
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 0; }
            .email-wrapper { padding: 40px 20px; }
            .email-container { max-width: 500px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 24px; box-shadow: 0 10px 40px -10px rgba(79, 70, 229, 0.15); text-align: center; border: 1px solid #e2e8f0; }
            .header h1 { color: #4338ca; margin: 10px 0 0; font-size: 28px; font-weight: 800; letter-spacing: -1px; }
            .logo-icon { font-size: 56px; margin-bottom: 10px; display: inline-block; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }
            .content { font-size: 16px; line-height: 1.6; color: #475569; margin: 30px 0; }
            .code-box { 
                background: #eef2ff; 
                color: #4338ca; 
                font-size: 42px; 
                font-weight: 900; 
                letter-spacing: 8px; 
                padding: 24px; 
                border-radius: 16px; 
                margin: 30px 0; 
                border: 2px dashed #c7d2fe; 
                display: inline-block; 
                font-family: 'Courier New', monospace;
            }
            .footer { font-size: 11px; color: #94a3b8; margin-top: 40px; }
            .highlight { color: #4f46e5; font-weight: 600; }
        </style>
    </head>
    <body>
        <div class='email-wrapper'>
            <div class='email-container'>
                <div class='header'>
                    <div class='logo-icon'>${logo}</div>
                    <h1>AcademiEvent</h1>
                </div>
                <div class='content'>
                    <p>Welcome to your AI-Optimized schedule.</p>
                    ${mainContent}
                    
                    <div style='margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;'>
                        ${signature}
                    </div>
                </div>
                <div class='footer'>
                    <p>&copy; ${new Date().getFullYear()} AcademiEvent Inc. <br>Secure AI Scheduling Platform.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
    try {
        yield transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: email,
            subject: emailSubject,
            html: htmlContent
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error sending confirmation:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
}));
app.get('/', (req, res) => {
    res.send('Student App Backend Server is Running');
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
