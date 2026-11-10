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
        sizes="100vw"
        className="-z-20 object-cover object-[75%_50%] rtl:-scale-x-100"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-r from-background via-background/90 to-background/50 md:to-background/10 rtl:bg-linear-to-l"
      />

      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-14 md:py-24">
        <div className="flex w-fit flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-primary/70 px-6 py-4">
          <p lang="en" className="font-display text-4xl leading-none font-semibold tracking-[0.12em] text-primary md:text-5xl">
            FORNELLO
          </p>
          <Tricolor />
          <p lang="ckb" className="text-sm text-foreground">
            {SITE.nameCkb}
          </p>
        </div>

        <div className="flex max-w-xl flex-col gap-4">
          <p className="text-sm font-medium tracking-[0.2em] text-primary uppercase">{t.heroEyebrow}</p>
          <h1 className="font-display text-4xl leading-tight font-medium text-balance md:text-5xl">{t.heroTitle}</h1>
          <p className="leading-relaxed text-pretty text-muted-foreground">{t.heroBody}</p>
        </div>

        <div className="flex max-w-md flex-col gap-4">
          <ModeSwitcher id="hero-table" />
          <a
            href="#menu"
            className="flex h-12 items-center justify-center rounded-full bg-accent font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            {t.seeMenu}
          </a>
        </div>
      </div>
    </section>
  )
}
