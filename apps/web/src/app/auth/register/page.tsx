import { redirect } from "next/navigation";

// Sign up now lives on the login page; keep old links working.
export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { returnTo } = await searchParams;
  const params = new URLSearchParams({ mode: "signup" });
  if (typeof returnTo === "string") {
    params.set("returnTo", returnTo);
  }
  redirect(`/auth/login?${params}`);
}
