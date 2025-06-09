/**
 * Email templates for various notifications
 */

/**
 * Generate invite email template
 * @param {Object} params Parameters for the template
 * @param {string} params.companyName Company name
 * @param {string} params.role User role (admin, employee, etc)
 * @param {string} params.inviteLink Invitation link
 * @param {string} params.adminName Name of the admin who sent the invite
 * @param {string} params.adminEmail Email of the admin who sent the invite
 * @returns {Object} Object containing HTML and text versions of the email
 */
exports.generateInviteEmail = ({
  companyName,
  role,
  inviteLink,
  adminName,
  adminEmail,
}) => {
  const baseUrl = process.env.BACKEND_URL;
  const logoUrl = `${baseUrl}/assets/images/boardd-logo.png`;

  // HTML email with modern professional styling
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join ${companyName} on Boardd</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f9fafb;
      -webkit-text-size-adjust: none;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 32px 40px;
      text-align: center;
    }
    
    .logo {
      height: 48px;
      width: auto;
      margin-bottom: 16px;
      filter: brightness(0) invert(1);
    }
    
    .header-title {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    
    .email-body {
      padding: 40px;
    }
    
    .greeting {
      font-size: 18px;
      color: #1f2937;
      margin-bottom: 24px;
      font-weight: 500;
    }
    
    .invite-message {
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 32px;
      line-height: 1.7;
    }
    
    .company-highlight {
      color: #667eea;
      font-weight: 600;
    }
    
    .role-highlight {
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 700;
      text-transform: capitalize;
    }
    
    .admin-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-left: 4px solid #667eea;
      padding: 20px;
      border-radius: 8px;
      margin: 24px 0;
    }
    
    .admin-card-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
    }
    
    .admin-card-title::before {
      content: "👋";
      margin-right: 8px;
    }
    
    .admin-details {
      font-size: 15px;
      color: #1f2937;
      font-weight: 500;
      margin-bottom: 6px;
    }
    
    .admin-note {
      font-size: 13px;
      color: #6b7280;
      font-style: italic;
    }
    
    .cta-section {
      text-align: center;
      margin: 32px 0;
    }
    
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 4px 14px 0 rgba(102, 126, 234, 0.3);
      text-align: center;
      min-width: 200px;
    }
    
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px 0 rgba(102, 126, 234, 0.4);
    }
    
    .alternative-link {
      margin-top: 24px;
      padding: 16px;
      background-color: #f9fafb;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    
    .alternative-text {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    
    .alternative-url {
      font-size: 12px;
      color: #4b5563;
      word-break: break-all;
      background-color: #ffffff;
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #d1d5db;
    }
    
    .expiry-notice {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 6px;
      margin: 24px 0;
    }
    
    .expiry-text {
      font-size: 14px;
      color: #92400e;
      font-weight: 500;
    }
    
    .email-footer {
      background-color: #f9fafb;
      padding: 32px 40px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    
    .footer-text {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 16px;
    }
    
    .footer-branding {
      font-size: 12px;
      color: #9ca3af;
    }
    
    .footer-branding a {
      color: #667eea;
      text-decoration: none;
    }
    
    @media only screen and (max-width: 600px) {
      .email-container {
        margin: 0;
        border-radius: 0;
      }
      
      .email-header, .email-body, .email-footer {
        padding: 24px 20px;
      }
      
      .header-title {
        font-size: 24px;
      }
      
      .cta-button {
        padding: 14px 24px;
        font-size: 15px;
        min-width: auto;
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="email-header">
      <img src="${logoUrl}" alt="Boardd" class="logo" />
      <h1 class="header-title">You're invited!</h1>
    </div>
    
    <!-- Body -->
    <div class="email-body">
      <div class="greeting">Hello there! 👋</div>
      
      <div class="invite-message">
        You've been invited to join <span class="company-highlight">${companyName}</span> as a <span class="role-highlight">${role}</span> on Boardd.
        <br><br>
        Boardd is a powerful collaboration platform that helps teams stay organized, communicate effectively, and achieve their goals together.
      </div>
      
      ${
        adminName
          ? `
      <div class="admin-card">
        <div class="admin-card-title">Invited by</div>
        <div class="admin-details">${adminName}${
              adminEmail ? ` • ${adminEmail}` : ""
            }</div>
        <div class="admin-note">You can reply to this email to contact them directly</div>
      </div>
      `
          : ""
      }
      
      <div class="cta-section">
        <a href="${inviteLink}" class="cta-button">Accept Invitation</a>
      </div>
      
      <div class="alternative-link">
        <div class="alternative-text">Or copy and paste this link in your browser:</div>
        <div class="alternative-url">${inviteLink}</div>
      </div>
      
      <div class="expiry-notice">
        <div class="expiry-text">⏰ This invitation expires in 7 days</div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="email-footer">
      <div class="footer-text">
        Welcome to the future of team collaboration!
        <br>
        Best regards,<br>
        The ${companyName} Team
      </div>
      <div class="footer-branding">
        Powered by <a href="${process.env.FRONTEND_URL}">Boardd</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Enhanced plain text fallback
  const text = `
🎉 You're invited to join ${companyName}!

Hello!

You've been invited to join ${companyName} as a ${role} on Boardd.

${
  adminName
    ? `👋 Invited by: ${adminName}${adminEmail ? ` (${adminEmail})` : ""}`
    : ""
}
${adminName ? "💬 You can reply to this email to contact them directly." : ""}

Boardd is a powerful collaboration platform that helps teams stay organized, communicate effectively, and achieve their goals together.

🚀 Accept your invitation:
${inviteLink}

⏰ This invitation expires in 7 days.

Welcome to the future of team collaboration!

Best regards,
The ${companyName} Team

---
Powered by Boardd
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

/**
 * Generate task sharing email template
 * @param {Object} params Parameters for the template
 * @param {string} params.taskTitle Task title
 * @param {string} params.taskDescription Task description
 * @param {string} params.sharedByName Name of the person sharing
 * @param {string} params.shareLink Task share link
 * @param {string} params.contextPath Channel / Tab / Project path
 * @param {string} params.customMessage Custom message from sender
 * @returns {Object} Object containing HTML and text versions of the email
 */
exports.generateTaskShareEmail = ({
  taskTitle,
  taskDescription,
  sharedByName,
  shareLink,
  contextPath,
  customMessage,
}) => {
  const baseUrl = process.env.BACKEND_URL;
  const logoUrl = `${baseUrl}/assets/images/boardd-logo.png`;

  // HTML email with modern professional styling
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sharedByName} shared a task with you</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f9fafb;
      -webkit-text-size-adjust: none;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .email-header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 32px 40px;
      text-align: center;
    }
    
    .logo {
      height: 48px;
      width: auto;
      margin-bottom: 16px;
      filter: brightness(0) invert(1);
    }
    
    .header-title {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    
    .header-subtitle {
      color: #d1fae5;
      font-size: 16px;
      margin-top: 8px;
    }
    
    .email-body {
      padding: 40px;
    }
    
    .greeting {
      font-size: 18px;
      color: #1f2937;
      margin-bottom: 24px;
      font-weight: 500;
    }
    
    .share-message {
      font-size: 16px;
      color: #1f2937;
      margin-bottom: 32px;
      line-height: 1.7;
      font-weight: 500;
    }
    
    .sharer-highlight {
      color: #059669;
      font-weight: 700;
    }
    
    .task-card {
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
      border-left: 4px solid #10b981;
      padding: 24px;
      border-radius: 12px;
      margin: 24px 0;
      border: 1px solid #d1fae5;
    }
    
    .task-title {
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
    }
    
    .task-title::before {
      content: "📋";
      margin-right: 12px;
      font-size: 24px;
    }
    
    .task-description {
      font-size: 15px;
      color: #1f2937;
      margin-bottom: 16px;
      line-height: 1.6;
      font-weight: 500;
    }
    
    .context-path {
      font-size: 14px;
      color: #374151;
      font-weight: 600;
      display: flex;
      align-items: center;
    }
    
    .context-path::before {
      content: "📂";
      margin-right: 8px;
    }
    
    .custom-message {
      background-color: #f8fafc;
      border-left: 4px solid #6366f1;
      padding: 16px 20px;
      border-radius: 8px;
      margin: 24px 0;
    }
    
    .custom-message-title {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
    }
    
    .custom-message-title::before {
      content: "💬";
      margin-right: 8px;
    }
    
    .custom-message-text {
      font-size: 15px;
      color: #374151;
      font-style: italic;
      font-weight: 500;
    }
    
    .cta-section {
      text-align: center;
      margin: 32px 0;
    }
    
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.3);
      text-align: center;
      min-width: 200px;
    }
    
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px 0 rgba(16, 185, 129, 0.4);
    }
    
    .alternative-link {
      margin-top: 24px;
      padding: 16px;
      background-color: #f9fafb;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    
    .alternative-text {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    
    .alternative-url {
      font-size: 12px;
      color: #4b5563;
      word-break: break-all;
      background-color: #ffffff;
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #d1d5db;
    }
    
    .email-footer {
      background-color: #f9fafb;
      padding: 32px 40px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    
    .footer-text {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 16px;
    }
    
    .footer-branding {
      font-size: 12px;
      color: #9ca3af;
    }
    
    .footer-branding a {
      color: #10b981;
      text-decoration: none;
    }
    
    @media only screen and (max-width: 600px) {
      .email-container {
        margin: 0;
        border-radius: 0;
      }
      
      .email-header, .email-body, .email-footer {
        padding: 24px 20px;
      }
      
      .header-title {
        font-size: 24px;
      }
      
      .cta-button {
        padding: 14px 24px;
        font-size: 15px;
        min-width: auto;
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="email-header">
      <img src="${logoUrl}" alt="Boardd" class="logo" />
      <h1 class="header-title">Task Shared</h1>
      <div class="header-subtitle">Someone shared a task with you</div>
    </div>
    
    <!-- Body -->
    <div class="email-body">
      <div class="greeting">Hello! 👋</div>
      
      <div class="share-message">
        <span class="sharer-highlight">${sharedByName}</span> has shared a task with you on Boardd.
      </div>
      
      <div class="task-card">
        <div class="task-title">${taskTitle}</div>
        ${
          taskDescription
            ? `<div class="task-description">${taskDescription}</div>`
            : ""
        }
        <div class="context-path">${contextPath}</div>
      </div>
      
      ${
        customMessage
          ? `
      <div class="custom-message">
        <div class="custom-message-title">Message from ${sharedByName}</div>
        <div class="custom-message-text">"${customMessage}"</div>
      </div>
      `
          : ""
      }
      
      <div class="cta-section">
        <a href="${shareLink}" class="cta-button">View Task</a>
      </div>
      
      <div class="alternative-link">
        <div class="alternative-text">Or copy and paste this link in your browser:</div>
        <div class="alternative-url">${shareLink}</div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="email-footer">
      <div class="footer-text">
        Stay organized, stay productive!
        <br>
        Best regards,<br>
        The Boardd Team
      </div>
      <div class="footer-branding">
        Powered by <a href="${process.env.FRONTEND_URL}">Boardd</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Enhanced plain text fallback
  const text = `
📋 Task Shared with You

Hello!

${sharedByName} has shared a task with you on Boardd.

📋 Task: ${taskTitle}
${taskDescription ? `📝 Description: ${taskDescription}` : ""}
📂 Location: ${contextPath}

${customMessage ? `💬 Message from ${sharedByName}: "${customMessage}"` : ""}

🔗 View Task:
${shareLink}

Stay organized, stay productive!

Best regards,
The Boardd Team

---
Powered by Boardd
  `;

  return { html, text };
};
