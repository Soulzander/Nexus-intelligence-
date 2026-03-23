import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.VITE_NVIDIA_API_KEY || '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

async function testModel(modelName) {
  try {
    console.log(`Testing model: ${modelName}`);
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [{"role":"user","content":"Hello"}],
      max_tokens: 10,
    });
    console.log(`Success for ${modelName}`);
  } catch (e) {
    console.error(`Error for ${modelName}:`, e.message);
  }
}

async function main() {
  await testModel("z-ai/glm5");
  await testModel("minimax-m2.5");
  await testModel("kimi-k2.5");
  await testModel("nemotron-3-super-120b-a12b");
}

main();
