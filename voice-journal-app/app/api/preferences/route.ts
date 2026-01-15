import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserPreferences, saveUserPreferences } from '@/lib/dynamodb';
import type { SavePreferencesRequest } from '@/types';

// GET /api/preferences - Get current user's preferences
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await getUserPreferences(userId);

    if (!preferences) {
      return NextResponse.json({
        userId,
        phoneNumber: '',
        preferredCallTime: '',
        timezone: 'America/New_York',
        isActive: false,
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

// POST /api/preferences - Save user preferences
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SavePreferencesRequest = await request.json();

    // Validate phone number (basic E.164 format check)
    if (body.phoneNumber && !/^\+[1-9]\d{1,14}$/.test(body.phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use E.164 format (e.g., +15551234567)' },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    if (body.preferredCallTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.preferredCallTime)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM (24-hour format)' },
        { status: 400 }
      );
    }

    const preferences = await saveUserPreferences(userId, {
      phoneNumber: body.phoneNumber,
      preferredCallTime: body.preferredCallTime,
      timezone: body.timezone,
      isActive: true,
    });

    // TODO: Trigger scheduler-manager Lambda to update EventBridge schedule
    // This will be implemented when we add the Lambda integration

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    );
  }
}
