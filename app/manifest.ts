import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fornello Pizza & Coffee',
    short_name: 'Fornello',
    description: 'Fornello Pizza & Coffee in Sulaymaniyah. Order from your table or takeaway.',
    start_url: '/',
    display: 'standalone',
    background_color: '#16211c',
    theme_color: '#16211c',
    icons: [
      {
        src: '/icon-light-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}

