import { OpenRouter } from "@openrouter/sdk";
const openrouter = new OpenRouter({ apiKey: "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" });
async function test() {
  try {
    const stream = await openrouter.chat.send({
      chatGenerationParams: {
        model: "stepfun/step-3.5-flash:free",
        messages: [{ role: "user", content: "hi" }],
        stream: true
      }
    });
    console.log("Stream object:", typeof stream, stream && typeof stream[Symbol.asyncIterator]);
    for await (const chunk of stream) {
      console.log(chunk);
      break;
    }
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
