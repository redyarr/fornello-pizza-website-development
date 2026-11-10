import publishedDefault from './menu-published.json'

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
  { id: 'beef', label: { en: 'Beef', ckb: 'گۆشتی گوێرەکە' } },
  { id: 'chicken', label: { en: 'Chicken', ckb: 'مریشک' } },
  { id: 'minced', label: { en: 'Minced meat', ckb: 'قیمە' } },
  { id: 'pepperoni', label: { en: 'Pepperoni', ckb: 'پێپەرۆنی' } },
  { id: 'salami', label: { en: 'Salami', ckb: 'سەلامی' } },
  { id: 'tuna', label: { en: 'Tuna', ckb: 'ماسی توونە' } },
  { id: 'mushroom', label: { en: 'Mushroom', ckb: 'قارچک' } },
  { id: 'olives', label: { en: 'Olives', ckb: 'زەیتوون' } },
  { id: 'arugula', label: { en: 'Arugula', ckb: 'جەرجیر' } },
  { id: 'cherry-tomato', label: { en: 'Cherry tomato', ckb: 'تەماتەی چێری' } },
  { id: 'zucchini', label: { en: 'Zucchini', ckb: 'کولەکە' } },
  { id: 'eggplant', label: { en: 'Eggplant', ckb: 'باینجان' } },
  { id: 'pepper', label: { en: 'Peppers', ckb: 'بیبەر' } },
  { id: 'mozzarella', label: { en: 'Mozzarella', ckb: 'پەنیری مۆزارێلا' } },
  { id: 'feta', label: { en: 'Feta', ckb: 'پەنیری فێتا' } },
]

export const MODIFIER_GROUPS: Record<string, ModifierGroup> = {
  myFornello: {
    id: 'myFornello',
    label: { en: 'Your three ingredients', ckb: 'سێ پێکهاتەکەت هەڵبژێرە' },
    min: 3,
    max: 3,
    alwaysShow: true,
    options: TOPPINGS.map((t) => ({ ...t, price: 0 })),
  },
  crust: {
    id: 'crust',
    label: { en: 'Crust', ckb: 'جۆری هەویر' },
    min: 1,
    max: 1,
    defaults: ['classic'],
    options: [
      { id: 'classic', label: { en: 'Classic', ckb: 'ئاسایی (کلاسیک)' } , price: 0 },
      { id: 'thin', label: { en: 'Thin & crisp', ckb: 'تەنک و قرچۆک' }, price: 0 },
      { id: 'well-done', label: { en: 'Well done', ckb: 'زیاتر برژاو' }, price: 0 },
    ],
  },
  extras: {
    id: 'extras',
    label: { en: 'Extra toppings', ckb: 'پێکهاتەی زیادە' },
    min: 0,
    max: 4,
    options: TOPPINGS.map((t) => ({ ...t, price: ADDON_PRICES.extraTopping })),
  },
  dips: {
    id: 'dips',
    label: { en: 'Dipping sauces', ckb: 'سۆسەکان' },
    min: 0,
    max: 3,
    options: [
      { id: 'fornello-mayo', label: { en: 'Fornello mayo', ckb: 'مایۆنیزی تایبەتی فۆڕنێڵۆ' }, price: ADDON_PRICES.dip },
      { id: 'curry-mayo', label: { en: 'Curry mayo', ckb: 'مایۆنیزی کاری' }, price: ADDON_PRICES.dip },
      { id: 'hot-sauce', label: { en: 'Hot sauce', ckb: 'سۆسی توون' }, price: ADDON_PRICES.dip },
      { id: 'pesto', label: { en: 'Pesto', ckb: 'سۆسی پێستۆ' }, price: ADDON_PRICES.dip },
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
      { id: 'iced', label: { en: 'Iced', ckb: 'سارد (ئایس)' }, price: 0 },
    ],
  },
  milk: {
    id: 'milk',
    label: { en: 'Milk', ckb: 'جۆری شیر' },
    min: 1,
    max: 1,
    defaults: ['whole'],
    options: [
      { id: 'whole', label: { en: 'Whole milk', ckb: 'شیری ئاسایی' }, price: 0 },
      { id: 'low-fat', label: { en: 'Low-fat milk', ckb: 'شیری کەم چەوری' }, price: 0 },
      { id: 'oat', label: { en: 'Oat milk', ckb: 'شیری شۆفان' }, price: ADDON_PRICES.plantMilk },
      { id: 'almond', label: { en: 'Almond milk', ckb: 'شیری بادەم' }, price: ADDON_PRICES.plantMilk },
    ],
  },
  shots: {
    id: 'shots',
    label: { en: 'Extra espresso', ckb: 'شۆتی ئێسپرێسۆی زیادە' },
    min: 1,
    max: 1,
    defaults: ['none'],
    options: [
      { id: 'none', label: { en: 'No extra shot', ckb: 'بێ شۆتی زیادە' }, price: 0 },
      { id: 'one', label: { en: '+1 shot', ckb: '+١ شۆت' }, price: ADDON_PRICES.extraShot },
      { id: 'two', label: { en: '+2 shots', ckb: '+٢ شۆت' }, price: ADDON_PRICES.extraShot * 2 },
    ],
  },
  sweetness: {
    id: 'sweetness',
    label: { en: 'Sweetness', ckb: 'ڕێژەی شەکر' },
    min: 1,
    max: 1,
    defaults: ['regular'],
    options: [
      { id: 'none', label: { en: 'No sugar', ckb: 'بێ شەکر' }, price: 0 },
      { id: 'less', label: { en: 'Less sweet', ckb: 'کەم شەکر' }, price: 0 },
      { id: 'regular', label: { en: 'Regular', ckb: 'ئاسایی' }, price: 0 },
      { id: 'extra', label: { en: 'Extra sweet', ckb: 'شیرین (شەکری زیادە)' }, price: 0 },
    ],
  },
}

