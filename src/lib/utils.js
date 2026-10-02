import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Standard shadcn/ui class combiner: later Tailwind utilities win. */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}