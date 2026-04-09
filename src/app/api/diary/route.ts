import { NextRequest, NextResponse } from 'next/server';
import { generateDiary } from '@/lib/diary/generator';
import { apiGuard } from '@/lib/security/api-guard';

export async function POST(req: NextRequest) {
  const blocked = apiGuard(req, { maxRequests: 30 });
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const { messages }: { messages: { role: string; content: string }[] } = body;

    const diary = await generateDiary(messages || []);

    return NextResponse.json({ diary });
  } catch (error) {
    console.error('Diary API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate diary' },
      { status: 500 },
    );
  }
}
