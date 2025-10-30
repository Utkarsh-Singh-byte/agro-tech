import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Message {
  role: string;
  content: string;
  imageUrl?: string;
}

interface RequestPayload {
  messages: Message[];
  geminiApiKey: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { messages, geminiApiKey }: RequestPayload = await req.json();

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const lastMessage = messages[messages.length - 1];
    const hasImage = lastMessage?.imageUrl;

    const systemPrompt = `You are an expert agricultural assistant specialized in crop health, pest management, and farming practices. Your role is to:
1. Analyze crop images for defects, diseases, pests, and health issues
2. Provide detailed, actionable solutions for identified problems
3. Answer any agriculture-related questions from farmers
4. Give personalized recommendations based on the specific crop and conditions
5. Use simple, clear language that farmers can understand
6. Always be supportive and encouraging

When analyzing images, always provide:
- Identification of the crop and its current state
- Any visible issues (diseases, pests, nutrient deficiencies, etc.)
- Severity of the problems
- Recommended treatments and preventive measures
- Timeline for action`;

    const contextMessages = messages.slice(-5);

    let geminiMessages = [];
    
    if (hasImage) {
      const imageMessage = contextMessages[contextMessages.length - 1];
      const imageResponse = await fetch(imageMessage.imageUrl!);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
      
      const mimeType = imageMessage.imageUrl!.match(/\.(jpg|jpeg|png|gif|webp)$/i)?.[1] || 'jpeg';
      const fullMimeType = `image/${mimeType === 'jpg' ? 'jpeg' : mimeType}`;

      geminiMessages = [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            { text: imageMessage.content },
            {
              inlineData: {
                mimeType: fullMimeType,
                data: imageBase64
              }
            }
          ]
        }
      ];
    } else {
      geminiMessages = [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        },
        ...contextMessages.map(msg => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        }))
      ];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to get response from Gemini", details: errorData }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in chat-with-gemini function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});