export const CATEGORIES: Category[] = [
  {
    id: 'pizza',
    title: { en: 'Pizza', ckb: 'پیتزا' },
    subtitle: { en: '30 cm · every pizza 6,500 IQD', ckb: 'قەبارەی ٣٠ سم · هەر پیتزایەک ٦,٥٠٠ دینار' },
    image: '/images/hero-pizza.png',
    imageAlt: 'A 30 cm pizza with pepperoni, cherry tomatoes and basil on parchment paper',
  },
  {
    id: 'taglio',
    title: { en: 'Pizza al Taglio', ckb: 'پیتزای پارچە' },
    subtitle: { en: 'By the slice', ckb: 'ئامادەکراو بە پارچە' },
    image: '/images/al-taglio.png',
    imageAlt: 'Three rectangular pizza al taglio slices on parchment paper',
  },
  {
    id: 'coffee',
    title: { en: 'Coffee', ckb: 'قاوە و خواردنەوە' },
    subtitle: { en: 'Hot & iced drinks', ckb: 'خواردنەوەی گەرم و سارد' },
    image: '/images/coffee.png',
    imageAlt: 'A cappuccino with latte art, an iced latte and an espresso',
  },
  {
    id: 'potato',
    title: { en: 'Potato', ckb: 'پەتاتەی فۆڕنێڵۆ' },
    subtitle: { en: 'Small 1,500 · Large 2,000 IQD', ckb: 'بچووک ١,٥٠٠ · گەورە ٢,٠٠٠ دینار' },
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
    description: { en: 'Beef, cheese, arugula', ckb: 'گۆشتی گوێرەکە، پەنیر، جەرجیر' },
    price: 6500,
    tags: ['signature'],
    groups: PIZZA_GROUPS,
  },
  {
    id: 'chicken-italian',
    category: 'pizza',
    name: 'Chicken Italian',
    description: { en: 'Chicken, mushroom, curry mayo', ckb: 'مریشک، قارچک، مایۆنیزی کاری' },
    price: 6500,
    tags: [],
    groups: PIZZA_GROUPS,
  },
  {
    id: 'tuna-roma',
    category: 'pizza',
    name: 'Tuna Roma',
    description: { en: 'Tuna, olives, mozzarella', ckb: 'ماسی توونە، زەیتوون، پەنیری مۆزارێلا' },
    price: 6500,
    tags: [],
    groups: PIZZA_GROUPS,
  },
  {
    id: 'fornello-special',
    category: 'pizza',
    name: 'Fornello Special',
    description: { en: 'Minced meat, pepperoni, cherry tomatoes', ckb: 'قیمە، پێپەرۆنی، تەماتەی چێری' },
    price: 6500,
    tags: ['signature'],
    groups: PIZZA_GROUPS,
  },
  {
    id: 'fornello-spicy',
    category: 'pizza',
    name: 'Fornello Spicy',
    description: { en: 'Salami, beef, hot sauce', ckb: 'سەلامی، گۆشت، سۆسی توون' },
    price: 6500,
    tags: ['signature', 'spicy'],
    groups: PIZZA_GROUPS,
  },
  {
    id: 'pepperoni',
    category: 'pizza',
    name: 'Pepperoni Pizza',
    description: { en: 'Pepperoni', ckb: 'پێپەرۆنی و پەنیری مۆزارێلا' },
    price: 6500,
    tags: [],
    groups: PIZZA_GROUPS,
  },
  {
    id: 'alfredo',
    category: 'pizza',
    name: 'Alfredo Pizza',
    description: { en: 'Chicken, mushroom, olives, alfredo sauce', ckb: 'مریشک، قارچک، زەیتوون، سۆسی ئەلفرێدۆ' },
    price: 6500,
    tags: [],
    groups: PIZZA_GROUPS,
  },
  {
    id: 'fornello-veggie',
    category: 'pizza',
    name: 'Fornello Veggie',
    description: { en: 'Zucchini, olives, mushroom', ckb: 'کولەکە، زەیتوون، قارچک' },
    price: 6500,
    tags: ['signature', 'vegetarian'],
    groups: PIZZA_GROUPS,
  },
  {
    id: 'my-fornello',
    category: 'pizza',
    name: 'My Fornello',
    description: { en: 'Three ingredients of your choice', ckb: 'سێ پێکهاتە بە هەڵبژاردنی خۆت' },
    price: 6500,
    tags: ['signature'],
    groups: ['myFornello', ...PIZZA_GROUPS],
  },

  {
    id: 'parma',
    category: 'taglio',
    name: 'Parma',
    description: { en: 'Minced meat, tomato', ckb: 'قیمە، تەماتە' },
    price: 2000,
    tags: [],
    groups: ['dips'],
  },
  {
    id: 'napolitano',
    category: 'taglio',
    name: 'Napolitano',
    description: { en: 'Burrata, basil, tomato', ckb: 'پەنیری بوراتا، ڕێحانە، تەماتە' },
    price: 2000,
    tags: ['vegetarian'],
    groups: ['dips'],
  },
  {
    id: 'bolzano',
    category: 'taglio',
    name: 'Bolzano',
    description: { en: 'Beef, arugula', ckb: 'گۆشتی گوێرەکە، جەرجیر' },
    price: 2000,
    tags: [],
    groups: ['dips'],
  },
  {
    id: 'como',
    category: 'taglio',
    name: 'Como',
    description: { en: 'Chicken, mushroom, feta', ckb: 'مریشک، قارچک، پەنیری فێتا' },
    price: 2000,
    tags: [],
    groups: ['dips'],
  },
  {
    id: 'rooma',
    category: 'taglio',
    name: 'Rooma',
    description: { en: 'Salami, olives, pesto', ckb: 'سەلامی، زەیتوون، سۆسی پێستۆ' },
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
    description: { en: 'Eggplant, mushroom, peppers', ckb: 'باینجان، قارچک، بیبەر' },
    price: 1500,
    tags: ['vegetarian'],
    groups: ['dips'],
  },
  {
    id: 'sibar',
    category: 'taglio',
    name: 'Sibar',
    description: { en: 'Tuna, tomato', ckb: 'ماسی توونە، تەماتە' },
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
    description: { en: 'Mozzarella', ckb: 'پەنیری مۆزارێلا' },
    price: 1000,
    tags: ['vegetarian'],
    groups: ['dips'],
  },

  {
    id: 'espresso',
    category: 'coffee',
    name: 'Espresso',
    description: { en: 'Rich Italian single or double espresso shot', ckb: 'شۆتی ئێسپرێسۆی ئیتاڵیی ڕەسەن و بەتام' },
    price: 2000,
    tags: ['caffeine'],
    groups: ESPRESSO_GROUPS,
  },
  {
    id: 'long-espresso',
    category: 'coffee',
    name: 'Long Espresso',
    description: { en: 'Double shot lungo espresso', ckb: 'دۆبڵ ئێسپرێسۆی درێژکراوە (لۆنگۆ)' },
    price: 3000,
    tags: ['caffeine'],
    groups: ESPRESSO_GROUPS,
  },
  {
    id: 'cappuccino',
    category: 'coffee',
    name: 'Cappuccino',
    description: { en: 'Hot or iced', ckb: 'کاپوچینۆ بە کەفی شیر · گەرم یان سارد' },
    price: 3500,
    tags: ['caffeine'],
    groups: MILK_COFFEE_GROUPS,
  },
  {
    id: 'latte',
    category: 'coffee',
    name: 'Latte Macchiato',
    description: { en: 'Hot, or as an iced latte', ckb: 'لاتێ ماکیاتۆ · گەرم یان ئایس لاتێ' },
    price: 3500,
    tags: ['caffeine'],
    groups: MILK_COFFEE_GROUPS,
  },
  {
    id: 'mocha',
    category: 'coffee',
    name: 'Mocha',
    description: { en: 'Hot or iced', ckb: 'مۆکا بە تێکەڵەی قاوە و شۆکۆلاتە · گەرم یان سارد' },
    price: 3500,
    tags: ['caffeine'],
    groups: MILK_COFFEE_GROUPS,
  },
  {
    id: 'iced-coffee',
    category: 'coffee',
    name: 'Iced Coffee',
    description: { en: 'Chilled coffee over ice', ckb: 'قاوەی سارد بە شیر و سەهۆڵ' },
    price: 3500,
    tags: ['caffeine'],
    groups: ['milk', 'shots', 'sweetness'],
  },
  {
    id: 'iced-americano',
    category: 'coffee',
    name: 'Iced Americano',
    description: { en: 'Espresso with cold water and ice', ckb: 'ئایس ئەمێریکانۆ بە ئێسپرێسۆ و سەهۆڵ' },
    price: 3500,
    tags: ['caffeine'],
    groups: ESPRESSO_GROUPS,
  },
  {
    id: 'chocolate',
    category: 'coffee',
    name: 'Hot Chocolate',
    description: { en: 'Rich hot chocolate with milk', ckb: 'شۆکۆلاتەی گەرمی خەست بە شیری تازە' },
    price: 3500,
    tags: [],
    groups: ['milk', 'sweetness'],
  },
  {
    id: 'milk',
    category: 'coffee',
    name: 'Milk',
    description: { en: 'Warm or cold fresh milk', ckb: 'شیری تازە · گەرم یان سارد' },
    price: 3500,
    tags: [],
    groups: ['sweetness'],
  },
  {
    id: 'karak-tea',
    category: 'coffee',
    name: 'Karak Tea',
    description: { en: 'Spiced traditional milk tea', ckb: 'چای کەرەک بە هێل و شیر' },
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
    description: { en: 'Fornello special mayo, cheese', ckb: 'پەتاتەی قرچۆک بە پەنیر و مایۆنیزی تایبەتی فۆڕنێڵۆ' },
    price: 1500,
    tags: ['signature', 'vegetarian'],
    groups: ['potatoSize', 'dips'],
  },
]

