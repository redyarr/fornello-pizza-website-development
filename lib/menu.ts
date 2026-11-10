export type Lang = 'en' | 'ckb'
export type Localized = Record<Lang, string>
export type CategoryId = 'pizza' | 'taglio' | 'coffee' | 'potato'
export type Tag = 'signature' | 'spicy' | 'vegetarian' | 'caffeine'

export type ModifierOption = { id: string; label: Localized; price: number }
export type ModifierGroup = {
  id: string
  label: Localized
  min: number
  max: number
  defaults?: string[]
  alwaysShow?: boolean
  options: ModifierOption[]
}

export type MenuItem = {
  id: string
  category: CategoryId
  name: string
  description?: Localized
  price: number
  tags: Tag[]
  groups: string[]
  image?: string
}

export type Category = {
  id: CategoryId
  title: Localized
  subtitle: Localized
  image: string
  imageAlt: string
}

// These add-on prices are NOT on the printed Fornello menu. They are placeholders
// so the customization flow works end to end — confirm them with the shop before going live.
export const ADDON_PRICES = {
  extraTopping: 1000,
  dip: 500,
  extraShot: 500,
  plantMilk: 500,
}

// Rough kitchen times used only for the takeaway estimate. Also placeholders.
export const PREP_MINUTES: Record<CategoryId, number> = {
  pizza: 15,
  potato: 8,
  taglio: 6,
  coffee: 4,
}

const TOPPINGS: { id: string; label: Localized }[] = [
  { id: 'beef', label: { en: 'Beef', ckb: 'گۆشت' } },
  { id: 'chicken', label: { en: 'Chicken', ckb: 'مریشک' } },
  { id: 'minced', label: { en: 'Minced meat', ckb: 'قیمە' } },
  { id: 'pepperoni', label: { en: 'Pepperoni', ckb: 'پێپەرۆنی' } },
  { id: 'salami', label: { en: 'Salami', ckb: 'سەلەمی' } },
  { id: 'tuna', label: { en: 'Tuna', ckb: 'ماسی' } },
  { id: 'mushroom', label: { en: 'Mushroom', ckb: 'قارچک' } },
  { id: 'olives', label: { en: 'Olives', ckb: 'زەیتون' } },
  { id: 'arugula', label: { en: 'Arugula', ckb: 'جەرجیر' } },
  { id: 'cherry-tomato', label: { en: 'Cherry tomato', ckb: 'تەماتەی بچووک' } },
  { id: 'zucchini', label: { en: 'Zucchini', ckb: 'کولەکە' } },
  { id: 'eggplant', label: { en: 'Eggplant', ckb: 'باینجان' } },
  { id: 'pepper', label: { en: 'Peppers', ckb: 'بیبەر' } },
  { id: 'mozzarella', label: { en: 'Mozzarella', ckb: 'مۆزارێلا' } },
  { id: 'feta', label: { en: 'Feta', ckb: 'پەنیری فیتا' } },
]

