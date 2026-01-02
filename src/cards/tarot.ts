import { Card } from '../types';

export default async function getTarotCard(): Promise<Card> {
  const response = await fetch(
    'https://tarot-api-3hv5.onrender.com/api/v1/cards/random?n=1',
  );
  if (response.status !== 200) {
    throw new Error(`Tarot ${response.status}: ${response.statusText}`);
  }
  const card = (await response.json()).cards[0];
  return {
    type: 'tarot',
    name: card.name,
    flavorText: card.meaning_up,
    imgSrc: `https://sacred-texts.com/tarot/pkt/img/${card.name_short}.jpg`,
  };
}
