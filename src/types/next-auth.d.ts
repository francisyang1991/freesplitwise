import { type DefaultSession } from "next-auth";
import "next-auth/adapters";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "MEMBER" | "ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    role: "MEMBER" | "ADMIN";
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    role: "MEMBER" | "ADMIN";
  }
}
