import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import { getServerSession } from "next-auth";
import { APP_URL } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: "database",
  },
  debug: process.env.NEXT_PUBLIC_APP_URL?.includes("splitninja.space") ? true : undefined,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async redirect({ url }) {
      console.info("[auth] redirect callback", {
        url,
        appUrl: APP_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      });
      if (url.startsWith("/")) {
        return `${APP_URL}${url}`;
      }
      if (url.startsWith(APP_URL)) {
        return url;
      }
      return APP_URL;
    },
    async signIn({ user }) {
      const adminEmails = process.env.ADMIN_EMAILS
        ?.split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

      if (adminEmails && user.email && adminEmails.includes(user.email.toLowerCase())) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: "ADMIN" },
          });
        } catch (error) {
          console.error("Failed to assign admin role", error);
        }
      }

      return true;
    },
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user.role as "MEMBER" | "ADMIN") ?? "MEMBER";
      }
      return session;
    },
  },
  events: {
    async signIn(message) {
      console.info("[auth] signIn event", {
        userId: message.user?.id,
        accountProvider: message.account?.provider,
      });
    },
    async error(message) {
      console.error("[auth] error event", {
        name: message.name,
        message: message.message,
      });
    },
  },
};

export const getServerAuthSession = () => getServerSession(authOptions);
