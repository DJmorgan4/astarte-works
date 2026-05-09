import { headers } from 'next/headers'
import MissionControlPage from './MissionControlClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Page() {
  await headers() // forces dynamic
  return <MissionControlPage />
}
