import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Reverse proxy Firebase Authentication requests to bypass CORS and third-party cookie blocks on custom domains
app.use(
  "/__/auth",
  createProxyMiddleware({
    target: "https://lab18-net.firebaseapp.com",
    changeOrigin: true,
    pathRewrite: (path, req) => {
      return "/__/auth" + path;
    }
  })
);

// Lazy initializer for Google Gen AI to prevent startup crash if API key is missing
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

// 1. API: Check if AI API is available
app.get("/api/ai/status", (req, res) => {
  const isAvailable = !!getAi();
  res.json({ available: isAvailable });
});

// 2. API: Generate personalized kids story with vocabulary for writing templates
app.post("/api/generate-story", async (req, res) => {
  const { theme, kidName, kidAge, pagesCount = 3 } = req.body;

  if (!theme) {
    return res.status(400).json({ error: "Please provide a theme or outline for the kid's story." });
  }

  const ai = getAi();
  if (!ai) {
    // Elegant fallback dataset of stories if API key is missing
    return res.json({
      success: true,
      fallback: true,
      bookTitle: `${theme.substring(0, 15)} on Adventure`,
      pages: [
        {
          id: "fb-1",
          pageTitle: "Behold, the Journey Begins!",
          storyText: `Once upon a time, a young hero named ${kidName || "Buddy"} (age ${kidAge || 5}) stepped into a magical forest with giant friendly mushrooms. They were looking for the mystical glowing treasure!`,
          tradingWord: "ADVENTURE",
          suggestedColoringPrompt: "Cottage amongst cute happy mushrooms, simple line-art cartoon"
        },
        {
          id: "fb-2",
          pageTitle: "Surprise in the Glade",
          storyText: `As they strolled, they met a chubby pink fairy named Pippin who liked to eat blueberries. Pippin laughed and said, 'The treasure lies under the rainbow stone!'`,
          tradingWord: "FRIEND",
          suggestedColoringPrompt: "Cute simple fairy sitting on the grass under a bright sun, coloring outline"
        },
        {
          id: "fb-3",
          pageTitle: "Finding the Prize!",
          storyText: `Finally, ${kidName || "Buddy"} reached the rainbow stone, solved the riddle, and found a magic golden key that could unlock any door in the kingdom! It was the best adventure ever.`,
          tradingWord: "MAGIC",
          suggestedColoringPrompt: "Delightful old chest with a shining key, large outline sections suitable for children"
        }
      ]
    });
  }

  try {
    const kidDetails = kidName ? `The protagonist is named ${kidName} (an enthusiastic ${kidAge || 5}-year-old).` : "";
    
    const prompt = `Write a delightful, gentle children's book story. 
Theme/Prompt: "${theme}". 
Number of pages requested: ${pagesCount}. 
${kidDetails}
Structure the story into sequential pages. Keep the language extremely child-friendly, engaging, and simple.
For EACH page, provide:
1. A unique, magical page header.
2. Short, simple story paragraph (2-4 sentences max), perfect for reading together.
3. ONE key vocabulary word from the story (3-10 characters) that the child can practice tracing. Must be letters-only.
4. A highly visual scene description layout for a coloring page template.

Output must be in JSON matching this schema.`;

    const config = {
      systemInstruction: "You are an expert children's book author, illustrator director, and elementary school reading teacher. You create magical, engaging stories where vocabulary maps perfectly to writing tracing templates.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["bookTitle", "pages"],
        properties: {
          bookTitle: {
            type: Type.STRING,
            description: "A funny, catchy, magical title for this kid's fairytale book."
          },
          pages: {
            type: Type.ARRAY,
            description: "The list of story book pages in sequence.",
            items: {
              type: Type.OBJECT,
              required: ["pageTitle", "storyText", "tradingWord", "suggestedColoringPrompt"],
              properties: {
                pageTitle: {
                  type: Type.STRING,
                  description: "Title or event of the scene."
                },
                storyText: {
                  type: Type.STRING,
                  description: "A cute story narrative block, easy vocabulary, engaging."
                },
                tradingWord: {
                  type: Type.STRING,
                  description: "A perfect learning keyword from this scene for tracing, capitalized, e.g. APPLE, FOREST, DRAGON."
                },
                suggestedColoringPrompt: {
                  type: Type.STRING,
                  description: "Simple cartoon vector outlines scene description, e.g., 'Happy cartoon bear holding a red umbrella in rain, bold contours'."
                }
              }
            }
          }
        }
      }
    };

    let response: any = null;
    let lastError: any = null;
    const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];

    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[AI-Studio] Generating story using model ${model} (attempt ${attempt}/2)`);
          const resp = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: config
          });
          if (resp && resp.text) {
            response = resp;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[AI-Studio] Attempt ${attempt} with model ${model} failed:`, err.message || err);
          if (attempt < 2) {
            // Wait 1200ms before retrying the same model
            await new Promise(resolve => setTimeout(resolve, 1200));
          }
        }
      }
      if (response) break;
    }

    if (!response) {
      throw lastError || new Error("Failed to generate content with all available Gemini models.");
    }

    const storyResult = JSON.parse(response.text?.trim() || "{}");
    res.json({
      success: true,
      fallback: false,
      bookTitle: storyResult.bookTitle,
      pages: storyResult.pages
    });

  } catch (error: any) {
    console.error("Gemini Story Generation Error:", error);
    let errorMessage = error.message || String(error);
    if (typeof errorMessage === "string" && errorMessage.includes('"message":')) {
      try {
        const jsonStart = errorMessage.indexOf('{');
        if (jsonStart !== -1) {
          const parsed = JSON.parse(errorMessage.substring(jsonStart));
          if (parsed?.error?.message) {
            errorMessage = `${parsed.error.message} (Status: ${parsed.error.status || 'UNAVAILABLE'})`;
          }
        }
      } catch (e) {
        // use original string representation
      }
    }
    res.status(500).json({ error: `Gemini Story Generation Error: ${errorMessage}` });
  }
});

// Configure Vite middleware / Serve index.html
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve index.html on all other client routes (SPA)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Parent-Kid Book Factory online at http://0.0.0.0:${PORT}`);
  });
}

startServer();
