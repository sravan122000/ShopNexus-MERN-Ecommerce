
import nodemailer from 'nodemailer';

export async function sendEmail({ to, subject, text, html }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP configuration is incomplete. Email skipped.');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE) === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.verify();
    console.log('SMTP connection successful');

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html
    });

    console.log('Email accepted:', info.messageId);

    const previewUrl = nodemailer.getTestMessageUrl(info);

    if (previewUrl) {
      console.log('Ethereal email preview:', previewUrl);
    }

    return true;
  } catch (error) {
    console.error('Email sending failed:', error.message);
    return false;
  }
}
