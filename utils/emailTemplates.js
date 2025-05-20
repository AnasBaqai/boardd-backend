/**
 * Email templates for various notifications
 */

/**
 * Generate invite email template
 * @param {Object} params Parameters for the template
 * @param {string} params.companyName Company name
 * @param {string} params.role User role (admin, employee, etc)
 * @param {string} params.inviteLink Invitation link
 * @returns {Object} Object containing HTML and text versions of the email
 */
exports.generateInviteEmail = ({ companyName, role, inviteLink }) => {
  // HTML email with clickable link
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>You've been invited to join ${companyName}</h2>
    <p>Hello,</p>
    <p>You have been invited to join <strong>${companyName}</strong> as a <strong>${role}</strong>.</p>
    <p>Please click the button below to complete your registration:</p>
    
    <a href="${inviteLink}" class="button">Accept Invitation</a>
    
    <p>Or copy and paste this link into your browser:</p>
    <p><a href="${inviteLink}">${inviteLink}</a></p>
    
    <p>This invite link will expire in 7 days.</p>
    
    <div class="footer">
      <p>Best regards,<br>The ${companyName} Team</p>
    </div>
  </div>
</body>
</html>
  `;

  // Plain text fallback
  const text = `
Hello,

You have been invited to join ${companyName} as a ${role}.
Please click on the link below or copy it into your browser to complete your registration:

${inviteLink}

This invite link will expire in 7 days.

Best regards,
The ${companyName} Team
  `;

  return { html, text };
};

/**
 * Generate welcome email template
 * @param {Object} params Parameters for the template
 * @param {string} params.userName User's name
 * @param {string} params.companyName Company name
 * @param {string} params.loginLink Login link
 * @returns {Object} Object containing HTML and text versions of the email
 */
exports.generateWelcomeEmail = ({ userName, companyName, loginLink }) => {
  // HTML email with clickable link
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Welcome to ${companyName}!</h2>
    <p>Hello ${userName},</p>
    <p>Your account has been successfully created. Welcome to <strong>${companyName}</strong>!</p>
    <p>Click the button below to login to your account:</p>
    
    <a href="${loginLink}" class="button">Login to Your Account</a>
    
    <p>Or copy and paste this link into your browser:</p>
    <p><a href="${loginLink}">${loginLink}</a></p>
    
    <div class="footer">
      <p>Best regards,<br>The ${companyName} Team</p>
    </div>
  </div>
</body>
</html>
  `;

  // Plain text fallback
  const text = `
Hello ${userName},

Your account has been successfully created. Welcome to ${companyName}!

Click on the link below or copy it into your browser to login to your account:

${loginLink}

Best regards,
The ${companyName} Team
  `;

  return { html, text };
};
