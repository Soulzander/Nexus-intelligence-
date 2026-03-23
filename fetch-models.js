import fetch from 'node-fetch';

async function main() {
  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/models', {
      headers: {
        'Authorization': `Bearer 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`
      }
    });
    const data = await response.json();
    console.log(data.data.map(m => m.id).join('\n'));
  } catch (e) {
    console.error(e);
  }
}

main();
