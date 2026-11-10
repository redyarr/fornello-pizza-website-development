'use client'

import { Bell, MapPin, MessageCircle, Phone, QrCode, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { SITE } from '@/lib/i18n'
import { useOrder } from './order-provider'
import { Tricolor } from './tricolor'

export function SiteFooter() {
  const { t } = useOrder()
  const router = useRouter()
  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null)
  const linkClass = 'flex items-center gap-3 underline-offset-4 hover:text-primary hover:underline'

  const handleSecretStaffClick = () => {
    clickCountRef.current += 1
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)

    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0
      router.push('/admin')
      return
    }

    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0
    }, 2500)
  }

  return (
    <footer className="border-t border-border pb-28">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <p lang="en" className="font-display text-3xl font-semibold tracking-[0.14em] text-primary">
            FORNELLO
          </p>
          <button
            type="button"
            onClick={handleSecretStaffClick}
            aria-label="Fornello insignia"
            className="w-fit cursor-default outline-none select-none active:scale-95 transition-transform"
          >
            <Tricolor />
          </button>
          <p lang="ckb" className="text-muted-foreground">
            {SITE.nameCkb}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="font-display text-lg tracking-wide uppercase">{t.findUs}</h2>
          <a
            href={SITE.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkClass} leading-relaxed`}
          >
            <MapPin className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{t.address}</span>
          </a>
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
          <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-border/50 pt-3">
            <Link href="/qr" className={`${linkClass} text-sm text-muted-foreground`}>
              <QrCode className="size-4 shrink-0" aria-hidden="true" />
              {t.staffQr}
            </Link>
            <Link href="/floor" className={`${linkClass} text-sm text-muted-foreground`}>
              <Bell className="size-4 shrink-0" aria-hidden="true" />
              {t.waiterFloor}
            </Link>
            <Link href="/admin" className={`${linkClass} text-sm text-muted-foreground`}>
              <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
              {t.staffMenu}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
