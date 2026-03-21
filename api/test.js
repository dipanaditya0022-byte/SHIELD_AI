export default async function handler(req, res) {
  try {
    const endpoint = (process.env.AZURE_CONTENT_SAFETY_ENDPOINT || "").replace(/\/+$/, "");
    const apiKey = process.env.AZURE_CONTENT_SAFETY_KEY || "";

    if (!endpoint || !apiKey) {
      return res.status(500).json({ error: "Azure environment variables are missing." });
    }

    // Test with a simple safe text
    const url = `${endpoint}/contentsafety/text:analyze?api-version=2023-10-01`;
    const azureRes = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: "Hello world",
        categories: ["Hate"],
        outputType: "FourSeverityLevels"
      })
    });

    const data = await azureRes.json().catch(() => ({}));

    if (!azureRes.ok) {
      return res.status(azureRes.status).json({ ok: false, error: "Connection failed", details: data });
    }

    return res.status(200).json({ ok: true, message: "Azure Content Safety connected successfully!" });

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || "Internal server error" });
  }
}
