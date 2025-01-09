import { app } from 'electron';
import { Card } from '../types';
import path from 'node:path';
import { access, mkdir, writeFile } from 'fs/promises';

const cards = [
  'Blue-Eyes White Dragon',
  'Dark Magician',
  'Red-Eyes Black Dragon',
  'Curse of Dragon',
  'Gaia The Fierce Knight',
  'Great White',
  'Rogue Doll',
  'Skull Red Bird',
  'Hitotsu-Me Giant',
  'Battle Ox',
  'Neo the Magic Swordsman',
  'La Jinn the Mystical Genie of the Lamp',
  'Judge Man',
  'Giant Soldier of Stone',
  'PSY-Frame Driver',
  'Sunseed Genius Loci',
  'Elemental HERO Neos',
  'Master Pendulum, the Dracoslayer',
  'Frostosaurus',
  'Crowned by the World Chalice',
  'Chosen by the World Chalice',
  'Beckoned by the World Chalice',
  'Skull Servant',
  'Summoned Skull',
  'Mechanicalchaser',
  'Gemini Elf',
  'Gene-Warped Warwolf',
  'Gunkan Suship Shari',
  'Mystical Shine Ball',
  'Dragonpulse Magician',
  'Hieratic Seal of the Sun Dragon Overlord',
  'Dragonpit Magician',
  'Wattaildragon',
  'Qliphort Scout',
  'Metalfoes Goldriver',
  'Odd-Eyes Arc Pendulum Dragon',
  'Metalfoes Silverd',
  'Metalfoes Volflame',
  'Qliphort Monolith',
  'Labradorite Dragon',
  'Evilswarm Heliotrope',
  'Shiny Black "C" Squadder',
  'Axe Raider',
  'Millennium Shield',
  'Labyrinth Wall',
  'Clavkiys, the Magikey Skyblaster',
  'Neo Bug',
  'Gem-Knight Garnet',
  'Kabazauls',
  'Sabersaurus',
  'Gokibore',
  'Metal Armored Bug',
  'Insect Knight',
  'Megalosmasher X',
  'Elemental HERO Clayman',
  'Elemental HERO Sparkman',
  'Elemental HERO Avian',
  'Elemental HERO Burstinatrix',
  'Genex Controller',
  'Galaxy Serpent',
  'Flamvell Guard',
  'Metalfoes Steelen',
  'Igknight Veteran',
  'Igknight Gallant',
  'Igknight Margrave',
  'Igknight Cavalier',
  'Igknight Templar',
  'Igknight Paladin',
  'Igknight Squire',
  'Igknight Crusader',
  'Cyber-Tech Alligator',
  'Dragon Core Hexer',
  'Dragon Horn Hunter',
  'Hallohallo',
  'Gladiator Beast Andal',
  'Vorse Raider',
  'Jerry Beans Man',
  'Phantasm Spiral Dragon',
];

export default async function getYugiohCard(): Promise<Card> {
  const name = cards[Math.floor(Math.random() * cards.length)];
  const cardResponse = await fetch(
    `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${name}`,
  );
  const card = (await cardResponse.json()).data[0];

  const { id } = card.card_images[0];
  const basePath = path.join(app.getPath('temp'), 'cards', 'yugioh');
  const imgSrc = path.join(basePath, `${id}.jpg`);
  try {
    await access(imgSrc);
  } catch {
    const imgResponse = await fetch(card.card_images[0].image_url);
    await mkdir(basePath, { recursive: true });
    await writeFile(imgSrc, Buffer.from(await imgResponse.arrayBuffer()));
  }

  return { type: 'yugioh', name, flavorText: card.desc, imgSrc };
}
