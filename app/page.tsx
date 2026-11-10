import { CartBar } from '@/components/cart-bar'
import { Hero } from '@/components/hero'
import { MenuBrowser } from '@/components/menu-browser'
import { OrderProvider } from '@/components/order-provider'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { parseOrderParams } from '@/lib/order'

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function Page({ searchParams }: PageProps) {
  const initial = parseOrderParams(await searchParams)

  return (
    <OrderProvider initial={initial}>
      <SiteHeader />
      <main>
        <Hero />
        <MenuBrowser />
      </main>
      <SiteFooter />
      <CartBar />
    </OrderProvider>
  )
}
