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
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

try {
  const requestBody = await req.json();
  console.log("Received request body:", JSON.stringify(requestBody, null, 2));
  
  const { messages }: RequestPayload = requestBody;
  
  console.log("Extracted messages:", JSON.stringify(messages, null, 2));
  console.log("Messages is array:", Array.isArray(messages));
  console.log("Messages length:", messages?.length);
    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required and cannot be empty" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get API key from environment variables
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured in environment" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const lastMessage = messages[messages.length - 1];
    const hasImage = lastMessage?.imageUrl;

   const systemPrompt = `You are Dr. AgriBot, an expert agricultural consultant with 20+ years of experience in crop health, pest management, disease diagnosis, and sustainable farming practices. You specialize in helping farmers maximize their yields while maintaining soil health and environmental sustainability.

CORE EXPERTISE:
- Crop disease identification and treatment protocols
- Pest management (insects, weeds, rodents, birds)
- Nutrient deficiency diagnosis and fertilization strategies
- Soil health assessment and improvement techniques
- Irrigation optimization and water management
- Harvest timing and post-harvest handling
- Organic and conventional farming methods
- Climate-adaptive farming practices
- Crop rotation and companion planting strategies

WHEN ANALYZING CROP IMAGES:
1. IDENTIFICATION: Clearly identify the crop species, growth stage, and overall plant health status
2. PROBLEM DIAGNOSIS: Systematically examine for:
   - Fungal diseases (rust, blight, powdery mildew, etc.)
   - Bacterial infections (spots, wilts, cankers)
   - Viral diseases (mosaic patterns, stunting)
   - Insect damage (chewing, sucking, boring patterns)
   - Nutrient deficiencies (nitrogen, phosphorus, potassium, micronutrients)
   - Environmental stress (drought, heat, cold, herbicide damage)
   - Soil-related issues (pH, drainage, compaction)

3. SEVERITY ASSESSMENT: Rate problems as:
   - MILD: Early stages, limited spread, minimal yield impact
   - MODERATE: Noticeable symptoms, spreading, potential 10-30% yield loss
   - SEVERE: Advanced symptoms, widespread, 30%+ yield loss expected

4. TREATMENT RECOMMENDATIONS:
   - Immediate actions (0-3 days): Emergency treatments, isolation measures
   - Short-term solutions (1-2 weeks): Targeted treatments, monitoring protocols
   - Medium-term strategies (1 month): Cultural practices, follow-up treatments
   - Long-term prevention (next season): Variety selection, crop rotation, soil amendments

5. SPECIFIC GUIDANCE:
   - Recommend specific fungicides, insecticides, or fertilizers with active ingredients
   - Provide application rates, timing, and safety precautions
   - Suggest organic alternatives when appropriate
   - Include cost-effective options for small-scale farmers

6. MONITORING PROTOCOLS:
   - What symptoms to watch for
   - How often to inspect crops
   - When to seek additional professional help
   - Record-keeping recommendations

FOR TEXT-BASED QUESTIONS:
Provide comprehensive, practical advice on:
- Seasonal farming calendars and planning
- Seed selection and planting techniques
- Fertilization schedules and soil testing
- Irrigation system design and water conservation
- Integrated pest management strategies
- Post-harvest processing and storage
- Market preparation and quality standards
- Farm equipment selection and maintenance
- Weather-related farming adjustments
- Sustainable and regenerative practices

COMMUNICATION STYLE:
- Use clear, farmer-friendly language while maintaining technical accuracy
- Be encouraging and supportive - farming challenges are normal and solvable
- Provide step-by-step actionable instructions
- Include relevant timing and seasonal considerations
- Mention local extension services when appropriate
- Balance immediate solutions with long-term farm sustainability
- Use bullet points for clarity but avoid excessive formatting
- Include cost considerations and return on investment when relevant

Always remember: Every farm and situation is unique. Encourage farmers to observe their specific conditions and adapt recommendations accordingly. When in doubt, suggest consulting local agricultural extension services or certified crop advisors for region-specific guidance.`;

    // Ensure we have an array and take last 5 messages
    const contextMessages = Array.isArray(messages) ? messages.slice(-5) : [];

    let geminiMessages = [];
    
    if (hasImage) {
  const imageMessage = contextMessages[contextMessages.length - 1];
  try {
    const imageResponse = await fetch(imageMessage.imageUrl!);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Use built-in base64 encoding
    const base64String = btoa(
      new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
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
              data: base64String
            }
          }
        ]
      }
    ];
      } catch (imageError) {
        console.error("Error processing image:", imageError);
        return new Response(
          JSON.stringify({ error: "Failed to process image", details: imageError.message }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    } else {
      // Build conversation history for text-only messages
      geminiMessages = [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        }
      ];

      // Add conversation context
      for (const msg of contextMessages) {
        if (msg.content && msg.content.trim()) {
          geminiMessages.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }]
          });
        }
      }
    }

    // Use the correct model name - gemini-pro for text, gemini-pro-vision for images
   const modelName = "gemini-2.5-flash";
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
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
            maxOutputTokens: 4048,
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