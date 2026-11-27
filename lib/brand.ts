// Your business details. Set these in .env.local (and in Vercel env vars).
export const brand = {
  name: process.env.BUSINESS_NAME || "Payment Gateway for All",
  email: process.env.BUSINESS_EMAIL || "",
  address: process.env.BUSINESS_ADDRESS || "", // e.g. "123 Street, City, Country"
  url: process.env.APP_URL || "https://payment-gateway-for-all.vercel.app",
};
