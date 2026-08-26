import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class names. Safe on both server and client. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