export const MODIFIER_GROUPS: Record<string, ModifierGroup> = {
  myFornello: {
    id: 'myFornello',
    label: { en: 'Your three ingredients', ckb: 'سێ کەرەستەکەت' },
    min: 3,
    max: 3,
    alwaysShow: true,
    options: TOPPINGS.map((t) => ({ ...t, price: 0 })),
  },
  crust: {
    id: 'crust',
    label: { en: 'Crust', ckb: 'هەویر' },
    min: 1,
    max: 1,
    defaults: ['classic'],
    options: [
      { id: 'classic', label: { en: 'Classic', ckb: 'ئاسایی' }, price: 0 },
      { id: 'thin', label: { en: 'Thin & crisp', ckb: 'تەنک' }, price: 0 },
      { id: 'well-done', label: { en: 'Well done', ckb: 'زیاتر برژاو' }, price: 0 },
    ],
  },
  extras: {
    id: 'extras',
    label: { en: 'Extra toppings', ckb: 'کەرەستەی زیادە' },
    min: 0,
    max: 4,
    options: TOPPINGS.map((t) => ({ ...t, price: ADDON_PRICES.extraTopping })),
  },
  dips: {
    id: 'dips',
    label: { en: 'Dipping sauces', ckb: 'سۆس' },
    min: 0,
    max: 3,
    options: [
      { id: 'fornello-mayo', label: { en: 'Fornello mayo', ckb: 'مایۆنیسی تایبەتی فۆرنێڵۆ' }, price: ADDON_PRICES.dip },
      { id: 'curry-mayo', label: { en: 'Curry mayo', ckb: 'کاری مایۆنیس' }, price: ADDON_PRICES.dip },
      { id: 'hot-sauce', label: { en: 'Hot sauce', ckb: 'سۆسی تون' }, price: ADDON_PRICES.dip },
      { id: 'pesto', label: { en: 'Pesto', ckb: 'پێستۆ' }, price: ADDON_PRICES.dip },
      { id: 'alfredo', label: { en: 'Alfredo', ckb: 'سۆسی ئەلفرێدۆ' }, price: ADDON_PRICES.dip },
    ],
  },
  potatoSize: {
    id: 'potatoSize',
    label: { en: 'Size', ckb: 'قەبارە' },
    min: 1,
    max: 1,
    defaults: ['small'],
    alwaysShow: true,
    options: [
      { id: 'small', label: { en: 'Small', ckb: 'بچووک' }, price: 0 },
      { id: 'large', label: { en: 'Large', ckb: 'گەورە' }, price: 500 },
    ],
  },
  temperature: {
    id: 'temperature',
    label: { en: 'Hot or iced', ckb: 'گەرم یان سارد' },
    min: 1,
    max: 1,
    defaults: ['hot'],
    alwaysShow: true,
    options: [
      { id: 'hot', label: { en: 'Hot', ckb: 'گەرم' }, price: 0 },
      { id: 'iced', label: { en: 'Iced', ckb: 'سارد' }, price: 0 },
    ],
  },
  milk: {
    id: 'milk',
    label: { en: 'Milk', ckb: 'شیر' },
    min: 1,
    max: 1,
    defaults: ['whole'],
    options: [
      { id: 'whole', label: { en: 'Whole milk', ckb: 'شیری ئاسایی' }, price: 0 },
      { id: 'low-fat', label: { en: 'Low-fat milk', ckb: 'شیری کەم چەوری' }, price: 0 },
      { id: 'oat', label: { en: 'Oat milk', ckb: 'شیری یولاف' }, price: ADDON_PRICES.plantMilk },
      { id: 'almond', label: { en: 'Almond milk', ckb: 'شیری بادەم' }, price: ADDON_PRICES.plantMilk },
    ],
  },
  shots: {
    id: 'shots',
    label: { en: 'Extra espresso', ckb: 'ئێسپرێسۆی زیادە' },
    min: 1,
    max: 1,
    defaults: ['none'],
    options: [
      { id: 'none', label: { en: 'No extra shot', ckb: 'بێ زیادە' }, price: 0 },
      { id: 'one', label: { en: '+1 shot', ckb: '+1 شۆت' }, price: ADDON_PRICES.extraShot },
      { id: 'two', label: { en: '+2 shots', ckb: '+2 شۆت' }, price: ADDON_PRICES.extraShot * 2 },
    ],
  },
  sweetness: {
    id: 'sweetness',
    label: { en: 'Sweetness', ckb: 'شیرینی' },
    min: 1,
    max: 1,
    defaults: ['regular'],
    options: [
      { id: 'none', label: { en: 'No sugar', ckb: 'بێ شەکر' }, price: 0 },
      { id: 'less', label: { en: 'Less sweet', ckb: 'کەم شیرین' }, price: 0 },
      { id: 'regular', label: { en: 'Regular', ckb: 'ئاسایی' }, price: 0 },
      { id: 'extra', label: { en: 'Extra sweet', ckb: 'زۆر شیرین' }, price: 0 },
    ],
  },
}

