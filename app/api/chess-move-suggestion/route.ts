import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const API_URL = "https://api.appzone.tech/v1/chat/completions";
  const API_KEY = process.env.APPZONE_API_KEY;
  const USER_ID = process.env.APPZONE_USER_ID;

  const payload = {
    model: "gpt-4.1-mini",
    stream: false,
    messages: body.messages,
    isSubscribed: false,
    web_search: false,
    reason: false
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      'Content-Type': "application/json",
      'Authorization': `Bearer ${API_KEY}`,
      'x-user-id': USER_ID || "$RCAnonymousID:244d823996e54fa5ae6150981da30ba9"
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "API Error", status: response.status }, { status: response.status });
  }

  const data = await response.json();

  // The API returns choices[].delta.content (possibly in streaming chunks, but we use stream: false)
  let fullContent = "";
  if (data.choices) {
    for (const choice of data.choices) {
      // If streaming, would be choice.delta.content, but for non-stream: choice.message.content
      fullContent += choice.message?.content ?? choice.delta?.content ?? "";
    }
  }

  return NextResponse.json({ suggestion: fullContent });
}
