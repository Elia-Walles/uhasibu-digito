import { format, formatDistanceToNow, differenceInDays, parseISO } from "date-fns";

export const formatDate     = (date: string) => format(parseISO(date), "dd/MM/yyyy");
export const formatDateLong = (date: string) => format(parseISO(date), "dd MMMM yyyy");
export const formatDateTime = (date: string) => format(parseISO(date), "dd/MM/yyyy HH:mm");
export const fromNow        = (date: string) => formatDistanceToNow(parseISO(date), { addSuffix: true });
export const daysUntil      = (date: string) => differenceInDays(parseISO(date), new Date());
export const daysOverdue    = (date: string) => Math.abs(differenceInDays(parseISO(date), new Date()));
export const currentMonthYear = () => format(new Date(), "MMMM yyyy");
export const isOverdue      = (dueDate: string) => differenceInDays(parseISO(dueDate), new Date()) < 0;

export const monthNameShort = (month: number) =>
  ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month - 1] ?? "";
