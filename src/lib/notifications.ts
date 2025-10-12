const collectAdminEmails = () => {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item);
};

type FeedbackNotification = {
  message: string;
  rating: number | null;
  feedbackId: string;
  author: {
    name?: string | null;
    email?: string | null;
  };
};

export const sendFeedbackNotification = async (
  notification: FeedbackNotification,
) => {
  const adminEmails = collectAdminEmails();
  if (adminEmails.length === 0) return;

  if (process.env.NODE_ENV !== "production") {
    console.info("[feedback] captured", {
      admins: adminEmails,
      feedbackId: notification.feedbackId,
    });
  }
};
