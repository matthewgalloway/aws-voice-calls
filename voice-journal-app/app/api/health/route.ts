import { NextResponse } from 'next/server'

export async function GET() {
  console.log('Health check received at:', new Date().toISOString())
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
}
