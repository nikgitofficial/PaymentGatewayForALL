// Business details a customer gives on /register. Stored on the leads row.
export type CustomerInfo = {
  business_name?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  tin?: string | null;
};

// Address as printable lines, e.g. ["70-26 137th St", "Flushing, NY 11367", "United States"].
export function addressLines(c: CustomerInfo): string[] {
  const region = [c.state, c.postal_code].filter(Boolean).join(" ");
  const cityLine = [c.city, region].filter(Boolean).join(", ");
  return [c.address_line, cityLine, c.country].filter((x): x is string => !!x && x.trim().length > 0);
}

export const COUNTRIES = [
  "Philippines",
  "United States",
  "Singapore",
  "Hong Kong",
  "Japan",
  "South Korea",
  "Malaysia",
  "Indonesia",
  "Thailand",
  "Vietnam",
  "India",
  "Australia",
  "New Zealand",
  "Canada",
  "United Kingdom",
  "Germany",
  "France",
  "Netherlands",
  "United Arab Emirates",
  "Saudi Arabia",
  "Other",
] as const;
