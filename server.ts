import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";
import fs from "fs";
import Stripe from "stripe";
import { initializeApp, cert, getApp, getApps, App } from "firebase-admin/app";
import { getFirestore, FieldValue, Firestore } from "firebase-admin/firestore";

dotenv.config();

const app = express();
const PORT = 3000;

// Conditional JSON parsing to preserve raw body for Stripe webhook signature verification
app.use((req, res, next) => {
  if (req.originalUrl === "/api/stripe/webhook") {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});

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

// ==========================================
// STRIPE & FIREBASE ADMIN SUBSCRIPTION SUITE
// ==========================================

// Lazy initializer for Stripe
let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key && key !== "MY_STRIPE_SECRET_KEY") {
      stripeClient = new Stripe(key, {
        apiVersion: "2023-10-16" as any,
      });
      console.log("[Stripe] Successfully initialized Stripe Client.");
    }
  }
  return stripeClient;
}

// Lazy initializer for Firebase Admin App
let firebaseAdminApp: App | null = null;
function getFirebaseAdmin(): App | null {
  if (!firebaseAdminApp) {
    try {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountJson) {
        try {
          const credentials = JSON.parse(serviceAccountJson);
          firebaseAdminApp = initializeApp({
            credential: cert(credentials)
          }, "admin-app");
          console.log("[Firebase Admin] Initialized with Service Account.");
        } catch (e) {
          console.error("[Firebase Admin] Failed parsing Service Account Key JSON:", e);
        }
      }

      if (!firebaseAdminApp) {
        const apps = getApps();
        if (apps.length === 0) {
          firebaseAdminApp = initializeApp();
          console.log("[Firebase Admin] Initialized using Default Credentials.");
        } else {
          firebaseAdminApp = apps[0]!;
        }
      }
    } catch (e) {
      console.error("[Firebase Admin] Initialization failure:", e);
    }
  }
  return firebaseAdminApp;
}

// Lazy Firestore Admin client initialization to query custom named databases
let firestoreAdminInstance: Firestore | null = null;
function getFirestoreAdmin(): Firestore | null {
  if (!firestoreAdminInstance) {
    const adminApp = getFirebaseAdmin();
    if (!adminApp) return null;

    try {
      const fsConfig = JSON.parse(fs.readFileSync(path.resolve("./firebase-applet-config.json"), "utf-8"));
      const dbId = fsConfig.firestoreDatabaseId;

      firestoreAdminInstance = getFirestore(adminApp, dbId);
      console.log(`[Firebase Admin] Firestore Client initialized targeting named database: ${dbId}`);
    } catch (e) {
      console.warn("[Firebase Admin] Falling back to default getFirestore(). Error details:", e);
      firestoreAdminInstance = getFirestore(adminApp);
    }
  }
  return firestoreAdminInstance;
}

