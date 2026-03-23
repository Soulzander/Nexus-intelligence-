import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

async function main() {
  try {
    const response = await openai.models.list();
    console.log(response.data.map(m => m.id));
  } catch (e) {
    console.error(e.message);
  }
}
main();
