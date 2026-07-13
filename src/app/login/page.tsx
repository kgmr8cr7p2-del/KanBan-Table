import { AuthShell } from "@/components/AuthShell";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthShell mode="login" nextPath={next} />;
}
