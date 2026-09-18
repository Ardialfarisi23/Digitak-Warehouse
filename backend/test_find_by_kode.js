const itemRepository = require('./src/modules/item/item.repository');

async function test() {
  try {
    const existing = await itemRepository.findByKode('[01-013-00010]', { includeInactive: true });
    console.log('findByKode result:', JSON.stringify(existing, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
