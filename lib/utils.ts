export const peso = (value: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(new Date(`${value}T00:00:00`));

export function makeToken(bytes = 24) {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < bytes; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function sanitizeFilename(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 100);
}