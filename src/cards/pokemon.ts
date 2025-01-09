import { app } from 'electron';
import { Card } from '../types';
import path from 'node:path';
import { access, mkdir, writeFile } from 'fs/promises';

const cardIds = [
  'sv1-199',
  'sv1-200',
  'sv1-201',
  'sv1-202',
  'sv1-203',
  'sv1-204',
  'sv1-205',
  'sv1-206',
  'sv1-207',
  'sv1-209',
  'sv1-210',
  'sv1-211',
  'sv1-212',
  'sv1-213',
  'sv1-214',
  'sv1-215',
  'sv1-216',
  'sv1-217',
  'sv1-218',
  'sv1-219',
  'sv1-220',
  'sv1-221',
  'sv1-222',
  'sv2-194',
  'sv2-195',
  'sv2-196',
  'sv2-197',
  'sv2-198',
  'sv2-199',
  'sv2-200',
  'sv2-201',
  'sv2-202',
  'sv2-203',
  'sv2-204',
  'sv2-205',
  'sv2-206',
  'sv2-207',
  'sv2-208',
  'sv2-209',
  'sv2-210',
  'sv2-211',
  'sv2-212',
  'sv2-213',
  'sv2-214',
  'sv2-215',
  'sv2-216',
  'sv2-217',
  'sv2-218',
  'sv2-219',
  'sv2-220',
  'sv2-221',
  'sv2-223',
  'sv2-224',
  'sv2-225',
  'sv2-226',
  'sv2-227',
  'sv2-228',
  'sv2-229',
  'sv3-198',
  'sv3-199',
  'sv3-200',
  'sv3-201',
  'sv3-202',
  'sv3-203',
  'sv3-207',
  'sv3-208',
  'sv3-209',
  'sv3pt5-166',
  'sv3pt5-167',
  'sv3pt5-169',
  'sv3pt5-174',
  'sv3pt5-175',
  'sv3pt5-176',
  'sv3pt5-177',
  'sv3pt5-178',
  'sv3pt5-179',
  'sv3pt5-180',
  'sv3pt5-181',
];

export default async function getPokemonCard(): Promise<Card> {
  const id = cardIds[Math.floor(Math.random() * cardIds.length)];
  const cardResponse = await fetch(`https://api.pokemontcg.io/v2/cards/${id}`);
  const card = (await cardResponse.json()).data;

  const basePath = path.join(app.getPath('temp'), 'cards', 'pokemon');
  const imgSrc = path.join(basePath, `${id}.png`);
  try {
    await access(imgSrc);
  } catch {
    const imgResponse = await fetch(card.images.large);
    await mkdir(basePath, { recursive: true });
    await writeFile(imgSrc, Buffer.from(await imgResponse.arrayBuffer()));
  }

  return {
    type: 'pokemon',
    name: card.name,
    flavorText: card.flavorText,
    imgSrc,
  };
}
