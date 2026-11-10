'use client'

import { MapPin, MessageCircle, Phone, QrCode } from 'lucide-react'
import Link from 'next/link'
import { SITE } from '@/lib/i18n'
import { useOrder } from './order-provider'
import { Tricolor } from './tricolor'

export function SiteFooter() {
  const { t } = useOrder()
  const linkClass = 'flex items-center gap-3 underline-offset-4 hover:text-primary hover:underline'

  return (
    <footer className="border-t border-border pb-28">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <p lang="en" className="font-display text-3xl font-semibold tracking-[0.14em] text-primary">
            FORNELLO
          </p>
          <Tricolor />
          <p lang="ckb" className="text-muted-foreground">
            {SITE.nameCkb}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="font-display text-lg tracking-wide uppercase">{t.findUs}</h2>
          <p className="flex items-start gap-3 leading-relaxed">
            <MapPin className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
            {t.address}
          </p>
          <a href={SITE.phoneHref} className={linkClass}>
            <Phone className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="sr-only">{t.call}</span>
            <bdi dir="ltr">{SITE.phoneDisplay}</bdi>
          </a>
          <a
            href={`https://wa.me/${SITE.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            <MessageCircle className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {t.whatsapp}
          </a>
          <a href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            <span className="grid size-4 shrink-0 place-items-center text-primary" aria-hidden="true">
              @
            </span>
            <span className="sr-only">Instagram</span>
            <bdi dir="ltr">{SITE.instagramHandle.slice(1)}</bdi>
          </a>
          <Link href="/qr" className={`${linkClass} mt-2 text-sm text-muted-foreground`}>
            <QrCode className="size-4 shrink-0" aria-hidden="true" />
            {t.staffQr}
          </Link>
        </div>
      </div>
    </footer>
  )
}
