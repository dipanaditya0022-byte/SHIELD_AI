export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const endpoint = (process.env.AZURE_CONTENT_SAFETY_ENDPOINT || "").replace(/\/+$/, "");
    const apiKey = process.env.AZURE_CONTENT_SAFETY_KEY || "";

    if (!endpoint || !apiKey) {
      return res.status(500).json({ error: "Azure environment variables are missing." });
    }

    const { type, text, imageBase64, imageType } = req.body || {};

    if (!type) return res.status(400).json({ error: "type is required (text or image)" });

    let azureRes, azureData;

    if (type === "text") {
      if (!text) return res.status(400).json({ error: "text is required for text analysis" });

      const url = `${endpoint}/contentsafety/text:analyze?api-version=2023-10-01`;
      azureRes = await fetch(url, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: text.substring(0, 10000),
          categories: ["Hate", "SelfHarm", "Sexual", "Violence"],
          outputType: "FourSeverityLevels"
        })
      });

      azureData = await azureRes.json().catch(() => ({}));

      if (!azureRes.ok) {
        return res.status(azureRes.status || 500).json({
          error: "Azure text analysis failed.",
          details: azureData
        });
      }

      const scores = (azureData.categoriesAnalysis || []).map(c => ({
        category: c.category,
        severity: c.severity ?? 0
      }));

      return res.status(200).json({ ok: true, type: "text", scores });

    } else if (type === "image") {
      if (!imageBase64) return res.status(400).json({ error: "imageBase64 is required for image analysis" });

      const url = `${endpoint}/contentsafety/image:analyze?api-version=2023-10-01`;
      azureRes = await fetch(url, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image: {
            content: imageBase64
          },
          categories: ["Hate", "SelfHarm", "Sexual", "Violence"],
          outputType: "FourSeverityLevels"
        })
      });

      azureData = await azureRes.json().catch(() => ({}));

      if (!azureRes.ok) {
        return res.status(azureRes.status || 500).json({
          error: "Azure image analysis failed.",
          details: azureData
        });
      }

      const scores = (azureData.categoriesAnalysis || []).map(c => ({
        category: c.category,
        severity: c.severity ?? 0
      }));

      return res.status(200).json({ ok: true, type: "image", scores });

    } else {
      return res.status(400).json({ error: "Invalid type. Use 'text' or 'image'" });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