const MENU_BY_ID = new Map(MENU.map((item) => [item.id, item]))

function cloneModifierGroups(groups: Record<string, ModifierGroup>): Record<string, ModifierGroup> {
  return Object.fromEntries(
    Object.entries(groups).map(([key, group]) => [
      key,
      {
        ...group,
        label: { ...group.label },
        defaults: group.defaults ? [...group.defaults] : undefined,
        options: group.options.map((opt) => ({
          ...opt,
          label: { ...opt.label },
        })),
      },
    ]),
  )
}

function cloneCategories(cats: Category[]): Category[] {
  return cats.map((cat) => ({
    ...cat,
    title: { ...cat.title },
    subtitle: { ...cat.subtitle },
  }))
}

export const DEFAULT_MODIFIER_GROUPS: Record<string, ModifierGroup> = cloneModifierGroups(MODIFIER_GROUPS)
export const DEFAULT_CATEGORIES: Category[] = cloneCategories(CATEGORIES)

export type MenuItemOverride = {
  name?: string
  price?: number
  description?: Localized
  category?: CategoryId
  tags?: Tag[]
  groups?: string[]
  image?: string
  soldOut?: boolean
  deleted?: boolean
}

export type CustomMenuItem = MenuItem & {
  custom: true
  soldOut?: boolean
}

