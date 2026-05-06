import type { Metadata } from 'next'
import GematriaEngine from '@/components/knowledge/GematriaEngine'
export const metadata: Metadata = {
  title: 'Gematria · ASTRA Knowledge | Astarte Works',
  description: 'Six-tradition gematria engine — Hebrew, Greek, Chaldean, Latin, English Ordinal, Pythagorean.',
}
export default function GematriaPage() {
  return <GematriaEngine />
}
