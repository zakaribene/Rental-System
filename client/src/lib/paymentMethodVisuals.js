import { Smartphone, Landmark, Coins, Banknote, Wallet } from 'lucide-react'

const METHOD_VISUALS = [
  { match: /evc/i, icon: Smartphone, bg: 'bg-green-50 dark:bg-green-500/15', text: 'text-green-600 dark:text-green-300', ring: 'ring-green-100 dark:ring-green-500/20' },
  { match: /premier/i, icon: Landmark, bg: 'bg-sky-50 dark:bg-sky-500/15', text: 'text-sky-600 dark:text-sky-300', ring: 'ring-sky-100 dark:ring-sky-500/20' },
  { match: /dahab|zaad/i, icon: Coins, bg: 'bg-amber-50 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-300', ring: 'ring-amber-100 dark:ring-amber-500/20' },
  { match: /cash/i, icon: Banknote, bg: 'bg-emerald-50 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-300', ring: 'ring-emerald-100 dark:ring-emerald-500/20' },
]
const DEFAULT_METHOD_VISUAL = { icon: Wallet, bg: 'bg-primary-50 dark:bg-primary-500/15', text: 'text-primary-600 dark:text-primary-300', ring: 'ring-primary-100 dark:ring-primary-500/20' }

export function getMethodVisual(name = '') {
  return METHOD_VISUALS.find((v) => v.match.test(name)) || DEFAULT_METHOD_VISUAL
}
