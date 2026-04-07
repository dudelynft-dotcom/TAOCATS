import "./globals.css";

export const metadata = {
  title: '???',
  description: 'Coming soon.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ background: "#05070a" }}>{children}</body>
    </html>
  )
}
