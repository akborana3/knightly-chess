import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();

  // HARDCODED API KEY AND USER ID -- For testing only!
  const API_URL = "https://api.appzone.tech/v1/chat/completions";
  const API_KEY = "az-chatai-key";
  const USER_ID = "$RCAnonymousID:244d823996e54fa5ae6150981da30ba9";

  // Logging incoming request
  console.log("Incoming chess-move-suggestion request:", JSON.stringify(body));

  const payload = {
    model: "gpt-4.1-mini",
    stream: false,
    messages: body.messages,
    isSubscribed: false,
    web_search: false,
    reason: false
  };

  // Logging outgoing payload
  console.log("Outgoing payload to AppZone API:", JSON.stringify(payload));

  let apiResponse, apiData, apiText = "";

  try {
    apiResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        'Content-Type': "application/json",
        'Authorization': `Bearer ${API_KEY}`,
        'x-user-id': USER_ID
      },
      body: JSON.stringify(payload),
    });
  } catch (fetchErr) {
    console.error("Fetch error:", fetchErr);
    return NextResponse.json({ error: "Failed to call AppZone API", details: String(fetchErr) }, { status: 500 });
  }

  if (!apiResponse.ok) {
    // Log error response
    const errorText = await apiResponse.text();
    console.error("AppZone API error:", apiResponse.status, errorText);
    return NextResponse.json({ error: "API Error", status: apiResponse.status, details: errorText }, { status: apiResponse.status });
  }

  try {
    apiData = await apiResponse.json();
  } catch (jsonErr) {
    console.error("JSON parse error:", jsonErr);
    return NextResponse.json({ error: "Failed to parse AppZone response", details: String(jsonErr) }, { status: 500 });
  }

  // Log response data
  console.log("AppZone API response:", JSON.stringify(apiData));

  // Parse suggestion text from response
  if (apiData.choices) {
    for (const choice of apiData.choices) {
      apiText += choice.message?.content ?? choice.delta?.content ?? "";
    }
  }

  if (!apiText) {
    console.warn("No suggestion text found in AppZone response.");
    apiText = "Sorry, no suggestion generated.";
  }

  return NextResponse.json({ suggestion: apiText });
}