// Helper: Securely update premium status in Firestore
async function updatePremiumStatus(uid: string, customData: {
  subscriptionStatus: "premium" | "free";
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  subscriptionExpiresAt?: string | null;
  manuallyUpgraded?: boolean;
}) {
  const dbAdmin = getFirestoreAdmin();
  if (!dbAdmin) {
    throw new Error("Unable to initialize admin Firestore client");
  }

  try {
    const docRef = dbAdmin.collection("users").doc(uid);
    await docRef.set({
      ...customData,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`[Firebase Admin] Synced billing profiles for users/${uid} to: ${customData.subscriptionStatus}`);
  } catch (err) {
    console.error(`[Firebase Admin] Failed writing billing data for users/${uid}:`, err);
    throw err;
  }
}

// Helper: Query user profile by Stripe subscription ID
async function getUserByStripeSubscription(subscriptionId: string) {
  const dbAdmin = getFirestoreAdmin();
  if (!dbAdmin) return null;

  try {
    const snap = await dbAdmin.collection("users")
      .where("stripeSubscriptionId", "==", subscriptionId)
      .limit(1)
      .get();

    if (snap.empty) return null;
    return snap.docs[0];
  } catch (err) {
    console.error(`[Firebase Admin] Query user by stripe subscription (${subscriptionId}) failed:`, err);
    return null;
  }
}

// API: Check Stripe Status
app.get("/api/stripe/status", (req, res) => {
  const isAvailable = !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "MY_STRIPE_SECRET_KEY";
  res.json({
    available: isAvailable,
    priceId: process.env.STRIPE_PRICE_ID || "not_configured"
  });
});

// API: Create Stripe subscription checkout session
app.post("/api/stripe/create-checkout-session", async (req, res) => {
  const { uid, email, returnUrl } = req.body;
  if (!uid || !email) {
    return res.status(400).json({ error: "Missing required params: uid, email" });
  }

  const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "MY_STRIPE_SECRET_KEY";
  if (!isStripeConfigured) {
    console.log("[Stripe] Stripe is offline/unconfigured. Activating Sandbox Checkout flow.");
    return res.json({
      sandbox: true,
      url: `/checkout-sandbox?uid=${encodeURIComponent(uid)}&email=${encodeURIComponent(email)}&returnUrl=${encodeURIComponent(returnUrl || "")}`
    });
  }

  try {
    const stripe = getStripe();
    if (!stripe) {
      throw new Error("Stripe engine failed to load");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID || undefined,
          price_data: process.env.STRIPE_PRICE_ID ? undefined : {
            currency: "usd",
            product_data: {
              name: "StoryCraft Pro Monthly Access",
              description: "Unlimited cloud books, full community library sharing & AI books generation.",
            },
            unit_amount: 999, // $9.99
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${returnUrl || "https://storycraft.lab18.net"}?checkout_status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl || "https://storycraft.lab18.net"}?checkout_status=cancel`,
      customer_email: email,
      client_reference_id: uid,
      metadata: {
        userId: uid,
      },
    });

    res.json({ url: session.url, sandbox: false });
  } catch (error: any) {
    console.error("Failed to compile Stripe session:", error);
    res.status(500).json({ error: error.message || "Failed to compile checkout session" });
  }
});

// API: Stripe Webhook handler
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret && sig) {
      const stripe = getStripe();
      if (stripe) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        event = JSON.parse(req.body.toString());
      }
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err: any) {
    console.error("Stripe Webhook parsing or validation failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Stripe Webhook] Received subscription event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const uid = session.client_reference_id || session.metadata?.userId;
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        if (uid) {
          const thirtyDays = new Date();
          thirtyDays.setDate(thirtyDays.getDate() + 30);

          await updatePremiumStatus(uid, {
            subscriptionStatus: "premium",
            stripeSubscriptionId: typeof subscriptionId === "string" ? subscriptionId : null,
            stripeCustomerId: typeof customerId === "string" ? customerId : null,
            subscriptionExpiresAt: thirtyDays.toISOString(),
            manuallyUpgraded: false // Securely overrides manual flag for actual stripe buyers
          });
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (typeof subscriptionId === "string") {
          const userDoc = await getUserByStripeSubscription(subscriptionId);
          if (userDoc) {
            const userData = userDoc.data();
            // Respect user intent: ignore manually upgraded users
            if (userData?.manuallyUpgraded === true) {
              console.log("[Stripe Webhook] Bypassing renewal cycle for manually upgraded user:", userDoc.id);
              break;
            }

            const thirtyDays = new Date();
            thirtyDays.setDate(thirtyDays.getDate() + 30);

            await updatePremiumStatus(userDoc.id, {
              subscriptionStatus: "premium",
              subscriptionExpiresAt: thirtyDays.toISOString(),
            });
          }
        }
        break;
      }
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const subId = sub.id;
        const status = sub.status;

        const userDoc = await getUserByStripeSubscription(subId);
        if (userDoc) {
          const userData = userDoc.data();
          // Respect user intent: ignore manually upgraded users
          if (userData?.manuallyUpgraded === true) {
            console.log("[Stripe Webhook] Bypassing cancellation logic for manually upgraded user:", userDoc.id);
            break;
          }

          if (status === "active") {
            const currentPeriodEnd = new Date(sub.current_period_end * 1000);
            await updatePremiumStatus(userDoc.id, {
              subscriptionStatus: "premium",
              subscriptionExpiresAt: currentPeriodEnd.toISOString(),
            });
          } else if (status === "canceled" || status === "unpaid") {
            // Cancel subscription
            await updatePremiumStatus(userDoc.id, {
              subscriptionStatus: "free",
              stripeSubscriptionId: null,
              subscriptionExpiresAt: null,
            });
          }
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (error: any) {
    console.error("Express webhook parsing error:", error);
    res.status(500).json({ error: "Webhook parsing error" });
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
