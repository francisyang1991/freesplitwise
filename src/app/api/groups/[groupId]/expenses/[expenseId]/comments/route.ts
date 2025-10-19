import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{
    groupId: string;
    expenseId: string;
  }>;
};

const authorSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

export async function GET(_req: NextRequest, context: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId, expenseId } = await context.params;

  const membership = await prisma.membership.findFirst({
    where: {
      groupId,
      userId: session.user.id,
    },
    select: {
      id: true,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expense = await prisma.expense.findFirst({
    where: {
      id: expenseId,
      groupId,
    },
    select: {
      id: true,
    },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const comments = await prisma.expenseComment.findMany({
    where: { expenseId },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      author: {
        select: authorSelect,
      },
    },
  });

  return NextResponse.json({
    comments: comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      author: comment.author,
      authorName: comment.authorName,
      isOfficial: comment.authorId === null,
    })),
  });
}

export async function POST(req: NextRequest, context: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId, expenseId } = await context.params;

  const membership = await prisma.membership.findFirst({
    where: {
      groupId,
      userId: session.user.id,
    },
    select: {
      id: true,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expense = await prisma.expense.findFirst({
    where: {
      id: expenseId,
      groupId,
    },
    select: {
      id: true,
    },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const payload = await req.json().catch(() => null);
  const body =
    payload && typeof payload === "object" && typeof payload.body === "string"
      ? payload.body.trim()
      : "";

  if (!body) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  if (body.length > 1000) {
    return NextResponse.json({ error: "Comment is too long" }, { status: 400 });
  }

  const comment = await prisma.expenseComment.create({
    data: {
      expenseId,
      authorId: session.user.id,
      body,
    },
    include: {
      author: {
        select: authorSelect,
      },
    },
  });

  return NextResponse.json(
    {
      comment: {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        author: comment.author,
        authorName: comment.authorName,
        isOfficial: comment.authorId === null,
      },
    },
    { status: 201 },
  );
}
