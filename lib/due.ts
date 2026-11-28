// Payment terms shown on the service invoice.
export const DUE_DAYS = 10;

// Due date = date issued + DUE_DAYS.
export function dueDate(issued: Date | string): Date {
  const d = new Date(issued);
  d.setDate(d.getDate() + DUE_DAYS);
  return d;
}

export const formatDate = (d: Date) => d.toLocaleDateString("en-PH", { dateStyle: "long" });
