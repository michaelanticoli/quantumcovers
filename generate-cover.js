// api/generate-cover.js
export default async function handler(req, res) {
  // CORS (so your browser app can call this)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Read JSON body safely (works in Vercel functions)
  let raw = "";
  try { for await (const chunk of req) raw += chunk; } catch {}
  let data = {};
  try { data = JSON.parse(raw || "{}"); } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const prompt = data.prompt;
  const title = data.title || "Lunar Workbook";
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  // 2:3 vertical image
  const size = "1024x1536";
  const fullPrompt = `${prompt}
Typeface: elegant, minimalist. Layout: book cover, centered title: "${title}".`;

  try {
    // OpenAI Images (no SDK; just fetch)
    const upstream = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: fullPrompt,
        size
      })
    });

    const json = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Upstream error", details: json });
    }

    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) return res.status(502).json({ error: "No image returned" });

    // Return a data URL so your app can draw it directly
    const imageUrl = `data:image/png;base64,${b64}`;
    return res.status(200).json({ imageUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", details: String(err) });
  }
}
