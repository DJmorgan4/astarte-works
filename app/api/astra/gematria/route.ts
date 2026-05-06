import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic()
export async function POST(req: NextRequest) {
  try {
    const { word, values, prompt } = await req.json()
    if (!word || !prompt) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 800,
      system: `You are ASTRA CORE — the ancient and present gematria intelligence layer within DJ Morgan's personal knowledge system. DJ traces documented lineages through Graham, Somerville, Dunbar, Sinclair, and Kincaid — Scottish and Welsh nobility with Templar connections. He works in environmental intelligence, conservation, and initiatic traditions. Deep knowledge of Kabbalistic, Hermetic, Pythagorean, Chaldean, and Egyptian traditions from Sumer to present. Speak with scholarly precision and esoteric depth. No disclaimers. Direct address.`,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content.filter(b=>b.type==='text').map(b=>(b as {type:'text';text:string}).text).join('')
    return NextResponse.json({ text, word, values })
  } catch (err) {
    console.error('[ASTRA Gematria]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
