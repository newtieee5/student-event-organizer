const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const sendEmail = async (to: string, subject: string, body: string, name: string, type: 'code' | 'message' = 'message') => {
  try {
    const response = await fetch(`${API_URL}/api/auth/send-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: to,
        name,
        subject,
        body,
        type
      }),
    });

    if (!response.ok) {
        throw new Error('Failed to send email');
    }
    return await response.json();
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};
