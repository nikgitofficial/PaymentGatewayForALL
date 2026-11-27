// EDIT THIS FILE: the services you bill, with your real prices (in PESOS)
// and your real tax settings. The invoice total = sum of lines + tax.

// Tax: label shown on the invoice, and rate in percent. Set TAX_RATE to 0 for no tax.
// Only charge tax if you are registered to and required to (e.g. VAT, or US sales tax
// where it applies to you). Use your actual rate.
export const TAX_LABEL = "VAT";
export const TAX_RATE = 12;

// "details" are optional extra lines shown under each item (usage, plan, specs...).
// The figures below are EXAMPLES. Replace each with what is TRUE for your customer's
// service (or delete lines that don't apply). Customers pay for what's written here.
export const INVOICE_LINES: {
  name: string;
  description: string;
  pricePHP: number;
  details?: string[];
}[] = [
  {
    name: "Database hosting",
    description: "Managed database service",
    pricePHP: 100,
    details: [
      "Engine: PostgreSQL (managed)",
      "CPU usage: 2 vCPU",
      "Memory: 4 GB RAM",
      "Storage: 10 GB SSD",
      "Backups: daily, 7-day retention",
      "Connections: up to 100 concurrent",
      "Region: Singapore",
      "Monitoring and support included",
    ],
  },
  {
    name: "AI coding tools",
    description: "AI-assisted development tools access",
    pricePHP: 100,
    details: [
      "Plan: monthly subscription",
      "Seats: 1 developer",
      "Includes: code generation, review and debugging assistance",
      "Billing period: 1 month",
    ],
  },
  {
    name: "Server hosting",
    description: "Cloud server hosting",
    pricePHP: 100,
    details: [
      "CPU: 2 vCPU",
      "Memory: 4 GB RAM",
      "Storage: 80 GB SSD",
      "Bandwidth: 1 TB / month",
      "OS: Linux (Ubuntu)",
      "Backups: weekly snapshot",
      "Region: Singapore",
    ],
  },
  {
    name: "Mobile app hosting",
    description: "Mobile backend and app hosting",
    pricePHP: 100,
    details: [
      "Backend instances: 1",
      "Push notifications: included",
      "File storage: 20 GB",
      "Authentication and user management",
      "SSL certificate included",
      "Environments: production + staging",
    ],
  },
  {
    name: "API services",
    description: "API access and usage",
    pricePHP: 100,
    details: [
      "Requests: up to 1,000,000 / month",
      "Rate limit: 60 requests / minute",
      "API keys: up to 5",
      "Usage dashboard and logs",
      "Support: email, business hours",
    ],
  },
];
