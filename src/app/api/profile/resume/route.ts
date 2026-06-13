import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }

    const { resume_text } = body;
    if (!resume_text) {
      return NextResponse.json({ message: 'Resume text is required' }, { status: 400 });
    }

    const sanitized = resume_text.trim();
    if (sanitized.length < 50) {
      return NextResponse.json({ message: 'Resume text must be at least 50 characters' }, { status: 400 });
    }

    let embedding: number[] = [];

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== 'test-key' && !apiKey.startsWith('mock')) {
      // Real API call to OpenAI embeddings
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: sanitized,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI Embeddings API request failed: ${response.statusText}`);
      }

      const resBody = await response.json();
      embedding = resBody.data?.[0]?.embedding || [];
    } else {
      // Mock Fallback for local development or testing when key is missing or is test/mock
      embedding = new Array(1536).fill(0).map((_, i) => {
        let val = 0.05;
        if (sanitized.toLowerCase().includes('systems') && i % 10 === 0) val += 0.05;
        if (sanitized.toLowerCase().includes('typescript') && i % 15 === 0) val += 0.05;
        if (sanitized.toLowerCase().includes('next.js') && i % 20 === 0) val += 0.05;
        return val;
      });
    }

    if (embedding.length === 0) {
      throw new Error('Failed to generate embedding vector.');
    }

    // Upsert the profile text and embedding in the candidate_profile table
    const pgVectorStr = `[${embedding.join(',')}]`;
    const { error: upsertError } = await supabase
      .from('candidate_profile')
      .upsert({
        user_id: user.id,
        resume_text: sanitized,
        embedding: pgVectorStr,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      return NextResponse.json({ message: `Failed to update user profile table: ${upsertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in POST /api/profile/resume:', err);
    return NextResponse.json({ message: err.message || 'Internal server error.' }, { status: 500 });
  }
}
