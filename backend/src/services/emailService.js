import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { config } from '../config/index.js';

let transporter = null;
let resendClient = null;
const RESEND_DEFAULT_FROM = 'onboarding@resend.dev';

function getTransporter() {
  if (transporter !== null) return transporter;
  const user = (config.smtpUser || '').trim();
  const pass = config.smtpPass || '';
  if (!user || !pass) return null;
  transporter = nodemailer.createTransport({
    host: config.smtpHost || 'smtp.gmail.com',
    port: Number(config.smtpPort) || 587,
    secure: config.smtpSecure === 'true',
    auth: { user, pass },
  });
  return transporter;
}

function getResendClient() {
  if (resendClient !== null) return resendClient;
  const key = (config.resendApiKey || '').trim();
  if (!key) return null;
  resendClient = new Resend(key);
  return resendClient;
}

/** Call once at startup to log email status */
export function logEmailStatus() {
  const resend = getResendClient();
  if (resend) {
    console.log('[Email] Resend configured — OTP emails will be sent to users.');
    return;
  }
  const smtp = getTransporter();
  if (smtp) {
    console.log('[Email] SMTP configured — OTP emails will be sent to users.');
    return;
  }
  console.log('[Email] No email provider configured (set RESEND_API_KEY or SMTP_USER/SMTP_PASS). OTP will be printed in server logs for development.');
}

/**
 * Send OTP email via SMTP. If SMTP is not configured, logs OTP to console (for dev).
 * Returns { sentViaEmail: true } if sent by SMTP, { sentViaEmail: false } if only logged.
 */
export async function sendOtpEmail(toEmail, otp) {
  const subject = 'Your CodeCollab verification code';
  const text = `Your verification code is: ${otp}\n\nIt expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`;
  const html = `
    <p>Your verification code is: <strong>${otp}</strong></p>
    <p>It expires in 10 minutes.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  const configuredFrom = (config.emailFrom || config.smtpUser || '').trim();
  const resendFrom = !configuredFrom || /@gmail\.com$/i.test(configuredFrom) ? RESEND_DEFAULT_FROM : configuredFrom;
  const smtpFrom = configuredFrom || config.smtpUser || 'noreply@codecollab.local';

  const resend = getResendClient();
  if (resend) {
    try {
      const response = await resend.emails.send({
        from: resendFrom,
        to: toEmail,
        subject,
        text,
        html,
      });
      if (response?.error) {
        throw new Error(response.error.message || 'Resend API error');
      }
      console.log('[Email] OTP sent via Resend to', toEmail);
      return { sentViaEmail: true };
    } catch (err) {
      console.error('[Email] Resend send failed:', err.message);
      throw new Error(err.message || 'Failed to send OTP via Resend');
    }
  }

  const smtp = getTransporter();
  if (!smtp) {
    console.log('[Email] OTP for', toEmail, ':', otp, '(Set RESEND_API_KEY or SMTP_USER/SMTP_PASS to send real emails)');
    return { sentViaEmail: false };
  }

  try {
    await smtp.sendMail({ from: smtpFrom, to: toEmail, subject, text, html });
    console.log('[Email] OTP sent to', toEmail);
    return { sentViaEmail: true };
  } catch (err) {
    console.error('[Email] Send failed:', err.message);
    if (err.code === 'EAUTH') {
      throw new Error('Email login failed. For Gmail, use an App Password (https://myaccount.google.com/apppasswords), not your normal password.');
    }
    if (err.code === 'ESOCKET' || err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not connect to email server. Check SMTP_HOST, SMTP_PORT and your network.');
    }
    throw new Error(err.message || 'Failed to send email');
  }
}
