const DEV_FALLBACK = "http://localhost:3000";
const PROD_FALLBACK = "https://splitninja.space";
const STAGING_FALLBACK = "https://freesplitwise.vercel.app";

const isProduction = process.env.NODE_ENV === "production";
const isStaging = process.env.VERCEL_ENV === "preview" || 
                  process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
                  (typeof window !== "undefined" && window.location.hostname.includes("vercel.app"));

const normalizeUrl = (url: string) => url.replace(/\/$/, "");

const candidateUrls: (string | undefined)[] = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXTAUTH_URL,
  process.env.APP_STAGING_URL,
  isProduction ? process.env.APP_PROD_URL : process.env.APP_DEV_URL,
  isStaging ? STAGING_FALLBACK : (isProduction ? PROD_FALLBACK : DEV_FALLBACK),
];

const resolvedUrl = normalizeUrl(
  candidateUrls.find((value) => typeof value === "string" && value.trim().length > 0) ??
    (isStaging ? STAGING_FALLBACK : (isProduction ? PROD_FALLBACK : DEV_FALLBACK)),
);

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = resolvedUrl;
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = resolvedUrl;
}

export const APP_URL = resolvedUrl;
export const IS_PRODUCTION = isProduction;
export const IS_STAGING = isStaging;
