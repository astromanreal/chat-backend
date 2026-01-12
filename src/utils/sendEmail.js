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

  if (options.type === 'welcome') {
    const { username, websiteLink } = options.context;
    htmlBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome Aboard!</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #0c1427; color: #e0e0e0; margin: 0; padding: 20px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: auto; background-color: #162447; border-radius: 12px; box-shadow: 0 8px 16px rgba(0,0,0,0.4); border: 1px solid #334a8a;">
            <tr>
                <td align="center" style="padding: 40px 20px 20px 20px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 48px; font-weight: 700;">🚀</h1>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 0 20px 20px 20px;">
                     <h2 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">Welcome Aboard, ${username}!</h2>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px 40px 30px 40px; color: #c0c0c0; font-size: 16px; line-height: 1.7; text-align: center;">
                    <p style="margin: 0;">Your account is verified and your mission is ready to begin. You are now an official member of the <strong>Space Exploration</strong> crew.</p>
                    <p style="margin-top: 15px;">Prepare for liftoff and start discovering the cosmos with us.</p>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 10px 0 40px 0;">
                    <a href="${websiteLink}" style="background-color: #6f42c1; color: #ffffff; padding: 16px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 8px rgba(111, 66, 193, 0.3);">Launch Dashboard</a>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 20px; font-size: 12px; color: #7f8c8d; border-top: 1px solid #334a8a;">
                    <p style="margin:0;">&copy; ${new Date().getFullYear()} Space Exploration. All Rights Reserved.</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
    textBody = `Welcome aboard, ${username}! Your account is verified and your mission is ready to begin. Launch your dashboard here: ${websiteLink}`;

  } else { // Default to the OTP email template
    const otp = options.message;
    htmlBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f9f9f9;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
                <td align="center" style="padding: 30px 20px;">
                    <h1 style="color: #333; margin: 0; font-size: 22px;">${options.subject}</h1>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 0 20px 20px 20px;">
                    <p style="color: #555; font-size: 16px;">Your one-time verification code is:</p>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding-bottom: 30px;">
                    <div style="background-color: #f0f0f0; border-radius: 5px; padding: 12px 20px; display: inline-block;">
                        <h2 style="color: #333; font-size: 30px; font-weight: bold; margin: 0; letter-spacing: 3px;">
                            ${otp}
                        </h2>
                    </div>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 0 20px 30px 20px;">
                   <p style="font-size: 14px; color: #888;">If you did not request this code, you can safely ignore this email.</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
    textBody = `Your one-time code is: ${otp}`;
  }

  const mailOptions = {
    from: `"Space Exploration" <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    html: htmlBody,
    text: textBody,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;
