import type { Metadata } from 'next'
import ToastProvider from './toast-provider'
import './globals.css'

export const metadata: Metadata = {
  title: '경소노래방',
  description: '경북소프트웨어마이스터고등학교 노래방 예약 서비스',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="shortcut icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body>
        {children}
        <ToastProvider />
      </body>
    </html>
  )
}
