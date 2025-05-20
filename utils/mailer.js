const nodeMailer = require("nodemailer");

class Mailer {
  static async sendEmail({ email, subject, message, html }) {
    const transporter = nodeMailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject,
      text: message,
      html: html || undefined, // Include HTML content if provided
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent: " + info.response);
      return info;
    } catch (error) {
      console.log("Email sending error:", error);
      throw error;
    }
  }
}

module.exports = Mailer;
