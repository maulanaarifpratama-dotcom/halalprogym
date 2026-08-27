import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Gabung className bersyarat lalu selesaikan konflik utility Tailwind
 * (yang belakangan menang). Dipakai setiap komponen shadcn/ui.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
