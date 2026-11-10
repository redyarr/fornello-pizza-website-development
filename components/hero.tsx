'use client'

import Image from 'next/image'
import { SITE } from '@/lib/i18n'
import { ModeSwitcher } from './mode-switcher'
import { useOrder } from './order-provider'
import { Tricolor } from './tricolor'

export function Hero() {
  const { t } = useOrder()

  return (
    <section className="relative isolate overflow-hidden">
      <Image
        src="/images/hero-pizza.png"
        alt=""
        fill
        priority
        loading="eager"
        sizes="100vw"
        className="-z-20 object-cover object-[75%_50%] rtl:-scale-x-100"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-r from-background via-background/90 to-background/50 md:to-background/10 rtl:bg-linear-to-l"
      />

      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:py-12 md:py-16">
        <div className="flex w-fit flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-primary/70 bg-background/40 px-5 py-3.5 backdrop-blur-xs">
          <p lang="en" className="font-display text-3xl leading-none font-semibold tracking-[0.12em] text-primary sm:text-4xl md:text-5xl">
            FORNELLO
          </p>
          <Tricolor />
          <p lang="ckb" className="text-sm font-medium text-foreground">
            {SITE.nameCkb}
          </p>
        </div>

        <div className="flex max-w-xl flex-col gap-3">
          <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">{t.heroEyebrow}</p>
          <h1 className="font-display text-3xl leading-snug font-semibold text-balance sm:text-4xl md:text-5xl">
            {t.heroTitle}
          </h1>
          <p className="text-base leading-relaxed text-pretty text-muted-foreground">{t.heroBody}</p>
        </div>

        <div className="flex max-w-md flex-col gap-3.5">
          <ModeSwitcher id="hero-table" />
          <a
            href="#menu"
            className="flex h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-foreground shadow-lg shadow-black/25 transition-all hover:opacity-95 active:scale-[0.99]"
          >
            {t.seeMenu}
          </a>
        </div>
      </div>
    </section>
  )
}
