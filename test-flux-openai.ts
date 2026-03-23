import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

async function main() {
  try {
    const response = await openai.images.generate({
      model: "black-forest-labs/flux-2-klein-4b",
      prompt: "A neon hologram of a cat driving at top speed",
      n: 1,
      size: "1024x1024"
    });
    console.log(response);
  } catch (e) {
    console.error(e.message);
  }
}
main();
