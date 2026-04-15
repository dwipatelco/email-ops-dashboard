import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getSession } from "@/lib/server/session";

import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Mail Monitor</CardTitle>
            <CardDescription>
              Sign in with the internal admin account to access mailbox operations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {params.error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Invalid credentials.
                </div>
              ) : null}
              <form className="flex flex-col gap-4" action={loginAction}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="username">Username</FieldLabel>
                    <Input id="username" name="username" required autoComplete="username" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input id="password" name="password" type="password" required autoComplete="current-password" />
                  </Field>
                </FieldGroup>
                <Button className="w-full" type="submit">
                  Sign In
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
