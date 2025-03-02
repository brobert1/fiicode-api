/* eslint-disable no-console */
import { Badge } from '@models';
import badges from '@db/resources/badges';

export async function seed() {
  try {
    console.log('Planting seeds for badges...');

    const seeds = await badges();
    await Badge.insertMany(seeds);

    console.log('✓');
  } catch (err) {
    console.warn('Error! Cannot insert badges');
    console.error(err);
  }
}
