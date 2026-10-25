import nodemailer from 'nodemailer';
import crypto from 'crypto';

let cachedTransporter = null;

/**
 * Creates and returns a Nodemailer transporter.
 * Uses environment SMTP credentials if provided.
 * Falls back to an Ethereal test account or JSON stream transport in development.
 */
export const getTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const service = process.env.EMAIL_SERVICE;

  // Real SMTP / Service configuration
  if (service || (host && user && pass)) {
    cachedTransporter = nodemailer.createTransport(
      service
        ? {
            service,
            auth: { user, pass },
          }
        : {
            host,
            port,
            secure: port === 465 || process.env.SMTP_SECURE === 'true',
            auth: { user, pass },
          }
    );
    return cachedTransporter;
  }

  // Development / Test fallback: create Ethereal test account so local testing works out of the box
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log(`[Nodemailer] Using Ethereal test account: ${testAccount.user}`);
    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return cachedTransporter;
  } catch (err) {
    console.warn(`[Nodemailer] Failed to create Ethereal account: ${err.message}. Falling back to JSON transport.`);
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return cachedTransporter;
  }
};

/**
 * Generates a cryptographically secure 6-digit numeric OTP string.
 */
export const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Sends a 6-digit OTP verification email to the user.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.otp - 6-digit OTP code
 * @param {string} [options.userName] - Recipient name
 * @returns {Promise<{ info: any, previewUrl?: string }>}
 */
export const sendOtpEmail = async ({ to, otp, userName = 'Customer' }) => {
  const transporter = await getTransporter();
  const from =
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    '"Karakoram Store" <noreply@karakoramstore.com>';

  const subject = `Your Verification Code: ${otp} - Karakoram Store`;
  const text = `Hello ${userName},\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this verification code, please ignore this email.\n\nBest regards,\nKarakoram Store Team`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f8; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #064e3b 0%, #047857 100%); padding: 36px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">Karakoram Store</h1>
              <p style="margin: 6px 0 0 0; color: #a7f3d0; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">Treasures of Gilgit-Baltistan</p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 600;">Account Verification</h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                Hello <strong>${userName}</strong>,<br>
                Please use the following 6-digit One-Time Password (OTP) to verify your account:
              </p>
              
              <!-- OTP Box -->
              <div style="background: #f0fdf4; border: 2px dashed #10b981; border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #065f46; font-family: 'Courier New', Courier, monospace; display: inline-block; padding-left: 10px;">
                  ${otp}
                </span>
                <p style="margin: 10px 0 0 0; font-size: 13px; color: #047857; font-weight: 600;">
                  Expires in 10 minutes
                </p>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                <strong>Security note:</strong> If you did not request this code, you can safely ignore this email. Never share your OTP with anyone.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
              &copy; ${new Date().getFullYear()} Karakoram Store. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[Nodemailer] OTP email sent! Preview URL: ${previewUrl}`);
  }

  return { info, previewUrl: previewUrl || undefined };
};
