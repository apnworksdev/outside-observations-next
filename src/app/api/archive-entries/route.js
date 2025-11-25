import { NextResponse } from 'next/server';
import { getArchiveEntries } from '@/app/_data/archive';

// Enable ISR - revalidate every 60 seconds (same as the data source)
export const revalidate = 60;

export async function GET() {
  try {
    const entries = await getArchiveEntries();
    return NextResponse.json(entries);
  } catch (error) {
    console.error('Failed to fetch archive entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch archive entries' },
      { status: 500 }
    );
  }
}

