import { transactionalMetadata } from "@/lib/seo-metadata";
import { RegisterClient } from "../../components/auth/register-client";

export const metadata = transactionalMetadata("Create account", {
  description: "Create a Regula account to start monitoring regulatory change.",
});

export default function RegisterPage() {
  return <RegisterClient />;
}
