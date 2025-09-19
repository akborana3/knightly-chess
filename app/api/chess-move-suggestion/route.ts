import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();

  // HARDCODED API KEY AND USER ID
  const API_URL = "https://api.appzone.tech/v1/chat/completions";
  const API_KEY = "az-chatai-key";
  const USER_ID = "$RCAnonymousID:244d823996e54fa5ae6150981da30ba9";

  console.log("Incoming chess-move-suggestion request:", JSON.stringify(body));

  const payload = {
    model: "gpt-4.1-mini",
    stream: false, // You can turn this to true if you want streaming, but this code supports both.
    messages: body.messages,
    isSubscribed: false,
    web_search: false,
    reason: false
  };

  console.log("Outgoing payload to AppZone API:", JSON.stringify(payload));

  let apiResponse;
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
    const errorText = await apiResponse.text();
    console.error("AppZone API error:", apiResponse.status, errorText);
    return NextResponse.json({ error: "API Error", status: apiResponse.status, details: errorText }, { status: apiResponse.status });
  }

  // Try to parse the response as a stream (text, line by line)
  let suggestion = "";
  try {
    const raw = await apiResponse.text();

    // Log the raw response
    console.log("Raw AppZone API response:", raw.length > 200 ? raw.slice(0,200)+"..." : raw);

    // If response starts with 'data:', it's a streamed response.
    if (raw.startsWith('data:')) {
      const lines = raw.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonText = line.slice(6).trim();
          if (jsonText === "[DONE]") break;
          try {
            const json = JSON.parse(jsonText);
            if (json.choices) {
              for (const choice of json.choices) {
                suggestion += choice.delta?.content ?? choice.message?.content ?? "";
              }
            }
          } catch (jsonErr) {
            // Ignore individual line errors, but log them
            console.warn("JSON parse error in stream line:", jsonErr, line);
          }
        }
      }
    } else {
      // If not streamed, try normal JSON
      const json = JSON.parse(raw);
      if (json.choices) {
        for (const choice of json.choices) {
          suggestion += choice.message?.content ?? choice.delta?.content ?? "";
        }
      }
    }
  } catch (err) {
    console.error("Failed to parse AppZone response", err);
    return NextResponse.json({ error: "Failed to parse AppZone response", details: String(err) }, { status: 500 });
  }

  if (!suggestion) {
    console.warn("No suggestion text found in AppZone response.");
    suggestion = "Sorry, no suggestion generated.";
  }

  console.log("Final suggestion:", suggestion);

  return NextResponse.json({ suggestion });
}
