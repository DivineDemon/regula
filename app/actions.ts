"use server";

import { Resend } from "resend";
import { z } from "zod";

const resend = new Resend(process.env.RESEND_API_KEY);

const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export async function sendContactEmail(data: z.infer<typeof contactSchema>) {
  const result = contactSchema.safeParse(data);

  if (!result.success) {
    return { error: "Invalid form data" };
  }

  const { name, email, message } = result.data;

  try {
    const { error } = await resend.emails.send({
      from:
        process.env.EMAIL_FROM ??
        "Regula Contact <onboarding@regula.mushoodhanif.com>",
      to: ["infoscintia@gmail.com"], // Assuming this is the recipient based on conversation history context
      subject: `New Inquiry from ${name}`,
      replyTo: email,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    });

    if (error) {
      console.error("Resend error:", error);
      return { error: "Failed to send email. Please try again." };
    }

    return { success: true };
  } catch (error) {
    console.error("Server error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}
