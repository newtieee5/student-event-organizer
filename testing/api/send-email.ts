import type { VercelRequest, VercelResponse } from '@vercel/node';
import transporter from './_utils/transporter.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', "true");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { to, subject, html, text, name } = req.body;

  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Common Signature
  const signature = `
  <div style="margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 20px;">
    <p style="font-family: Arial, sans-serif; color: #666; font-size: 14px;">
      Best regards,<br>
      <strong>AcademiEvent Team</strong>
    </p>
    <div style="font-size: 12px; color: #999;">
      <p>Need help? Contact us at <a href="mailto:support@academievent.com" style="color: #2563eb;">support@academievent.com</a></p>
      <p>&copy; ${new Date().getFullYear()} AcademiEvent. All rights reserved.</p>
    </div>
  </div>
  `;

  // Wrap content
  const wrappedHtml = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #2563eb; font-size: 24px; margin: 0;">AcademiEvent</h1>
      </div>
      <div style="background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        ${name ? `<p style="font-size: 16px; font-weight: 500;">Hi ${name},</p>` : ''}
        ${html}
      </div>
      ${signature}
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"AcademiEvent" <no-reply@academievent.com>',
      to,
      subject,
      text: text || html?.replace(/<[^>]*>/g, ''), // Fallback text
      html: wrappedHtml,
    });

    console.log('Message sent: %s', info.messageId);
    return res.status(200).json({ message: 'Email sent successfully', messageId: info.messageId });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}

