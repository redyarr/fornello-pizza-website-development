'use client'

import { Search, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, MENU, type CategoryId, type MenuItem, type Tag } from '@/lib/menu'
import { cn } from '@/lib/utils'
import { ItemSheet } from './item-sheet'
import { MenuItemRow } from './menu-item-row'
import { useOrder } from './order-provider'
import { Tricolor } from './tricolor'

const FILTER_TAGS: Tag[] = ['signature', 'spicy', 'vegetarian', 'caffeine']

export function MenuBrowser() {
  const { lang, t, menu } = useOrder()
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<Tag | null>(null)
  const [selected, setSelected] = useState<MenuItem | null>(null)
  const [activeCategory, setActiveCategory] = useState<CategoryId>('pizza')
  const isManualScrollRef = useRef(false)
  const navPillsRef = useRef<Record<string, HTMLAnchorElement | null>>({})

  const needle = query.trim().toLowerCase()
  const visible = menu.filter((item) => {
    if (activeTag && !item.tags.includes(activeTag)) return false
    if (!needle) return true
    const haystack = [item.name, item.description?.en, item.description?.ckb].join(' ').toLowerCase()
    return haystack.includes(needle)
  })
  const sections = CATEGORIES.map((category) => ({
    category,
    items: visible.filter((item) => item.category === category.id),
  })).filter((section) => section.items.length > 0)

  // Keep active category synced if current one is filtered out
  useEffect(() => {
    if (sections.length > 0 && !sections.some((s) => s.category.id === activeCategory)) {
      setActiveCategory(sections[0].category.id)
    }
  }, [sections, activeCategory])

  // Center active category pill in sticky subnav on mobile
  useEffect(() => {
    const pill = navPillsRef.current[activeCategory]
    if (pill) {
      pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeCategory])

  // Scroll-spy observer
  useEffect(() => {
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScrollRef.current) return
        const visibleEntries = entries.filter((e) => e.isIntersecting)
        if (visibleEntries.length > 0) {
          const topEntry = visibleEntries.reduce((prev, curr) =>
            curr.intersectionRatio > prev.intersectionRatio ? curr : prev,
          )
          if (topEntry?.target.id) {
            setActiveCategory(topEntry.target.id as CategoryId)
          }
        }
      },
      {
        rootMargin: '-120px 0px -60% 0px',
        threshold: [0.1, 0.3, 0.5, 0.8],
      },
    )

    for (const section of sections) {
      const el = document.getElementById(section.category.id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [sections])

  const handleCategoryClick = (id: CategoryId) => {
    isManualScrollRef.current = true
    setActiveCategory(id)
    const target = document.getElementById(id)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
    }
    setTimeout(() => {
      isManualScrollRef.current = false
    }, 800)
  }

  return (
    <section id="menu" aria-label={t.menu} className="scroll-mt-14">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 pt-8 pb-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchLabel}
            className="h-12 w-full rounded-full border border-input bg-secondary ps-11 pe-11 text-base placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t.clearFilters}
              className="absolute end-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div role="group" aria-label={t.filters} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {FILTER_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={activeTag === tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={cn(
                'h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors',
                activeTag === tag
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-foreground/10',
              )}
            >
              {t.tags[tag]}
            </button>
          ))}
        </div>
      </div>

      <nav aria-label={t.categories} className="sticky top-14 z-20 border-y border-border bg-background/95 backdrop-blur">
        <ul className="no-scrollbar mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2">
          {CATEGORIES.map((category) => (
            <li key={category.id} className="shrink-0">
              <a
                ref={(el) => {
                  navPillsRef.current[category.id] = el
                }}
                href={`#${category.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  handleCategoryClick(category.id)
                }}
                className={cn(
                  'flex h-9 items-center rounded-full px-4 font-display text-base tracking-wide uppercase transition-colors',
                  activeCategory === category.id
                    ? 'bg-primary font-semibold text-primary-foreground shadow-sm'
                    : 'text-foreground/80 hover:bg-foreground/10 hover:text-primary',
                )}
              >
                {t.categoryNames[category.id]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-10">
        {sections.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-card px-6 py-12 text-center">
            <p className="max-w-sm leading-relaxed">{t.noResults}</p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setActiveTag(null)
              }}
              className="flex h-10 items-center gap-2 rounded-full border border-primary/70 px-4 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <X className="size-4" aria-hidden="true" />
              {t.clearFilters}
            </button>
          </div>
        ) : null}

        {sections.map(({ category, items }) => (
          <section
            key={category.id}
            id={category.id}
            aria-labelledby={`${category.id}-title`}
            className="grid scroll-mt-32 gap-5 lg:grid-cols-[300px_1fr] lg:gap-8"
          >
            <div className="lg:sticky lg:top-32 lg:self-start">
              <div className="relative aspect-[16/9] overflow-hidden rounded-3xl lg:aspect-[4/5]">
                <Image
                  src={category.image}
                  alt={category.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 300px, 100vw"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="rounded-3xl bg-card px-5 py-7 sm:px-8">
              <div className="mx-auto flex w-fit flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-primary/70 px-6 py-4 text-center">
                <h2
                  id={`${category.id}-title`}
                  className="font-display text-3xl leading-none font-semibold tracking-wide text-primary uppercase"
                >
                  {category.title[lang]}
                </h2>
                <Tricolor />
                <p className="text-sm">{category.subtitle[lang]}</p>
              </div>

              <ul className="mt-5 divide-y divide-dashed divide-foreground/30">
                {items.map((item) => (
                  <MenuItemRow key={item.id} item={item} onSelect={setSelected} />
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>

      <ItemSheet item={selected} onClose={() => setSelected(null)} />
    </section>
  )
}