export const CATEGORIES: Category[] = [
  {
    id: 'pizza',
    title: { en: 'Pizza', ckb: 'پیتزا' },
    subtitle: { en: '30 cm · every pizza 6,500 IQD', ckb: '30 سم · هەر پیتزایەک 6,500 IQD' },
    image: '/images/hero-pizza.png',
    imageAlt: 'A 30 cm pizza with pepperoni, cherry tomatoes and basil on parchment paper',
  },
  {
    id: 'taglio',
    title: { en: 'Pizza al Taglio', ckb: 'پیتزای پارچە' },
    subtitle: { en: 'By the slice', ckb: 'بە پارچە' },
    image: '/images/al-taglio.png',
    imageAlt: 'Three rectangular pizza al taglio slices on parchment paper',
  },
  {
    id: 'coffee',
    title: { en: 'Coffee', ckb: 'قاوە' },
    subtitle: { en: 'Hot & iced drinks', ckb: 'خواردنەوەی گەرم و سارد' },
    image: '/images/coffee.png',
    imageAlt: 'A cappuccino with latte art, an iced latte and an espresso',
  },
  {
    id: 'potato',
    title: { en: 'Potato', ckb: 'پەتاتە' },
    subtitle: { en: 'Small 1,500 · Large 2,000 IQD', ckb: 'بچووک 1,500 · گەورە 2,000 IQD' },
    image: '/images/potato.png',
    imageAlt: 'Crispy fries topped with grated cheese and Fornello mayo',
  },
]

const PIZZA_GROUPS = ['crust', 'extras', 'dips']
const ESPRESSO_GROUPS = ['shots', 'sweetness']
const MILK_COFFEE_GROUPS = ['temperature', 'milk', 'shots', 'sweetness']