export type CategoryOverride = {
  title?: Localized
  subtitle?: Localized
}

export type MenuStoreData = {
  customItems: CustomMenuItem[]
  overrides: Record<string, MenuItemOverride>
  modifierGroups?: Record<string, ModifierGroup>
  categoryOverrides?: Partial<Record<CategoryId, CategoryOverride>>
}

export const MENU_STORAGE_KEY = 'fornello_menu_store_v1'

const DEFAULT_PUBLISHED_STORE: MenuStoreData = {
  customItems: Array.isArray((publishedDefault as MenuStoreData).customItems)
    ? (publishedDefault as MenuStoreData).customItems
    : [],
  overrides:
    typeof (publishedDefault as MenuStoreData).overrides === 'object' && (publishedDefault as MenuStoreData).overrides
      ? (publishedDefault as MenuStoreData).overrides
      : {},
  modifierGroups: (publishedDefault as MenuStoreData).modifierGroups,
  categoryOverrides: (publishedDefault as MenuStoreData).categoryOverrides,
}

export function getStoredMenuData(): MenuStoreData {
  if (typeof window === 'undefined') return DEFAULT_PUBLISHED_STORE
  try {
    const raw = localStorage.getItem(MENU_STORAGE_KEY)
    if (!raw) return DEFAULT_PUBLISHED_STORE
    return JSON.parse(raw) as MenuStoreData
  } catch {
    return DEFAULT_PUBLISHED_STORE
  }
}

