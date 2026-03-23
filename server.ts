import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import OpenAI from "openai";
import http from "http";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(express.json());

  const openai = new OpenAI({
    apiKey: process.env.VITE_NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });

  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  // API route for Nvidia Text Models
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, model, reasoning_effort } = req.body;
      
      const completion = await openai.chat.completions.create({
        model: model || "z-ai/glm5",
        messages,
        temperature: reasoning_effort ? undefined : 1,
        top_p: 1,
        max_tokens: 16384,
        ...(model?.includes('mistral') || model?.includes('minimax') ? {} : { chat_template_kwargs: {"enable_thinking":true,"clear_thinking":false} }),
        reasoning_effort: reasoning_effort,
        stream: true
      } as any);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of completion as any) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error("Nvidia API Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Internal Server Error" });
      } else {
        res.end();
      }
    }
  });

  // API route for Groq Models
  app.post("/api/groq", async (req, res) => {
    try {
      const { messages, model } = req.body;
      
      const completion = await groq.chat.completions.create({
        model: model || "meta-llama/llama-4-scout-17b-16e-instruct",
        messages,
        stream: true
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of completion) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error("Groq API Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Internal Server Error" });
      } else {
        res.end();
      }
    }
  });

  // API route for Nvidia Image Models
  app.post("/api/image", async (req, res) => {
    try {
      const apiKey = process.env.VITE_NVIDIA_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "NVIDIA API Key is missing. Please add VITE_NVIDIA_API_KEY to your secrets." });
      }

      const { prompt, model, width, height, seed, steps } = req.body;
      
      const payload: any = {
        prompt,
        width: width || 1024,
        height: height || 1024,
        seed: seed || 0,
        steps: steps || 4
      };

      const response = await fetch(`https://ai.api.nvidia.com/v1/genai/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Nvidia Image API Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