export const MENU: MenuItem[] = [
  {
    id: 'fornello-beef',
    category: 'pizza',
    name: 'Fornello Beef',
    description: { en: 'Beef, cheese, arugula', ckb: 'گۆشت، پەنیر، جەرجیر' },
    price: 6500,
    tags: ['signature'],
    groups: PIZZA_GROUPS,
  },
  {
    id: 'chicken-italian',
    category: 'pizza',
    name: 'Chicken Italian',
    description: { en: 'Chicken, mushroom, curry mayo', ckb: 'مریشک، قارچک، کاری مایۆنیس' },
    price: 6500,
    tags: [],
    groups: PIZZA_GROUPS,
  },
  {
    id: 'tuna-roma',
    category: 'pizza',
    name: 'Tuna Roma',
    description: { en: 'Tuna, olives, mozzarella', ckb: 'ماسی، زەیتون، مۆزاریلا' },
    price: 6500,
    tags: [],
    groups: PIZZA_GROUPS,
  },
  {
    id: 'fornello-special',
    category: 'pizza',
    name: 'Fornello Special',
    description: { en: 'Minced meat, pepperoni, cherry tomatoes', ckb: 'قیمە، پێپەرۆنی، تەماتەی بچووک' },
    price: 6500,
    tags: ['signature'],
    groups: PIZZA_GROUPS,
  },
  {
    id: 'fornello-spicy',
    category: 'pizza',
    name: 'Fornello Spicy',
    description: { en: 'Salami, beef, hot sauce', ckb: 'سەلەمی، گۆشت، سۆسی تون' },
    price: 6500,
    tags: ['signature', 'spicy'],
    groups: PIZZA_GROUPS,
  },
  {
    id: 'pepperoni',
    category: 'pizza',
    name: 'Pepperoni Pizza',
    description: { en: 'Pepperoni', ckb: 'پێپەرۆنی' },
    price: 6500,
    tags: [],
    groups: PIZZA_GROUPS,
  },
  {
    id: 'alfredo',
    category: 'pizza',
    name: 'Alfredo Pizza',
    description: { en: 'Chicken, mushroom, olives, alfredo sauce', ckb: 'مریشک، قارچک، زەیتون، سۆسی ئەلفرێدۆ' },
    price: 6500,
    tags: [],
    groups: PIZZA_GROUPS,
  },
  {
    id: 'fornello-veggie',
    category: 'pizza',
    name: 'Fornello Veggie',
    description: { en: 'Zucchini, olives, mushroom', ckb: 'کولەکە، زەیتون، قارچک' },
    price: 6500,
    tags: ['signature', 'vegetarian'],
    groups: PIZZA_GROUPS,
  },
  {
    id: 'my-fornello',
    category: 'pizza',
    name: 'My Fornello',
    description: { en: 'Three ingredients of your choice', ckb: 'سێ کەرەستە بە خواستی خۆت' },
    price: 6500,
    tags: ['signature'],
    groups: ['myFornello', ...PIZZA_GROUPS],
  },

  {
    id: 'parma',
    category: 'taglio',
    name: 'Parma',
    description: { en: 'Minced meat, tomato', ckb: 'قیمە + تەماتە' },
    price: 2000,
    tags: [],
    groups: ['dips'],
  },
  {
    id: 'napolitano',
    category: 'taglio',
    name: 'Napolitano',
    description: { en: 'Burrata, basil, tomato', ckb: 'بوراتا + ڕێحان + تەماتە' },
    price: 2000,
    tags: ['vegetarian'],
    groups: ['dips'],
  },
  {
    id: 'bolzano',
    category: 'taglio',
    name: 'Bolzano',
    description: { en: 'Beef, arugula', ckb: 'گۆشت + جەرجیر' },
    price: 2000,
    tags: [],
    groups: ['dips'],
  },
  {
    id: 'como',
    category: 'taglio',
    name: 'Como',
    description: { en: 'Chicken, mushroom, feta', ckb: 'مریشک + قارچک + پەنیری فیتا' },
    price: 2000,
    tags: [],
    groups: ['dips'],
  },
  {
    id: 'rooma',
    category: 'taglio',
    name: 'Rooma',
    description: { en: 'Salami, olives, pesto', ckb: 'سەلەمی + زەیتون + پێستۆ' },
    price: 1500,
    tags: [],
    groups: ['dips'],
  },
  {
    id: 'verona',
    category: 'taglio',
    name: 'Verona',
    description: { en: 'Pepperoni', ckb: 'پێپەرۆنی' },
    price: 1500,
    tags: [],
    groups: ['dips'],
  },
  {
    id: 'bari',
    category: 'taglio',
    name: 'Bari',
    description: { en: 'Eggplant, mushroom, peppers', ckb: 'باینجان + قارچک + بیبەر' },
    price: 1500,
    tags: ['vegetarian'],
    groups: ['dips'],
  },
  {
    id: 'sibar',
    category: 'taglio',
    name: 'Sibar',
    description: { en: 'Tuna, tomato', ckb: 'ماسی + تەماتە' },
    price: 1500,
    tags: [],
    groups: ['dips'],
  },
  {
    id: 'milano',
    category: 'taglio',
    name: 'Milano',
    description: { en: 'Potato', ckb: 'پەتاتە' },
    price: 1000,
    tags: ['vegetarian'],
    groups: ['dips'],
  },
  {
    id: 'savona',
    category: 'taglio',
    name: 'Savona',
    description: { en: 'Mozzarella', ckb: 'مۆزارێلا' },
    price: 1000,
    tags: ['vegetarian'],
    groups: ['dips'],
  },

  {
    id: 'espresso',
    category: 'coffee',
    name: 'Espresso',
    description: { en: 'Rich Italian single or double espresso shot', ckb: 'شۆتی ئێسپرێسۆی ئیتاڵی چڕ و بەتام' },
    price: 2000,
    tags: ['caffeine'],
    groups: ESPRESSO_GROUPS,
  },
  {
    id: 'long-espresso',
    category: 'coffee',
    name: 'Long Espresso',
    description: { en: 'Double shot lungo espresso', ckb: 'دۆبڵ ئێسپرێسۆی درێژکراوە و سووکتر' },
    price: 3000,
    tags: ['caffeine'],
    groups: ESPRESSO_GROUPS,
  },
  {
    id: 'cappuccino',
    category: 'coffee',
    name: 'Cappuccino',
    description: { en: 'Hot or iced', ckb: 'گەرم یان سارد' },
    price: 3500,
    tags: ['caffeine'],
    groups: MILK_COFFEE_GROUPS,
  },
  {
    id: 'latte',
    category: 'coffee',
    name: 'Latte Macchiato',
    description: { en: 'Hot, or as an iced latte', ckb: 'گەرم، یان وەک ئایس لاتێ' },
    price: 3500,
    tags: ['caffeine'],
    groups: MILK_COFFEE_GROUPS,
  },
  {
    id: 'mocha',
    category: 'coffee',
    name: 'Mocha',
    description: { en: 'Hot or iced', ckb: 'گەرم یان سارد' },
    price: 3500,
    tags: ['caffeine'],
    groups: MILK_COFFEE_GROUPS,
  },
  {
    id: 'iced-coffee',
    category: 'coffee',
    name: 'Iced Coffee',
    description: { en: 'Chilled coffee over ice', ckb: 'قاوەی سارد بە سەهۆڵ' },
    price: 3500,
    tags: ['caffeine'],
    groups: ['milk', 'shots', 'sweetness'],
  },
  {
    id: 'iced-americano',
    category: 'coffee',
    name: 'Iced Americano',
    description: { en: 'Espresso with cold water and ice', ckb: 'ئەمێریکانۆ بە ئێسپرێسۆ، ئاوی سارد و سەهۆڵ' },
    price: 3500,
    tags: ['caffeine'],
    groups: ESPRESSO_GROUPS,
  },
  {
    id: 'chocolate',
    category: 'coffee',
    name: 'Hot Chocolate',
    description: { en: 'Rich hot chocolate with milk', ckb: 'شۆکۆلاتەی گەرمی چڕ بە شیری کەفدار' },
    price: 3500,
    tags: [],
    groups: ['milk', 'sweetness'],
  },
  {
    id: 'milk',
    category: 'coffee',
    name: 'Milk',
    description: { en: 'Warm or cold fresh milk', ckb: 'شیری تازەی گەرم یان سارد' },
    price: 3500,
    tags: [],
    groups: ['sweetness'],
  },
  {
    id: 'karak-tea',
    category: 'coffee',
    name: 'Karak Tea',
    description: { en: 'Spiced traditional milk tea', ckb: 'چای کەرەکی بەتام بە بەهارات و شیر' },
    price: 3500,
    tags: ['caffeine'],
    groups: ['sweetness'],
  },
  {
    id: 'lemon-tea',
    category: 'coffee',
    name: 'Lemon Tea',
    description: { en: 'Black tea with fresh lemon', ckb: 'چای لیمۆی تازە و گەرم' },
    price: 3500,
    tags: ['caffeine'],
    groups: ['sweetness'],
  },

  {
    id: 'crispy-potato',
    category: 'potato',
    name: 'Fornello Crispy Potato',
    description: { en: 'Fornello special mayo, cheese', ckb: 'مایۆنیسی تایبەتی فۆرنێڵۆ، پەنیر' },
    price: 1500,
    tags: ['signature', 'vegetarian'],
    groups: ['potatoSize', 'dips'],
  },
]

