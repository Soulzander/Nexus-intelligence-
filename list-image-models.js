import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.VITE_NVIDIA_API_KEY || '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

async function main() {
  try {
    const models = await openai.models.list();
    const imageModels = models.data.filter(m => m.id.includes('image') || m.id.includes('diffusion') || m.id.includes('sd'));
    console.log(imageModels.map(m => m.id).join('\n'));
  } catch (e) {
    console.error("Error listing models:", e.message);
  }
}

main();
