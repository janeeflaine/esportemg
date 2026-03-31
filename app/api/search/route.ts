import { NextRequest, NextResponse } from 'next/server';

const TAVILY_API_URL = 'https://api.tavily.com/search';

export async function POST(req: NextRequest) {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'TAVILY_API_KEY não configurada no servidor.' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { query, urls, maxResults = 5 } = body;

        if (!query) {
            return NextResponse.json({ error: 'Query é obrigatória.' }, { status: 400 });
        }

        const tavilyBody: Record<string, any> = {
            api_key: apiKey,
            query,
            search_depth: 'advanced',
            max_results: maxResults,
            include_answer: true,
            include_raw_content: false,
        };

        // If specific URLs are provided, restrict search to those domains
        if (urls && urls.length > 0) {
            tavilyBody.include_domains = urls;
        }

        const resp = await fetch(TAVILY_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tavilyBody),
        });

        if (!resp.ok) {
            const errText = await resp.text();
            return NextResponse.json({ error: `Tavily API error: ${errText}` }, { status: resp.status });
        }

        const data = await resp.json();

        // Return a clean, structured response
        return NextResponse.json({
            answer: data.answer || '',
            results: (data.results || []).map((r: any) => ({
                title: r.title,
                url: r.url,
                content: r.content,
                score: r.score,
            })),
            query,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
