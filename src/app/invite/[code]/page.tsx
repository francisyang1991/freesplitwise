import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { InviteHandler } from "./invite-handler";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  
  const session = await getServerAuthSession();
  if (!session) {
    redirect(`/signin?callbackUrl=/invite/${code}`);
  }

  return <InviteHandler code={code} userId={session.user.id} />;
}
