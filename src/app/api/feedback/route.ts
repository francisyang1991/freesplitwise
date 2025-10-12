import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const message =
    typeof body?.message === "string" ? body.message.trim() : "";
  const ratingRaw = body?.rating;
  const rating =
    typeof ratingRaw === "number" && Number.isFinite(ratingRaw)
      ? Math.max(1, Math.min(5, Math.round(ratingRaw)))
      : null;

  if (!message) {
    return NextResponse.json(
      { error: "Please share a short message so we can help." },
      { status: 400 },
    );
  }

  try {
    await prisma.feedback.create({
      data: {
        userId: session.user.id,
        message,
        rating,
      },
    });
  } catch (error) {
    console.error("Failed to store feedback", error);
    return NextResponse.json(
      { error: "Unable to save feedback right now. Try again later." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
