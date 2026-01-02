import { app } from 'electron';
import { Card } from '../types';
import path from 'node:path';
import { access, mkdir, writeFile } from 'fs/promises';

const cards = [
  {
    id: 'sv1-199',
    name: 'Tarountula',
    imageLarge: 'https://images.pokemontcg.io/sv1/199_hires.png',
    flavorText:
      "The thread it secretes from its rear is as strong as wire. The secret behind the thread's strength is the topic of ongoing research.",
  },
  {
    id: 'sv1-200',
    name: 'Dolliv',
    imageLarge: 'https://images.pokemontcg.io/sv1/200_hires.png',
    flavorText:
      'Dolliv shares its tasty, fresh-scented oil with others. This species has coexisted with humans since times long gone.',
  },
  {
    id: 'sv1-201',
    name: 'Toedscool',
    imageLarge: 'https://images.pokemontcg.io/sv1/201_hires.png',
    flavorText:
      'Though it looks like Tentacool, Toedscool is a completely different species. Its legs may be thin, but it can run at a speed of 30 mph.',
  },
  {
    id: 'sv1-202',
    name: 'Scovillain',
    imageLarge: 'https://images.pokemontcg.io/sv1/202_hires.png',
    flavorText:
      'The green head has turned vicious due to the spicy chemicals stimulating its brain. Once it goes on a rampage, there is no stopping it.',
  },
  {
    id: 'sv1-203',
    name: 'Armarouge',
    imageLarge: 'https://images.pokemontcg.io/sv1/203_hires.png',
    flavorText:
      'Armarouge evolved through the use of a set of armor that belonged to a distinguished warrior. This Pokémon is incredibly loyal.',
  },
  {
    id: 'sv1-204',
    name: 'Slowpoke',
    imageLarge: 'https://images.pokemontcg.io/sv1/204_hires.png',
    flavorText:
      'It is always vacantly lost in thought, but no one knows what it is thinking about. It is good at fishing with its tail.',
  },
  {
    id: 'sv1-205',
    name: 'Clauncher',
    imageLarge: 'https://images.pokemontcg.io/sv1/205_hires.png',
    flavorText:
      "Clauncher's claws will regrow if they fall off. The meat inside the claws is edible, but it has a distinct flavor that doesn't appeal to all tastes.",
  },
  {
    id: 'sv1-206',
    name: 'Wiglett',
    imageLarge: 'https://images.pokemontcg.io/sv1/206_hires.png',
    flavorText:
      'This Pokémon can pick up the scent of a Veluza just over 65 feet away and will hide itself in the sand.',
  },
  {
    id: 'sv1-207',
    name: 'Dondozo',
    imageLarge: 'https://images.pokemontcg.io/sv1/207_hires.png',
    flavorText:
      "This Pokémon is a glutton, but it's bad at getting food. It teams up with a Tatsugiri to catch prey.",
  },
  {
    id: 'sv1-208',
    name: 'Pachirisu',
    imageLarge: 'https://images.pokemontcg.io/sv1/208_hires.png',
    flavorText:
      'A pair may be seen rubbing their cheek pouches together in an effort to share stored electricity.',
  },
  {
    id: 'sv1-209',
    name: 'Pawmot',
    imageLarge: 'https://images.pokemontcg.io/sv1/209_hires.png',
    flavorText:
      "Pawmot's fluffy fur acts as a battery. It can store the same amount of electricity as an electric car.",
  },
  {
    id: 'sv1-210',
    name: 'Drowzee',
    imageLarge: 'https://images.pokemontcg.io/sv1/210_hires.png',
    flavorText:
      'When it twitches its nose, it can tell where someone is sleeping and what that person is dreaming about.',
  },
  {
    id: 'sv1-211',
    name: 'Ralts',
    imageLarge: 'https://images.pokemontcg.io/sv1/211_hires.png',
    flavorText:
      "The horns on its head provide a strong power that enables it to sense people's emotions.",
  },
  {
    id: 'sv1-212',
    name: 'Kirlia',
    imageLarge: 'https://images.pokemontcg.io/sv1/212_hires.png',
    flavorText:
      'It has a psychic power that enables it to distort the space around it and see into the future.',
  },
  {
    id: 'sv1-213',
    name: 'Fidough',
    imageLarge: 'https://images.pokemontcg.io/sv1/213_hires.png',
    flavorText:
      "This Pokémon is smooth and moist to the touch. Yeast in Fidough's breath induces fermentation in the Pokémon's vicinity.",
  },
  {
    id: 'sv1-214',
    name: 'Greavard',
    imageLarge: 'https://images.pokemontcg.io/sv1/214_hires.png',
    flavorText:
      "This friendly Pokémon doesn't like being alone. Pay it even the slightest bit of attention, and it will follow you forever.",
  },
  {
    id: 'sv1-215',
    name: 'Riolu',
    imageLarge: 'https://images.pokemontcg.io/sv1/215_hires.png',
    flavorText:
      'They communicate with one another using their auras. They are able to run all through the night.',
  },
  {
    id: 'sv1-216',
    name: 'Sandile',
    imageLarge: 'https://images.pokemontcg.io/sv1/216_hires.png',
    flavorText:
      'It submerges itself in sand and moves as if swimming. This wise behavior keeps its enemies from finding it and maintains its temperature.',
  },
  {
    id: 'sv1-217',
    name: 'Klawf',
    imageLarge: 'https://images.pokemontcg.io/sv1/217_hires.png',
    flavorText:
      "Klawf hangs upside-down from cliffs, waiting for prey. But Klawf can't remain in this position for long because its blood rushes to its head.",
  },
  {
    id: 'sv1-218',
    name: 'Mabosstiff',
    imageLarge: 'https://images.pokemontcg.io/sv1/218_hires.png',
    flavorText:
      'Mabosstiff loves playing with children. Though usually gentle, it takes on an intimidating look when protecting its family.',
  },
  {
    id: 'sv1-219',
    name: 'Bombirdier',
    imageLarge: 'https://images.pokemontcg.io/sv1/219_hires.png',
    flavorText:
      'Bombirdier uses the apron on its chest to bundle up food, which it carries back to its nest. It enjoys dropping things that make loud noises.',
  },
  {
    id: 'sv1-220',
    name: 'Kingambit',
    imageLarge: 'https://images.pokemontcg.io/sv1/220_hires.png',
    flavorText:
      'Only a Bisharp that stands above all others in its vast army can evolve into Kingambit.',
  },
  {
    id: 'sv1-221',
    name: 'Starly',
    imageLarge: 'https://images.pokemontcg.io/sv1/221_hires.png',
    flavorText:
      'They flock around mountains and fields, chasing after bug Pokémon. Their singing is noisy and annoying.',
  },
  {
    id: 'sv1-222',
    name: 'Skwovet',
    imageLarge: 'https://images.pokemontcg.io/sv1/222_hires.png',
    flavorText:
      'No matter how much it stuffs its belly with food, it is always anxious about getting hungry again. So, it stashes berries in its cheeks and tail.',
  },
  {
    id: 'sv2-194',
    name: 'Heracross',
    imageLarge: 'https://images.pokemontcg.io/sv2/194_hires.png',
    flavorText:
      'It loves sweet nectar. To keep all the nectar to itself, it hurls rivals away with its prized horn.',
  },
  {
    id: 'sv2-195',
    name: 'Tropius',
    imageLarge: 'https://images.pokemontcg.io/sv2/195_hires.png',
    flavorText:
      'It lives in tropical jungles. The bunch of fruit around its neck is delicious. The fruit grows twice a year.',
  },
  {
    id: 'sv2-196',
    name: 'Sprigatito',
    imageLarge: 'https://images.pokemontcg.io/sv2/196_hires.png',
    flavorText:
      'Its fluffy fur is similar in composition to plants. This Pokémon frequently washes its face to keep it from drying out.',
  },
  {
    id: 'sv2-197',
    name: 'Floragato',
    imageLarge: 'https://images.pokemontcg.io/sv2/197_hires.png',
    flavorText:
      'Floragato deftly wields the vine hidden beneath its long fur, slamming the hard flower bud against its opponents.',
  },
  {
    id: 'sv2-198',
    name: 'Bramblin',
    imageLarge: 'https://images.pokemontcg.io/sv2/198_hires.png',
    flavorText:
      'A soul unable to move on to the afterlife was blown around by the wind until it got tangled up with dried grass and became a Pokémon.',
  },
  {
    id: 'sv2-199',
    name: 'Fletchinder',
    imageLarge: 'https://images.pokemontcg.io/sv2/199_hires.png',
    flavorText:
      'Fletchinder scatters embers in tall grass where bug Pokémon might be hiding and then catches them as they come leaping out.',
  },
  {
    id: 'sv2-200',
    name: 'Pyroar',
    imageLarge: 'https://images.pokemontcg.io/sv2/200_hires.png',
    flavorText:
      "The females of a pride work together to bring down prey. It's thanks to them that their pride doesn't starve.",
  },
  {
    id: 'sv2-201',
    name: 'Fuecoco',
    imageLarge: 'https://images.pokemontcg.io/sv2/201_hires.png',
    flavorText:
      'It lies on warm rocks and uses the heat absorbed by its square-shaped scales to create fire energy.',
  },
  {
    id: 'sv2-202',
    name: 'Crocalor',
    imageLarge: 'https://images.pokemontcg.io/sv2/202_hires.png',
    flavorText:
      "The combination of Crocalor's fire energy and overflowing vitality has caused an egg-shaped fireball to appear on the Pokémon's head.",
  },
  {
    id: 'sv2-203',
    name: 'Magikarp',
    imageLarge: 'https://images.pokemontcg.io/sv2/203_hires.png',
    flavorText:
      'An underpowered, pathetic Pokémon. It may jump high on rare occasions but never more than seven feet.',
  },
  {
    id: 'sv2-204',
    name: 'Marill',
    imageLarge: 'https://images.pokemontcg.io/sv2/204_hires.png',
    flavorText:
      'The fur on its body naturally repels water. It can stay dry even when it plays in the water.',
  },
  {
    id: 'sv2-205',
    name: 'Eiscue',
    imageLarge: 'https://images.pokemontcg.io/sv2/205_hires.png',
    flavorText:
      'On hot days, these Pokémon press their ice cube heads together and pass the time cooling each other down.',
  },
  {
    id: 'sv2-206',
    name: 'Quaxly',
    imageLarge: 'https://images.pokemontcg.io/sv2/206_hires.png',
    flavorText:
      'This Pokémon migrated to Paldea from distant lands long ago. The gel secreted by its feathers repels water and grime.',
  },
  {
    id: 'sv2-207',
    name: 'Quaxwell',
    imageLarge: 'https://images.pokemontcg.io/sv2/207_hires.png',
    flavorText:
      'These Pokémon constantly run through shallow waters to train their legs, then compete with each other to see which of them kicks most gracefully.',
  },
  {
    id: 'sv2-208',
    name: 'Frigibax',
    imageLarge: 'https://images.pokemontcg.io/sv2/208_hires.png',
    flavorText:
      'Frigibax absorbs heat through its dorsal fin and converts the heat into ice energy. The higher the temperature, the more energy Frigibax stores.',
  },
  {
    id: 'sv2-209',
    name: 'Arctibax',
    imageLarge: 'https://images.pokemontcg.io/sv2/209_hires.png',
    flavorText:
      'Arctibax freezes the air around it, protecting its face with an ice mask and turning its dorsal fin into a blade of ice.',
  },
  {
    id: 'sv2-210',
    name: 'Baxcalibur',
    imageLarge: 'https://images.pokemontcg.io/sv2/210_hires.png',
    flavorText:
      'This Pokémon blasts cryogenic air out from its mouth. This air can instantly freeze even liquid-hot lava.',
  },
  {
    id: 'sv2-211',
    name: 'Raichu',
    imageLarge: 'https://images.pokemontcg.io/sv2/211_hires.png',
    flavorText:
      'Its tail discharges electricity into the ground, protecting it from getting shocked.',
  },
  {
    id: 'sv2-212',
    name: 'Mismagius',
    imageLarge: 'https://images.pokemontcg.io/sv2/212_hires.png',
    flavorText:
      'Its cry sounds like an incantation. It is said the cry may rarely be imbued with happiness-giving power.',
  },
  {
    id: 'sv2-213',
    name: 'Gothorita',
    imageLarge: 'https://images.pokemontcg.io/sv2/213_hires.png',
    flavorText:
      'This Pokémon will hypnotize children to put them to sleep before carrying them away. Be wary of nights when the starlight is bright.',
  },
  {
    id: 'sv2-214',
    name: 'Sandygast',
    imageLarge: 'https://images.pokemontcg.io/sv2/214_hires.png',
    flavorText:
      'If it loses its shovel, it will stick something else— like a branch—in its head to make do until it finds another shovel.',
  },
  {
    id: 'sv2-215',
    name: 'Rabsca',
    imageLarge: 'https://images.pokemontcg.io/sv2/215_hires.png',
    flavorText:
      'The body that supports the ball barely moves. Therefore, it is thought that the true body of this Pokémon is actually inside the ball.',
  },
  {
    id: 'sv2-216',
    name: 'Tinkatink',
    imageLarge: 'https://images.pokemontcg.io/sv2/216_hires.png',
    flavorText:
      'It swings its handmade hammer around to protect itself, but the hammer is often stolen by Pokémon that eat metal.',
  },
  {
    id: 'sv2-217',
    name: 'Tinkatuff',
    imageLarge: 'https://images.pokemontcg.io/sv2/217_hires.png',
    flavorText:
      'This Pokémon will attack groups of Pawniard and Bisharp, gathering metal from them in order to create a large and sturdy hammer.',
  },
  {
    id: 'sv2-218',
    name: 'Paldean Tauros',
    imageLarge: 'https://images.pokemontcg.io/sv2/218_hires.png',
    flavorText:
      'This kind of Tauros, known as the Combat Breed, is distinguished by its thick, powerful muscles and its fierce disposition.',
  },
  {
    id: 'sv2-219',
    name: 'Sudowoodo',
    imageLarge: 'https://images.pokemontcg.io/sv2/219_hires.png',
    flavorText:
      'Although it always pretends to be a tree, its composition appears more similar to rock than to vegetation.',
  },
  {
    id: 'sv2-220',
    name: 'Nacli',
    imageLarge: 'https://images.pokemontcg.io/sv2/220_hires.png',
    flavorText:
      'It was born in a layer of rock salt deep under the earth. This species was particularly treasured in the old days, as they would share precious salt.',
  },
  {
    id: 'sv2-221',
    name: 'Paldean Wooper',
    imageLarge: 'https://images.pokemontcg.io/sv2/221_hires.png',
    flavorText:
      'After losing a territorial struggle, Wooper began living on land. The Pokémon changed over time, developing a poisonous film to protect its body.',
  },
  {
    id: 'sv2-222',
    name: 'Tyranitar',
    imageLarge: 'https://images.pokemontcg.io/sv2/222_hires.png',
    flavorText:
      "Extremely strong, it can change the landscape. It is so insolent that it doesn't care about others.",
  },
  {
    id: 'sv2-223',
    name: 'Grafaiai',
    imageLarge: 'https://images.pokemontcg.io/sv2/223_hires.png',
    flavorText:
      'The color of the poisonous saliva depends on what the Pokémon eats. Grafaiai covers its fingers in its saliva and draws patterns on trees in forests.',
  },
  {
    id: 'sv2-224',
    name: 'Orthworm',
    imageLarge: 'https://images.pokemontcg.io/sv2/224_hires.png',
    flavorText:
      'When attacked, this Pokémon will wield the tendrils on its body like fists and pelt the opponent with a storm of punches.',
  },
  {
    id: 'sv2-225',
    name: 'Rookidee',
    imageLarge: 'https://images.pokemontcg.io/sv2/225_hires.png',
    flavorText:
      "This Pokémon is brave and reckless. The white markings around a Rookidee's eyes intimidate fainthearted Pokémon.",
  },
  {
    id: 'sv2-226',
    name: 'Maushold',
    imageLarge: 'https://images.pokemontcg.io/sv2/226_hires.png',
    flavorText:
      'They build huge nests with many rooms that are used for different purposes, such as eating and sleeping.',
  },
  {
    id: 'sv2-227',
    name: 'Flamigo',
    imageLarge: 'https://images.pokemontcg.io/sv2/227_hires.png',
    flavorText:
      'This Pokémon apparently ties the base of its neck into a knot so that the energy stored in its belly does not escape from its beak.',
  },
  {
    id: 'sv2-228',
    name: 'Farigiraf',
    imageLarge: 'https://images.pokemontcg.io/sv2/228_hires.png',
    flavorText:
      "Now that the brain waves from the head and tail are synced up, the psychic power of this Pokémon is 10 times stronger than Girafarig's.",
  },
  {
    id: 'sv2-229',
    name: 'Dudunsparce',
    imageLarge: 'https://images.pokemontcg.io/sv2/229_hires.png',
    flavorText:
      'This Pokémon uses its hard tail to make its nest by boring holes into bedrock deep underground. The nest can reach lengths of over six miles.',
  },
  {
    id: 'sv3-198',
    name: 'Gloom',
    imageLarge: 'https://images.pokemontcg.io/sv3/198_hires.png',
    flavorText:
      'What appears to be drool is actually sweet honey. It is very sticky and clings stubbornly if touched.',
  },
  {
    id: 'sv3-199',
    name: 'Ninetales',
    imageLarge: 'https://images.pokemontcg.io/sv3/199_hires.png',
    flavorText:
      'Very smart and very vengeful. Grabbing one of its many tails could result in a 1,000-year curse.',
  },
  {
    id: 'sv3-200',
    name: 'Palafin',
    imageLarge: 'https://images.pokemontcg.io/sv3/200_hires.png',
    flavorText:
      "This Pokémon's ancient genes have awakened. It is now so extraordinarily strong that it can easily lift a cruise ship with one fin.",
  },
  {
    id: 'sv3-201',
    name: 'Bellibolt',
    imageLarge: 'https://images.pokemontcg.io/sv3/201_hires.png',
    flavorText:
      'When this Pokémon expands and contracts its wobbly body, the belly-button dynamo in its stomach produces a huge amount of electricity.',
  },
  {
    id: 'sv3-202',
    name: 'Cleffa',
    imageLarge: 'https://images.pokemontcg.io/sv3/202_hires.png',
    flavorText:
      'Because of its unusual, starlike silhouette, people believe that it came here on a meteor.',
  },
  {
    id: 'sv3-203',
    name: 'Larvitar',
    imageLarge: 'https://images.pokemontcg.io/sv3/203_hires.png',
    flavorText:
      'Born deep underground, this Pokémon becomes a pupa after eating enough dirt to make a mountain.',
  },
  {
    id: 'sv3-204',
    name: 'Houndour',
    imageLarge: 'https://images.pokemontcg.io/sv3/204_hires.png',
    flavorText:
      'It is smart enough to hunt in packs. It uses a variety of cries for communicating with others.',
  },
  {
    id: 'sv3-205',
    name: 'Scizor',
    imageLarge: 'https://images.pokemontcg.io/sv3/205_hires.png',
    flavorText:
      "This Pokémon's pincers, which contain steel, can crush any hard object they get ahold of into bits.",
  },
  {
    id: 'sv3-206',
    name: 'Varoom',
    imageLarge: 'https://images.pokemontcg.io/sv3/206_hires.png',
    flavorText:
      'It is said that this Pokémon was born when an unknown poison Pokémon entered and inspirited an engine left at a scrap-processing factory.',
  },
  {
    id: 'sv3-207',
    name: 'Pidgey',
    imageLarge: 'https://images.pokemontcg.io/sv3/207_hires.png',
    flavorText:
      'It is docile and prefers to avoid conflict. If disturbed, however, it can ferociously strike back.',
  },
  {
    id: 'sv3-208',
    name: 'Pidgeotto',
    imageLarge: 'https://images.pokemontcg.io/sv3/208_hires.png',
    flavorText:
      'Very protective of its sprawling territorial area, this Pokémon will fiercely peck at any intruder.',
  },
  {
    id: 'sv3-209',
    name: 'Lechonk',
    imageLarge: 'https://images.pokemontcg.io/sv3/209_hires.png',
    flavorText:
      "It searches for food all day. It possesses a keen sense of smell but doesn't use it for anything other than foraging.",
  },
  {
    id: 'sv3pt5-166',
    name: 'Bulbasaur',
    imageLarge: 'https://images.pokemontcg.io/sv3pt5/166_hires.png',
    flavorText:
      'While it is young, it uses the nutrients that are stored in the seed on its back in order to grow.',
  },
  {
    id: 'sv3pt5-167',
    name: 'Ivysaur',
    imageLarge: 'https://images.pokemontcg.io/sv3pt5/167_hires.png',
    flavorText:
      'Exposure to sunlight adds to its strength. Sunlight also makes the bud on its back grow larger.',
  },
  {
    id: 'sv3pt5-169',
    name: 'Charmeleon',
    imageLarge: 'https://images.pokemontcg.io/sv3pt5/169_hires.png',
    flavorText:
      'If it becomes agitated during battle, it spouts intense flames, incinerating its surroundings.',
  },
  {
    id: 'sv3pt5-174',
    name: 'Nidoking',
    imageLarge: 'https://images.pokemontcg.io/sv3pt5/174_hires.png',
    flavorText:
      "Nidoking prides itself on its strength. It's forceful and spirited in battle, making use of its thick tail and diamond-crushing horn.",
  },
  {
    id: 'sv3pt5-175',
    name: 'Psyduck',
    imageLarge: 'https://images.pokemontcg.io/sv3pt5/175_hires.png',
    flavorText:
      'It is constantly wracked by a headache. When the headache turns intense, it begins using mysterious powers.',
  },
  {
    id: 'sv3pt5-176',
    name: 'Poliwhirl',
    imageLarge: 'https://images.pokemontcg.io/sv3pt5/176_hires.png',
    flavorText:
      "This Pokémon's sweat is a slimy mucus. When captured, Poliwhirl can slither from its enemies' grasp and escape.",
  },
  {
    id: 'sv3pt5-177',
    name: 'Machoke',
    imageLarge: 'https://images.pokemontcg.io/sv3pt5/177_hires.png',
    flavorText:
      'Its formidable body never gets tired. It helps people by doing work such as the moving of heavy goods.',
  },
  {
    id: 'sv3pt5-178',
    name: 'Tangela',
    imageLarge: 'https://images.pokemontcg.io/sv3pt5/178_hires.png',
    flavorText:
      "Hidden beneath a tangle of vines that grows nonstop even if the vines are torn off, this Pokémon's true appearance remains a mystery.",
  },
  {
    id: 'sv3pt5-179',
    name: 'Mr. Mime',
    imageLarge: 'https://images.pokemontcg.io/sv3pt5/179_hires.png',
    flavorText:
      "It's known for its top-notch pantomime skills. It protects itself from all sorts of attacks by emitting auras from its fingers to create walls.",
  },
  {
    id: 'sv3pt5-180',
    name: 'Omanyte',
    imageLarge: 'https://images.pokemontcg.io/sv3pt5/180_hires.png',
    flavorText:
      "This Pokémon is a member of an ancient, extinct species. Omanyte paddles through water with its 10 tentacles, looking like it's just drifting along.",
  },
  {
    id: 'sv3pt5-181',
    name: 'Dragonair',
    imageLarge: 'https://images.pokemontcg.io/sv3pt5/181_hires.png',
    flavorText:
      'They say that if it emits an aura from its whole body, the weather will begin to change instantly.',
  },
];

export default async function getPokemonCard(): Promise<Card> {
  const card = cards[Math.floor(Math.random() * cards.length)];
  const imgPath = path.join('cards', 'pokemon', `${card.id}.jpg`);
  const imgSrc = path.join(app.getPath('userData'), imgPath);
  try {
    await access(imgSrc);
  } catch {
    const imgResponse = await fetch(card.imageLarge);
    await mkdir(path.dirname(imgSrc), { recursive: true });
    await writeFile(imgSrc, Buffer.from(await imgResponse.arrayBuffer()));
  }

  return {
    type: 'pokemon',
    name: card.name,
    flavorText: card.flavorText,
    imgSrc: imgPath,
  };
}