export async function syncRemoteMenuData(): Promise<MenuStoreData | null> {
  if (typeof window === 'undefined') return null
  try {
    const res = await fetch('/api/menu', { cache: 'no-store' })
    if (!res.ok) return null
    const remote = (await res.json()) as MenuStoreData
    if (remote && typeof remote === 'object' && Array.isArray(remote.customItems)) {
      const currentRaw = localStorage.getItem(MENU_STORAGE_KEY)
      const nextRaw = JSON.stringify(remote)
      if (currentRaw !== nextRaw) {
        syncDynamicMenuGlobals(remote)
        localStorage.setItem(MENU_STORAGE_KEY, nextRaw)
        window.dispatchEvent(new Event('fornello_menu_updated'))
      }
      return remote
    }
    return null
  } catch {
    return null
  }
}

export function syncDynamicMenuGlobals(data?: MenuStoreData): void {
  const store = data ?? getStoredMenuData()

  // 1. Synchronize MODIFIER_GROUPS in-place so all consumers see live sauces, toppings & options
  const freshGroups = cloneModifierGroups(DEFAULT_MODIFIER_GROUPS)
  if (store.modifierGroups) {
    for (const [key, customGroup] of Object.entries(store.modifierGroups)) {
      if (customGroup && Array.isArray(customGroup.options)) {
        freshGroups[key] = {
          ...customGroup,
          label: { ...customGroup.label },
          defaults: customGroup.defaults ? [...customGroup.defaults] : undefined,
          options: customGroup.options.map((o) => ({
            ...o,
            label: { ...o.label },
          })),
        }
      }
    }
  }
  for (const existingKey of Object.keys(MODIFIER_GROUPS)) {
    if (!(existingKey in freshGroups)) {
      delete MODIFIER_GROUPS[existingKey]
    }
  }
  for (const [key, group] of Object.entries(freshGroups)) {
    MODIFIER_GROUPS[key] = group
  }

  // 2. Synchronize CATEGORIES in-place so category titles & subtitles stay updated
  const freshCats = cloneCategories(DEFAULT_CATEGORIES)
  for (let i = 0; i < freshCats.length; i++) {
    const cat = freshCats[i]
    const override = store.categoryOverrides?.[cat.id]
    CATEGORIES[i] = {
      ...cat,
      title: override?.title ? { ...cat.title, ...override.title } : cat.title,
      subtitle: override?.subtitle ? { ...cat.subtitle, ...override.subtitle } : cat.subtitle,
    }
  }
}

export function getMergedModifierGroups(data?: MenuStoreData): Record<string, ModifierGroup> {
  syncDynamicMenuGlobals(data)
  return cloneModifierGroups(MODIFIER_GROUPS)
}

export function saveStoredMenuData(data: MenuStoreData): void {
  if (typeof window === 'undefined') return
  try {
    syncDynamicMenuGlobals(data)
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(data))
    window.dispatchEvent(new Event('fornello_menu_updated'))
    fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {})
  } catch {
    // quota or privacy sandbox fallback
  }
}

export function getMergedMenu(data?: MenuStoreData): (MenuItem & { soldOut?: boolean; custom?: boolean })[] {
  const store = data ?? getStoredMenuData()
  syncDynamicMenuGlobals(store)
  const baseMerged = MENU.filter((item) => !store.overrides[item.id]?.deleted).map((item) => {
    const override = store.overrides[item.id]
    if (!override) {
      MENU_BY_ID.set(item.id, item)
      return item
    }
    const merged: MenuItem & { soldOut?: boolean; custom?: boolean } = {
      ...item,
      name: override.name ?? item.name,
      price: override.price !== undefined ? override.price : item.price,
      description: override.description ?? item.description,
      category: override.category ?? item.category,
      tags: override.tags ?? item.tags,
      groups: override.groups ?? item.groups,
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
