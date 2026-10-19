// What the explainer video says (scripts/promo/explainer.js), line by line. The voices are made by
// .github/workflows/promo-voice.yml with Microsoft Edge's neural voices (edge-tts), which needs the
// internet, and kept in media/promo-voice/<id>.mp3; the video is then built offline from them.
// Change a line here and push: the workflow speaks the changed lines again.
//   { id, text, voice, rate?, pitch? }   (rate like '+5%', pitch like '+10Hz')

export const NARRATOR = 'en-US-AvaNeural';
const KID = 'en-US-AnaNeural';

export const NARRATION = [
  { id: 'intro', text: 'Hi! Meet PictoGen. You type a sentence, and it draws a picture that moves.' },
  { id: 'typing', text: 'Just write what you want to see. A girl with a balloon, and her dog, in the park. Press draw, and there it is!' },
  { id: 'moving', text: 'Add the word "then", and things happen one after another. The boy walks in, waves, and here comes his puppy!' },
  { id: 'talking', text: 'Put words in quotes, and your characters talk, with speech bubbles and moving lips.' },
  { id: 'talking-girl', voice: KID, text: 'Look, a rainbow!', pitch: '+8Hz' },
  { id: 'cast', text: 'There is a whole cast to play with: teachers, grandparents, babies, superheroes, princesses, and even a robot.' },
  { id: 'cast-robot', voice: 'en-US-AndrewNeural', text: 'Beep boop. Hello!', rate: '-12%', pitch: '-14Hz' },
  { id: 'hands', text: 'They can hold things too: a phone, a kite, or a cuddly cat.' },
  { id: 'styles', text: 'Pick a drawing style: cartoon, watercolour, anime, crayon, chalkboard, or pixel art. Twenty-three in all!' },
  { id: 'school', text: 'For school, PictoGen draws labelled diagrams, like the parts of a plant. Hide the labels for a quiz, or print a worksheet, with the answers for the teacher.' },
  { id: 'more', text: 'Make comic strips, colouring pages, and little alphabet friends.' },
  { id: 'studio', text: 'In the studio, change any step with a click, and save your scenes into a little story.' },
  { id: 'private', text: 'And it is private. Everything is drawn right on your own device. No sign-up, and nothing is uploaded.' },
  { id: 'outro', text: 'PictoGen. Type a sentence, and watch it come to life. Try it today!' },
].map((l) => ({ voice: NARRATOR, rate: '+0%', pitch: '+0Hz', ...l }));
