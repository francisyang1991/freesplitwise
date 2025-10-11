const DEV_FALLBACK = "http://localhost:3000";
const PROD_FALLBACK = "https://splitninja.space";

const isProduction = process.env.NODE_ENV === "production";

const normalizeUrl = (url: string) => url.replace(/\/$/, "");

const candidateUrls: (string | undefined)[] = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXTAUTH_URL,
  isProduction ? process.env.APP_PROD_URL : process.env.APP_DEV_URL,
  isProduction ? PROD_FALLBACK : DEV_FALLBACK,
];

const resolvedUrl = normalizeUrl(
  candidateUrls.find((value) => typeof value === "string" && value.trim().length > 0) ??
    (isProduction ? PROD_FALLBACK : DEV_FALLBACK),
);

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = resolvedUrl;
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = resolvedUrl;
}

export const APP_URL = resolvedUrl;
export const IS_PRODUCTION = isProduction;
