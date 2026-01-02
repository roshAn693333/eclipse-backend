import nodemailer from "nodemailer";

export const sendEmail = async (subject, text) => {
  // create transporter INSIDE function
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // verify connection (important for debugging)
  await transporter.verify();

  await transporter.sendMail({
    from: `"Period Care ❤️" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject,
    text,
  });
};
