import type { MealOption } from '../domain/types'

const ingredient = (
  id: string,
  name: string,
  quantity: string,
  householdMeasure: string,
  aliases: string[] = [],
  note?: string,
) => ({ id, name, quantity, householdMeasure, aliases, note })

export const MOCK_MEALS: MealOption[] = [
  {
    id: 'avocado-toast',
    slot: 'breakfast',
    title: 'Tostada de aguacate',
    summary: 'Pan crujiente, aguacate y huevo con un toque de limón.',
    tags: ['fácil', 'proteína'],
    favorite: true,
    availability: 0.9,
    lastEaten: 'Hace 6 días',
    components: [
      {
        id: 'avocado-toast-main',
        label: 'Plato principal',
        ingredients: [
          ingredient('whole-bread', 'Pan integral', '2 rebanadas', '2 piezas', ['pan']),
          ingredient('avocado', 'Aguacate', '70 g', '½ pieza'),
          ingredient('egg', 'Huevo', '1 pieza', '1 pieza'),
        ],
      },
      {
        id: 'avocado-toast-drink',
        label: 'Bebida',
        ingredients: [ingredient('coffee', 'Café', '240 ml', '1 taza', ['cafecito'])],
      },
    ],
  },
  {
    id: 'yogurt-bowl',
    slot: 'breakfast',
    title: 'Bowl de yogur y frutos rojos',
    summary: 'Yogur griego con avena, fruta y semillas.',
    tags: ['fresco'],
    favorite: false,
    availability: 0.75,
    lastEaten: 'Hace 2 días',
    components: [
      {
        id: 'yogurt-bowl-main',
        label: 'Bowl',
        ingredients: [
          ingredient('greek-yogurt', 'Yogur griego', '200 g', '¾ taza', ['yogurt', 'yogur']),
          ingredient('oats', 'Avena', '30 g', '⅓ taza'),
          ingredient('berries', 'Frutos rojos', '100 g', '¾ taza', ['berries']),
        ],
      },
    ],
  },
  {
    id: 'turkey-rolls',
    slot: 'midday',
    title: 'Rollitos de pavo',
    summary: 'Pavo, queso y vegetales para una colación práctica.',
    tags: ['rápido'],
    favorite: false,
    availability: 0.8,
    lastEaten: 'Hace 4 días',
    components: [
      {
        id: 'turkey-rolls-main',
        label: 'Plato principal',
        ingredients: [
          ingredient('turkey', 'Pechuga de pavo', '90 g', '4 rebanadas'),
          ingredient('panela', 'Queso panela', '40 g', '2 rebanadas', ['queso']),
          ingredient('cucumber', 'Pepino', '80 g', '½ pieza'),
        ],
      },
    ],
  },
  {
    id: 'fish-bowl',
    slot: 'lunch',
    title: 'Bowl de pescado',
    summary: 'Pescado blanco con arroz y ensalada fresca.',
    tags: ['proteína'],
    favorite: true,
    availability: 0.6,
    lastEaten: 'Ayer',
    components: [
      {
        id: 'fish-bowl-main',
        label: 'Plato principal',
        ingredients: [ingredient('fish', 'Pescado blanco', '150 g', '1 filete', ['pescado'])],
      },
      {
        id: 'fish-bowl-side',
        label: 'Acompañamiento',
        ingredients: [
          ingredient('rice', 'Arroz cocido', '120 g', '¾ taza'),
          ingredient('greens', 'Ensalada verde', '80 g', '2 tazas'),
        ],
      },
    ],
    note: 'Mock data: las cantidades reales se incorporarán durante la Macrofase B.',
  },
  {
    id: 'chicken-salad',
    slot: 'lunch',
    title: 'Ensalada tibia de pollo',
    summary: 'Pollo a la plancha, hojas verdes y vinagreta sencilla.',
    tags: ['ligero'],
    favorite: false,
    availability: 0.85,
    lastEaten: 'Hace 9 días',
    components: [
      {
        id: 'chicken-salad-main',
        label: 'Plato principal',
        ingredients: [ingredient('chicken', 'Pechuga de pollo', '120 g', '1 pieza')],
      },
      {
        id: 'chicken-salad-dressing',
        label: 'Vinagreta',
        ingredients: [
          ingredient('olive-oil', 'Aceite de oliva', '5 ml', '1 cucharadita'),
          ingredient('lemon', 'Limón', '15 ml', '1 cucharada'),
        ],
      },
    ],
  },
  {
    id: 'apple-cheese',
    slot: 'afternoon',
    title: 'Manzana con queso',
    summary: 'Una combinación simple para media tarde.',
    tags: ['sin cocinar'],
    favorite: false,
    availability: 1,
    lastEaten: 'Hace 3 días',
    components: [
      {
        id: 'apple-cheese-snack',
        label: 'Acompañamiento',
        ingredients: [
          ingredient('apple', 'Manzana', '1 pieza', '1 pieza'),
          ingredient('cottage', 'Queso cottage', '100 g', '½ taza'),
        ],
      },
    ],
  },
  {
    id: 'mushroom-quesadillas',
    slot: 'dinner',
    title: 'Quesadillas de champiñones',
    summary: 'Tortilla de maíz con queso panela y champiñones.',
    tags: ['rápido', 'favorito'],
    favorite: true,
    availability: 0.8,
    lastEaten: 'Hace 8 días',
    components: [
      {
        id: 'mushroom-main',
        label: 'Plato principal',
        ingredients: [
          ingredient('corn-tortilla', 'Tortilla de maíz', '90 g', '3 piezas', ['tortilla']),
          ingredient('mushrooms', 'Champiñones', '183 g', '1½ tazas', ['champis']),
          ingredient('panela-dinner', 'Queso panela', '80 g', '2 rebanadas', ['queso']),
        ],
      },
      {
        id: 'mushroom-salad',
        label: 'Ensalada',
        ingredients: [ingredient('tomato', 'Jitomate', '80 g', '½ pieza', ['tomate'])],
      },
    ],
    note: 'Toma la opción y abre el modo cocina cuando quieras cocinar.',
  },
  {
    id: 'salmon-vegetables',
    slot: 'dinner',
    title: 'Salmón con vegetales',
    summary: 'Salmón al horno con vegetales de temporada.',
    tags: ['completo'],
    favorite: false,
    availability: 0.5,
    lastEaten: 'Hace 12 días',
    components: [
      {
        id: 'salmon-main',
        label: 'Plato principal',
        ingredients: [
          ingredient('salmon', 'Salmón', '140 g', '1 filete'),
          ingredient('vegetables', 'Vegetales mixtos', '160 g', '1½ tazas'),
        ],
      },
    ],
  },
]