const MENU_BY_ID = new Map(MENU.map((item) => [item.id, item]))

export type MenuItemOverride = {
  name?: string
  price?: number
  description?: Localized
  category?: CategoryId
  tags?: Tag[]
  image?: string
  soldOut?: boolean
  deleted?: boolean
}

export type CustomMenuItem = MenuItem & {
  custom: true
  soldOut?: boolean
}

export type MenuStoreData = {
  customItems: CustomMenuItem[]
  overrides: Record<string, MenuItemOverride>
}

export const MENU_STORAGE_KEY = 'fornello_menu_store_v1'

export function getStoredMenuData(): MenuStoreData {
  if (typeof window === 'undefined') return { customItems: [], overrides: {} }
  try {
    const raw = localStorage.getItem(MENU_STORAGE_KEY)
    if (!raw) return { customItems: [], overrides: {} }
    return JSON.parse(raw) as MenuStoreData
  } catch {
    return { customItems: [], overrides: {} }
  }
}

export function saveStoredMenuData(data: MenuStoreData): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(data))
    window.dispatchEvent(new Event('fornello_menu_updated'))
  } catch {
    // quota or privacy sandbox fallback
  }
}

export function getMergedMenu(data?: MenuStoreData): (MenuItem & { soldOut?: boolean; custom?: boolean })[] {
  const store = data ?? getStoredMenuData()
  const baseMerged = MENU.filter((item) => !store.overrides[item.id]?.deleted).map((item) => {
    const override = store.overrides[item.id]
    if (!override) return item
    const merged: MenuItem & { soldOut?: boolean; custom?: boolean } = {
      ...item,
      name: override.name ?? item.name,
      price: override.price !== undefined ? override.price : item.price,
      description: override.description ?? item.description,
      category: override.category ?? item.category,
      tags: override.tags ?? item.tags,
      image: override.image ?? item.image,
      soldOut: Boolean(override.soldOut),
    }
    MENU_BY_ID.set(merged.id, merged)
    return merged
  })
  for (const custom of store.customItems) {
    MENU_BY_ID.set(custom.id, custom)
  }
  return [...baseMerged, ...store.customItems]
}

export function getItem(
  id: string,
  menuList?: (MenuItem & { soldOut?: boolean; custom?: boolean })[],
): (MenuItem & { soldOut?: boolean; custom?: boolean }) | undefined {
  if (menuList) {
    const match = menuList.find((m) => m.id === id)
    if (match) return match
  }
  return MENU_BY_ID.get(id)
}
