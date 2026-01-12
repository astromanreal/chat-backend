import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // Use true for port 465, false for others
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  let htmlBody;
  let textBody;

  // Shared modern styles
  const bodyStyle = "background-color: #f8f9fa; font-family: Arial, sans-serif; color: #212529; margin: 0; padding: 20px;";
  const tableStyle = "max-width: 600px; width: 100%; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);";
  const pStyle = "color: #495057; font-size: 16px; line-height: 1.6;";
  const footerStyle = "padding: 30px; font-size: 12px; color: #6c757d; text-align: center;";

  if (options.type === 'welcome') {
    const { username, websiteLink } = options.context;
    htmlBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Cryptic Connect</title>
    </head>
    <body style="${bodyStyle}">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="${tableStyle}">
            <tr>
                <td align="center" style="padding: 40px 30px 20px 30px;">
                    <h1 style="color: #212529; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Cryptic Connect</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px 40px;">
                    <p style="${pStyle}">Hi ${username},</p>
                    <p style="${pStyle}">Thanks for signing up! We're excited to have you join our community for secure and private conversations.</p>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 30px;">
                    <a href="${websiteLink}" style="background-color: #6f42c1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Go to Your Dashboard</a>
                </td>
            </tr>
            <tr>
                <td style="${footerStyle}">
                     <hr style="border: 0; border-top: 1px solid #e9ecef; margin-bottom: 20px;">
                    <p style="margin:0;">&copy; ${new Date().getFullYear()} Cryptic Connect. All Rights Reserved.</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
    textBody = `Welcome, ${username}! Your secure account for Cryptic Connect has been created. Get started here: ${websiteLink}`;

  } else { // Default to the OTP email template
    const otp = options.message;
    htmlBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${options.subject}</title>
    </head>
    <body style="${bodyStyle}">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="${tableStyle}">
            <tr>
                <td align="center" style="padding: 40px 30px 20px 30px;">
                    <h1 style="color: #212529; margin: 0; font-size: 24px; font-weight: 600;">${options.subject}</h1>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 20px 30px;">
                    <p style="${pStyle}">Your one-time verification code is:</p>
                    <div style="background-color: #e9ecef; border-radius: 6px; padding: 15px 25px; margin: 20px 0; display: inline-block;">
                        <h2 style="color: #212529; font-size: 32px; font-weight: 700; margin: 0; letter-spacing: 4px; font-family: 'Courier New', Courier, monospace;">
                            ${otp}
                        </h2>
                    </div>
                </td>
            </tr>
            <tr>
                <td style="${footerStyle}">
                    <hr style="border: 0; border-top: 1px solid #e9ecef; margin-bottom: 20px;">
                    <p style="margin:0;">If you did not request this code, you can safely ignore this email.</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
    textBody = `Your one-time code is: ${otp}`;
  }

  const mailOptions = {
    from: `"Cryptic Connect" <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    html: htmlBody,
    text: textBody,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;
