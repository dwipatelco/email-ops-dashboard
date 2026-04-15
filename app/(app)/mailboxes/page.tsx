import { formatDistanceToNow } from "date-fns";

import { MailboxStatusBadge } from "@/components/features/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getMailboxes } from "@/lib/server/data";

import {
  createMailboxAction,
  deleteMailboxAction,
  queueMailboxSyncAction,
  updateMailboxAction
} from "./actions";

export const dynamic = "force-dynamic";

export default async function MailboxesPage() {
  const mailboxes = await getMailboxes();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Add Mailbox</CardTitle>
          <CardDescription>Create a mailbox source for incoming and outgoing sync.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createMailboxAction} className="flex flex-col gap-4">
            <FieldGroup className="md:grid md:grid-cols-3 md:gap-3">
              <Field>
                <FieldLabel htmlFor="create-email">Email</FieldLabel>
                <Input id="create-email" name="email" placeholder="ops@example.com" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="create-host">Host</FieldLabel>
                <Input id="create-host" name="host" placeholder="imap.host.tld" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="create-port">Port</FieldLabel>
                <Input id="create-port" name="port" type="number" defaultValue={993} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="create-username">Username</FieldLabel>
                <Input id="create-username" name="username" placeholder="username" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="create-password">Password</FieldLabel>
                <Input id="create-password" name="password" type="password" placeholder="app password" required />
              </Field>
              <Field>
                <FieldSet>
                  <Field orientation="horizontal">
                    <input defaultChecked id="create-secure" name="secure" type="checkbox" />
                    <FieldContent>
                      <FieldLabel htmlFor="create-secure">TLS/SSL</FieldLabel>
                      <FieldDescription>Use encrypted IMAP transport.</FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldSet>
              </Field>
            </FieldGroup>
            <div className="flex items-center justify-end">
              <Button type="submit">Save Mailbox</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {mailboxes.map((mailbox) => (
          <Card key={mailbox.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <CardTitle>{mailbox.email}</CardTitle>
                  <CardDescription>
                    {mailbox.host}:{mailbox.port} · {mailbox.username}
                  </CardDescription>
                </div>
                <MailboxStatusBadge status={mailbox.status} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="text-xs text-muted-foreground">
                <p>
                  Last sync: {mailbox.lastSyncFinishedAt ? formatDistanceToNow(mailbox.lastSyncFinishedAt, { addSuffix: true }) : "Never"}
                </p>
                <p>Last error: {mailbox.lastSyncError ?? "-"}</p>
              </div>

              <form action={updateMailboxAction} className="flex flex-col gap-3">
                <input name="id" type="hidden" value={mailbox.id} />
                <FieldGroup className="md:grid md:grid-cols-3 md:gap-3">
                  <Field>
                    <FieldLabel htmlFor={`email-${mailbox.id}`}>Email</FieldLabel>
                    <Input id={`email-${mailbox.id}`} name="email" defaultValue={mailbox.email} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`host-${mailbox.id}`}>Host</FieldLabel>
                    <Input id={`host-${mailbox.id}`} name="host" defaultValue={mailbox.host} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`port-${mailbox.id}`}>Port</FieldLabel>
                    <Input id={`port-${mailbox.id}`} name="port" type="number" defaultValue={mailbox.port} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`username-${mailbox.id}`}>Username</FieldLabel>
                    <Input id={`username-${mailbox.id}`} name="username" defaultValue={mailbox.username} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`password-${mailbox.id}`}>Password</FieldLabel>
                    <Input
                      id={`password-${mailbox.id}`}
                      name="password"
                      type="password"
                      placeholder="Leave blank to keep current"
                    />
                  </Field>
                  <Field>
                    <FieldSet>
                      <Field orientation="horizontal">
                        <input id={`secure-${mailbox.id}`} name="secure" type="checkbox" defaultChecked={mailbox.secure} />
                        <FieldContent>
                          <FieldLabel htmlFor={`secure-${mailbox.id}`}>TLS/SSL</FieldLabel>
                          <FieldDescription>Keep transport encrypted.</FieldDescription>
                        </FieldContent>
                      </Field>
                    </FieldSet>
                  </Field>
                </FieldGroup>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" variant="outline">
                    Update
                  </Button>
                </div>
              </form>

              <div className="flex flex-wrap gap-2">
                <form action={queueMailboxSyncAction}>
                  <input name="id" type="hidden" value={mailbox.id} />
                  <Button type="submit">Queue Sync</Button>
                </form>
                <form action={deleteMailboxAction}>
                  <input name="id" type="hidden" value={mailbox.id} />
                  <Button type="submit" variant="destructive">
                    Delete
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
