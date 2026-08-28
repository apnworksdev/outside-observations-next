import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import { WRITING_ARTICLE_QUERY } from '@/sanity/lib/queries';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    const article = await client.fetch(WRITING_ARTICLE_QUERY, { slug });
    if (!article) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error('Failed to fetch writing article:', error);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}
