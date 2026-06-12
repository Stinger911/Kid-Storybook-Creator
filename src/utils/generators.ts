import { KidBook, BookPage, LayoutStyle } from '../types';

export const STARTER_TEMPLATES: KidBook[] = [
  {
    id: "space-adv",
    title: "Space Cadet Adventure",
    author: "Mom, Dad & Me",
    createdAt: new Date().toLocaleDateString(),
    themeColor: "from-sky-100 to-indigo-100",
    pages: [
      {
        id: "space-1",
        title: "Ready for Blastoff!",
        type: "mixed",
        layout: "coloring-top-writing-bottom",
        storyText: "Our cute little rocket ship is fueled with starlight juice and parked on the launching pad. 3, 2, 1... Blastoff into the deep unknown space!",
        tracingText: "ROCKET",
        pageNumber: 1,
        coloringImage: "", // will use canvas or default outlines
        coloringAdjustments: { threshold: 40, edgeStrength: 3, brightness: 15, contrast: 50, invert: false }
      },
      {
        id: "space-2",
        title: "Hello Moon Bunny",
        type: "mixed",
        layout: "coloring-top-writing-bottom",
        storyText: "Upon landing on the shiny moon, we met a cheerful bunny wearing an astronaut helmet! He loves to jump around floating like a balloon.",
        tracingText: "MOON",
        pageNumber: 2,
        coloringImage: "",
        coloringAdjustments: { threshold: 40, edgeStrength: 3, brightness: 15, contrast: 50, invert: false }
      },
      {
        id: "space-3",
        title: "Friendly Star Shower",
        type: "mixed",
        layout: "coloring-top-writing-bottom",
        storyText: "Look out of the glass window! A shower of happy shooting stars is zooming past, painting the dark cosmic sky with sparkling neon fire.",
        tracingText: "STARS",
        pageNumber: 3,
        coloringImage: "",
        coloringAdjustments: { threshold: 40, edgeStrength: 3, brightness: 15, contrast: 50, invert: false }
      }
    ]
  },
  {
    id: "sea-expl",
    title: "Treasures of the Sea",
    author: "Grandma & Me",
    createdAt: new Date().toLocaleDateString(),
    themeColor: "from-teal-50 to-emerald-100",
    pages: [
      {
        id: "sea-1",
        title: "Diving Deep Down",
        type: "mixed",
        layout: "coloring-top-writing-bottom",
        storyText: "Splash! We dive deep down with a bright yellow submarine. Look at the friendly sea turtles swimming near the bubbling reef!",
        tracingText: "OCEAN",
        pageNumber: 1,
        coloringImage: "",
        coloringAdjustments: { threshold: 40, edgeStrength: 3, brightness: 15, contrast: 50, invert: false }
      },
      {
        id: "sea-2",
        title: "The Golden Key",
        type: "mixed",
        layout: "coloring-top-writing-bottom",
        storyText: "Hidden inside a large purple shell, we found a curious golden key. What magical secret chest does this shiny key unlock?",
        tracingText: "SHELL",
        pageNumber: 2,
        coloringImage: "",
        coloringAdjustments: { threshold: 40, edgeStrength: 3, brightness: 15, contrast: 50, invert: false }
      },
      {
        id: "sea-3",
        title: "The Friendly Whale",
        type: "mixed",
        layout: "coloring-top-writing-bottom",
        storyText: "Willy the massive blue whale waves his tail to greet us. He squirts a delightful water fountain high up to celebrate our cute voyage!",
        tracingText: "WHALE",
        pageNumber: 3,
        coloringImage: "",
        coloringAdjustments: { threshold: 40, edgeStrength: 3, brightness: 15, contrast: 50, invert: false }
      }
    ]
  }
];

