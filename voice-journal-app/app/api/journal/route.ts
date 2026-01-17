import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getJournalEntriesByUser } from '@/lib/dynamodb';

// GET /api/journal - Get user's journal entries
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const cursor = searchParams.get('cursor');

    // Parse cursor if provided (base64 encoded lastKey)
    let lastKey: Record<string, unknown> | undefined;
    if (cursor) {
      try {
        lastKey = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      } catch {
        return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
      }
    }

    const { entries, nextKey } = await getJournalEntriesByUser(userId, limit, lastKey);

    // Encode next cursor
    const nextCursor = nextKey
      ? Buffer.from(JSON.stringify(nextKey)).toString('base64')
      : undefined;

    return NextResponse.json({
      entries,
      nextCursor,
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journal entries' },
      { status: 500 }
    );
  }
}
