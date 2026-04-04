import { transactionalMetadata } from "@/lib/seo-metadata";
import { ForgotPasswordClient } from "../../components/auth/forgot-password-client";

export const metadata = transactionalMetadata("Forgot password", {
  description: "Request a link to reset your Regula account password.",
});

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
