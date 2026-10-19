// Things held in the hands ("a woman holds a phone", "a girl with a balloon", "a boy reads a
// book"): how big each is in a hand, in a figure's own units (a person is about 100 tall), and
// which point of its drawing the hands hold (its middle, or a string's or handle's end).

import { getConcept } from './concepts/index.js';

// size: across, in figure units; at: the point of the drawing (0..100) that goes in the hands, or
// with float: [dx, y], the point placed above them (dx beside the hand, at height y of the figure),
// joined to the hand by a string (line); up: held up in one raised hand; mirror: drawn the other
// way round (an umbrella's hook curls away from the face)
const HELD = {
  mobile_phone: { size: 17 }, telephone_receiver: { size: 16 }, camera: { size: 19 }, laptop: { size: 30 },
  book: { size: 24 }, open_book: { size: 26 }, notebook: { size: 20 }, newspaper: { size: 26 }, clipboard: { size: 20 },
  envelope: { size: 16 }, love_letter: { size: 16 }, scroll: { size: 22 }, world_map: { size: 30 }, ticket: { size: 14 },
  ball: { size: 22 }, soccer_ball: { size: 22 }, basketball: { size: 22 }, american_football: { size: 20 },
  balloon: { size: 34, at: [47, 97], float: [3, -4], line: '#90a4ae', up: true }, kite: { size: 36, at: [50, 90], float: [16, -34], line: '#90a4ae', up: true },
  umbrella: { size: 80, at: [52, 88], mirror: true, up: true }, triangular_flag: { size: 48, at: [24, 92], up: true }, crossed_flags: { size: 40, at: [50, 92], up: true },
  placard: { size: 44, at: [50, 92], up: true }, magic_wand: { size: 24, at: [20, 80] }, flashlight: { size: 18 },
  hot_beverage: { size: 16 }, teacup_without_handle: { size: 14 }, cup_with_straw: { size: 16 }, beverage_box: { size: 14 },
  glass_of_milk: { size: 14 }, bubble_tea: { size: 16 }, baby_bottle: { size: 15 },
  ice_cream: { size: 16, at: [50, 80] }, soft_ice_cream: { size: 16, at: [50, 80] }, lollipop: { size: 16, at: [50, 85] },
  apple: { size: 14 }, banana: { size: 16 }, carrot: { size: 16 }, cookie: { size: 12 }, doughnut: { size: 13 }, candy: { size: 12 },
  sandwich: { size: 16 }, pizza: { size: 18 }, cake: { size: 24 }, watermelon: { size: 22 },
  flower: { size: 26, at: [50, 90] }, rose: { size: 24, at: [50, 90] }, tulip: { size: 24, at: [50, 90] },
  sunflower: { size: 28, at: [50, 90] }, bouquet: { size: 26, at: [50, 82] },
  wrapped_gift: { size: 24 }, package: { size: 24 }, box: { size: 26 }, basket: { size: 26 }, trophy: { size: 22 },
  teddy_bear: { size: 30 }, handbag: { size: 22 }, purse: { size: 16 }, shopping_bags: { size: 26 }, backpack: { size: 26 },
  pencil: { size: 18 }, pen: { size: 16 }, fountain_pen: { size: 16 }, crayon: { size: 14 }, paintbrush: { size: 20 },
  artist_palette: { size: 24 }, magnifying_glass_tilted_left: { size: 18 }, key: { size: 12 }, hammer: { size: 22 },
  microphone: { size: 16 }, guitar: { size: 46 }, violin: { size: 34 }, trumpet: { size: 26 }, drum: { size: 28 },
  candle: { size: 16 }, red_paper_lantern: { size: 20, at: [50, 10] }, compass: { size: 14 }, dagger: { size: 22 },
  cat: { size: 36, at: [50, 62] }, dog: { size: 40, at: [50, 62] }, rabbit: { size: 32, at: [50, 62] },
  baby: { size: 30, at: [50, 60] }, fish: { size: 26 }, bird: { size: 20 },
};
// Held only when someone holds, carries or hugs them ("a man with a dog" walks it)
const ONLY_BY_VERB = new Set(['cat', 'dog', 'rabbit', 'baby', 'fish', 'bird']);

/** How a concept is held: { size, at: [x, y], up } or null when it isn't something to hold */
export function heldShape(id) {
  const h = HELD[id];
  if (h) return { at: [50, 50], up: false, ...h };
  const c = getConcept(id);
  // Anything else small enough, by its scene size
  if (!c || !['objects', 'food', 'food_drink', 'activities'].includes(c.category) || (c.scale ?? 1) > 0.4) return null;
  return { size: Math.round(Math.max(12, Math.min(26, (c.scale ?? 0.3) * 60))), at: [50, 50], up: false };
}

/** True when `id` can be held: "with a balloon" yes, "with a dog" only when held, carried, hugged */
export const canHold = (id, byVerb) => Boolean(heldShape(id)) && (byVerb || !ONLY_BY_VERB.has(id));
