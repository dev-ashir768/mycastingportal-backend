import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../config/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: { user: config.email.user, pass: config.email.pass },
    });
  }

  private async send(options: EmailOptions): Promise<void> {
    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text ?? options.html.replace(/<[^>]*>/g, ''),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId} to ${options.to}`);
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}:`, error);
      throw new Error('Email delivery failed');
    }
  }

  async sendEmailVerification(to: string, fullName: string, token: string): Promise<void> {
    const verificationUrl = `${config.client.url}/auth/verify-email?token=${token}`;

    await this.send({
      to,
      subject: 'Verify Your Email Address',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#333;">Hello ${fullName},</h2>
          <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}"
             style="display:inline-block;padding:12px 24px;background-color:#4F46E5;
                    color:white;text-decoration:none;border-radius:6px;margin:16px 0;">
            Verify Email Address
          </a>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break:break-all;color:#666;">${verificationUrl}</p>
          <p>This link expires in <strong>24 hours</strong>.</p>
          <p>If you did not create an account, please ignore this email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
          <p style="color:#999;font-size:12px;">&copy; ${new Date().getFullYear()} Actor Agency. All rights reserved.</p>
        </body>
        </html>
      `,
    });
  }

  async sendPasswordReset(to: string, fullName: string, token: string): Promise<void> {
    const resetUrl = `${config.client.url}/auth/reset-password?token=${token}`;

    await this.send({
      to,
      subject: 'Reset Your Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#333;">Hello ${fullName},</h2>
          <p>We received a request to reset your password. Click the button below to proceed:</p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 24px;background-color:#DC2626;
                    color:white;text-decoration:none;border-radius:6px;margin:16px 0;">
            Reset Password
          </a>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break:break-all;color:#666;">${resetUrl}</p>
          <p>This link expires in <strong>1 hour</strong>.</p>
          <p style="color:#DC2626;"><strong>If you did not request this, please secure your account immediately.</strong></p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
          <p style="color:#999;font-size:12px;">&copy; ${new Date().getFullYear()} Actor Agency. All rights reserved.</p>
        </body>
        </html>
      `,
    });
  }

  async sendWelcome(to: string, fullName: string): Promise<void> {
    await this.send({
      to,
      subject: 'Welcome to Actor Agency!',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#333;">Welcome, ${fullName}!</h2>
          <p>Your email has been verified and your account is now active.</p>
          <p>You can now log in and start using Actor Agency.</p>
          <a href="${config.client.url}/auth/login"
             style="display:inline-block;padding:12px 24px;background-color:#4F46E5;
                    color:white;text-decoration:none;border-radius:6px;margin:16px 0;">
            Go to Login
          </a>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
          <p style="color:#999;font-size:12px;">&copy; ${new Date().getFullYear()} Actor Agency. All rights reserved.</p>
        </body>
        </html>
      `,
    });
  }
}

export const emailService = new EmailService();
