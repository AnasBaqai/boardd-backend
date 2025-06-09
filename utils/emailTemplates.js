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

  // Professional HTML email with dark mode support and responsive design
  const html = `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Task shared by ${sharedByName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    
    /* Reset and base styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-width: 100% !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.5;
      color: #1a1a1a;
      background-color: #f8f9fa;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    table {
      border-collapse: collapse !important;
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
    }
    
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
      max-width: 100%;
      display: block;
    }
    
    /* Dark mode styles */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #0d1117 !important;
        color: #e6edf3 !important;
      }
      
      .email-container {
        background-color: #161b22 !important;
        border: 1px solid #30363d !important;
      }
      
      .email-header {
        background: linear-gradient(135deg, #238636 0%, #1a7f37 100%) !important;
      }
      
      .task-card {
        background-color: #21262d !important;
        border: 1px solid #30363d !important;
      }
      
      .task-title {
        color: #e6edf3 !important;
      }
      
      .task-meta, .context-info {
        color: #8b949e !important;
      }
      
      .task-description {
        color: #c9d1d9 !important;
      }
      
      .custom-message-card {
        background-color: #21262d !important;
        border: 1px solid #30363d !important;
      }
      
      .custom-message-text {
        color: #c9d1d9 !important;
      }
      
      .footer-content {
        background-color: #0d1117 !important;
        border-top: 1px solid #21262d !important;
      }
      
      .footer-text {
        color: #8b949e !important;
      }
      
      .divider {
        background-color: #21262d !important;
      }
    }
    
    /* Light mode specific overrides */
    @media (prefers-color-scheme: light) {
      .email-container {
        background-color: #ffffff;
        border: 1px solid #e1e4e8;
      }
      
      .task-card {
        background-color: #f6f8fa;
        border: 1px solid #e1e4e8;
      }
      
      .custom-message-card {
        background-color: #f6f8fa;
        border: 1px solid #e1e4e8;
      }
      
      .footer-content {
        background-color: #f6f8fa;
        border-top: 1px solid #e1e4e8;
      }
    }
    
    /* Container styles */
    .email-wrapper {
      width: 100%;
      background-color: #f8f9fa;
      padding: 24px 16px;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      border: 1px solid #e1e4e8;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    /* Header styles */
    .email-header {
      background: linear-gradient(135deg, #2ea043 0%, #238636 100%);
      padding: 32px 32px 24px 32px;
      text-align: left;
    }
    
    .header-top {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .logo {
      height: 32px;
      width: auto;
      margin-right: 12px;
      filter: brightness(0) invert(1);
    }
    
    .header-brand {
      color: #ffffff;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    
    .header-title {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
      margin: 0;
      letter-spacing: -0.02em;
    }
    
    .header-subtitle {
      color: rgba(255, 255, 255, 0.85);
      font-size: 16px;
      font-weight: 400;
      margin-top: 8px;
      line-height: 1.4;
    }
    
    /* Content styles */
    .email-content {
      padding: 32px;
    }
    
    .greeting {
      font-size: 18px;
      font-weight: 500;
      color: #1a1a1a;
      margin-bottom: 24px;
      line-height: 1.3;
    }
    
    .share-intro {
      font-size: 16px;
      color: #57606a;
      margin-bottom: 32px;
      line-height: 1.5;
    }
    
    .sharer-name {
      color: #2ea043;
      font-weight: 600;
    }
    
    /* Task card styles */
    .task-card {
      background-color: #f6f8fa;
      border: 1px solid #e1e4e8;
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
    }
    
    .task-header {
      display: flex;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    
    .task-icon {
      width: 20px;
      height: 20px;
      margin-right: 12px;
      margin-top: 2px;
      fill: #656d76;
      flex-shrink: 0;
    }
    
    .task-content {
      flex: 1;
      min-width: 0;
    }
    
    .task-title {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0 0 8px 0;
      line-height: 1.3;
      word-wrap: break-word;
    }
    
    .task-meta {
      display: flex;
      align-items: center;
      font-size: 14px;
      color: #656d76;
      margin-bottom: 12px;
    }
    
    .context-info {
      font-size: 14px;
      color: #656d76;
      font-weight: 500;
    }
    
    .task-description {
      font-size: 15px;
      color: #1a1a1a;
      line-height: 1.5;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e1e4e8;
    }
    
    /* Custom message styles */
    .custom-message-card {
      background-color: #f6f8fa;
      border: 1px solid #e1e4e8;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    
    .custom-message-header {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .message-icon {
      width: 16px;
      height: 16px;
      margin-right: 8px;
      fill: #656d76;
    }
    
    .custom-message-title {
      font-size: 14px;
      font-weight: 600;
      color: #656d76;
    }
    
    .custom-message-text {
      font-size: 15px;
      color: #1a1a1a;
      line-height: 1.5;
      font-style: italic;
    }
    
    /* CTA styles */
    .cta-section {
      text-align: center;
      margin: 32px 0;
    }
    
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #2ea043 0%, #238636 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      line-height: 1;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(46, 160, 67, 0.2);
      letter-spacing: -0.01em;
    }
    
    .cta-button:hover {
      background: linear-gradient(135deg, #238636 0%, #1a7f37 100%);
      box-shadow: 0 2px 6px rgba(46, 160, 67, 0.3);
      transform: translateY(-1px);
    }
    
    /* Divider */
    .divider {
      height: 1px;
      background-color: #e1e4e8;
      margin: 24px 0;
    }
    
    .alternative-link {
      text-align: center;
      margin: 16px 0;
    }
    
    .alternative-text {
      font-size: 13px;
      color: #656d76;
      margin-bottom: 8px;
    }
    
    .alternative-url {
      font-size: 12px;
      color: #0969da;
      word-break: break-all;
      background-color: #f6f8fa;
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid #e1e4e8;
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    }
    
    /* Footer styles */
    .footer-content {
      background-color: #f6f8fa;
      border-top: 1px solid #e1e4e8;
      padding: 24px 32px;
      text-align: center;
    }
    
    .footer-text {
      font-size: 14px;
      color: #656d76;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    
    .footer-branding {
      font-size: 12px;
      color: #8b949e;
    }
    
    .footer-branding a {
      color: #2ea043;
      text-decoration: none;
      font-weight: 500;
    }
    
    /* Mobile responsive styles */
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 16px 8px;
      }
      
      .email-container {
        border-radius: 0;
        border-left: none;
        border-right: none;
      }
      
      .email-header {
        padding: 24px 20px 20px 20px;
      }
      
      .header-title {
        font-size: 20px;
      }
      
      .header-subtitle {
        font-size: 14px;
      }
      
      .email-content, .footer-content {
        padding: 24px 20px;
      }
      
      .task-card, .custom-message-card {
        padding: 20px;
      }
      
      .task-title {
        font-size: 16px;
      }
      
      .cta-button {
        width: 100%;
        padding: 16px 24px;
        font-size: 16px;
      }
      
      .greeting {
        font-size: 16px;
      }
    }
    
    /* Very small mobile devices */
    @media only screen and (max-width: 480px) {
      .email-header {
        padding: 20px 16px;
      }
      
      .email-content, .footer-content {
        padding: 20px 16px;
      }
      
      .task-card, .custom-message-card {
        padding: 16px;
      }
      
      .header-top {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      
      .logo {
        margin-right: 0;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <!-- Header -->
      <div class="email-header">
        <div class="header-top">
          <img src="${logoUrl}" alt="Boardd" class="logo" />
          <div class="header-brand">Boardd</div>
        </div>
        <h1 class="header-title">Task shared with you</h1>
        <div class="header-subtitle">You have a new task to review</div>
      </div>
      
      <!-- Content -->
      <div class="email-content">
        <div class="greeting">Hi there 👋</div>
        
        <div class="share-intro">
          <span class="sharer-name">${sharedByName}</span> has shared a task with you on Boardd.
        </div>
        
        <!-- Task Card -->
        <div class="task-card">
          <div class="task-header">
            <svg class="task-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.75 2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25H2.75ZM1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 15H2.75A1.75 1.75 0 0 1 1 13.25V2.75Zm6.22 3.47a.75.75 0 0 1 1.06 0L11 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L11 11.06a.75.75 0 0 1-1.06 0L7.22 8.34a.75.75 0 0 1 0-1.06Z"/>
            </svg>
            <div class="task-content">
              <div class="task-title">${taskTitle}</div>
              <div class="task-meta">
                <div class="context-info">${contextPath}</div>
              </div>
              ${
                taskDescription
                  ? `<div class="task-description">${taskDescription}</div>`
                  : ""
              }
            </div>
          </div>
        </div>
        
        ${
          customMessage
            ? `
        <!-- Custom Message -->
        <div class="custom-message-card">
          <div class="custom-message-header">
            <svg class="message-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 13H2.06l-1.845 1.845A.25.25 0 0 1 0 14.655V2.75ZM1.5 2.75v10.445L2.445 12.5h11.805a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25Z"/>
            </svg>
            <div class="custom-message-title">Message from ${sharedByName}</div>
          </div>
          <div class="custom-message-text">"${customMessage}"</div>
        </div>
        `
            : ""
        }
        
        <!-- CTA -->
        <div class="cta-section">
          <a href="${shareLink}" class="cta-button">View Task</a>
        </div>
        
        <div class="divider"></div>
        
        <!-- Alternative Link -->
        <div class="alternative-link">
          <div class="alternative-text">Or copy and paste this link:</div>
          <div class="alternative-url">${shareLink}</div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer-content">
        <div class="footer-text">
          This task was shared via Boardd
        </div>
        <div class="footer-branding">
          <a href="${
            process.env.FRONTEND_URL || "https://boardd.io"
          }">Powered by Boardd</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Professional plain text version
  const text = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 TASK SHARED WITH YOU

Hi there!

${sharedByName} has shared a task with you on Boardd.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 TASK DETAILS

Title: ${taskTitle}
${taskDescription ? `Description: ${taskDescription}` : ""}
Location: ${contextPath}

${customMessage ? `💬 Message from ${sharedByName}:\n"${customMessage}"` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 VIEW TASK

${shareLink}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This task was shared via Boardd.
Powered by Boardd - ${process.env.FRONTEND_URL || "https://boardd.io"}
  `;

  return { html, text };
};
