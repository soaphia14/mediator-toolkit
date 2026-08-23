import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Assistant Toolkit',
}

export default function AssistantLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