// Fallback visual outlines of simple vector cartoons represented as SVGs
export const DRAWING_SVG_PLACEHOLDERS: Record<string, string> = {
  "ROCKET": `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" stroke="#333" stroke-width="2" fill="none" class="w-full h-full max-h-56">
    <path d="M50,15 C60,35 60,65 55,80 L45,80 C40,65 40,35 50,15 Z" />
    <path d="M45,80 L35,90 L40,90 L45,80 Z" />
    <path d="M55,80 L65,90 L60,90 L55,80 Z" />
    <circle cx="50" cy="45" r="6" />
    <path d="M48,85 L52,85" />
    <path d="M40,60 C30,65 35,75 42,72" />
    <path d="M60,60 C70,65 65,75 58,72" />
    <path d="M45,90 L50,95 L55,90" stroke-dasharray="2 2" />
  </svg>`,
  "MOON": `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" stroke="#333" stroke-width="2" fill="none" class="w-full h-full max-h-56">
    <path d="M35,20 C60,20 75,40 75,65 C75,78 68,88 58,92 C78,85 85,65 75,45 C65,25 45,15 35,20" />
    <circle cx="28" cy="45" r="4" />
    <circle cx="48" cy="68" r="5" stroke-dasharray="2 2" />
    <circle cx="55" cy="35" r="3" />
    <circle cx="35" cy="75" r="2" />
    <path d="M20,12 L22,18 L28,18 L23,22 L25,28 L20,24 L15,28 L17,22 L12,18 L18,18 Z" />
    <path d="M80,72 L81,75 L84,75 L82,77 L83,80 L80,78 L77,80 L78,77 L76,75 L79,75 Z" />
  </svg>`,
  "STARS": `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" stroke="#333" stroke-width="2" fill="none" class="w-full h-full max-h-56">
    <path d="M50,10 L58,32 L82,32 L62,46 L70,68 L50,54 L30,68 L38,46 L18,32 L42,32 Z" />
    <path d="M20,15 L23,23 L32,23 L25,28 L27,36 L20,31 L13,36 L15,28 L8,23 L17,23 Z" />
    <path d="M80,65 L82,71 L88,71 L83,75 L85,81 L80,77 L75,81 L77,75 L72,71 L78,71 Z" />
  </svg>`,
  "OCEAN": `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" stroke="#333" stroke-width="2" fill="none" class="w-full h-full max-h-56">
    <path d="M10,25 C30,15 40,35 60,25 C80,15 90,30 100,25" />
    <path d="M0,45 C20,35 30,55 50,45 C70,35 80,50 100,45" />
    <path d="M10,65 C30,55 40,75 60,65 C80,55 90,70 100,65" />
    <path d="M30,30 C30,30 45,28 48,35 C42,42 35,35 30,30 Z" />
    <path d="M70,50 C70,50 85,48 88,55 C82,62 75,55 70,50 Z" />
  </svg>`,
  "SHELL": `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" stroke="#333" stroke-width="2" fill="none" class="w-full h-full max-h-56">
    <path d="M50,85 C25,80 15,60 15,45 C15,25 35,15 50,15 C65,15 85,25 85,45 C85,60 75,80 50,85 Z" />
    <line x1="50" y1="15" x2="50" y2="85" />
    <path d="M35,18 C30,35 35,65 50,85" />
    <path d="M65,18 C70,35 65,65 50,85" />
    <path d="M22,28 C20,45 28,70 50,85" />
    <path d="M78,28 C80,45 72,70 50,85" />
    <circle cx="50" cy="50" r="4" />
  </svg>`,
  "WHALE": `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" stroke="#333" stroke-width="2" fill="none" class="w-full h-full max-h-56">
    <path d="M15,55 C15,35 45,30 70,45 C80,40 85,30 90,32 C88,42 85,50 82,53 C75,65 45,68 25,62 L15,65 Z" />
    <path d="M45,35 C42,20 35,22 38,36" />
    <path d="M28,58 C24,65 18,62 21,55" />
    <circle cx="30" cy="48" r="3.5" />
    <path d="M42,55 C48,58 52,58 58,54" />
    <path d="M55,25 L55,10 C50,12 60,12 55,25" stroke-dasharray="2 2" />
  </svg>`
};

export const getVectorOutlineFallback = (word: string): string => {
  const normalized = word.toUpperCase().trim();
  return DRAWING_SVG_PLACEHOLDERS[normalized] || `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" stroke="#333" stroke-width="2" fill="none" class="w-full h-full max-h-56">
    <rect x="20" y="20" width="60" height="60" rx="10" />
    <circle cx="50" cy="50" r="15" />
    <path d="M30,30 L70,70" />
    <path d="M70,30 L30,70" />
  </svg>`;
};
export const generateId = () => Math.random().toString(36).substring(2, 9);
