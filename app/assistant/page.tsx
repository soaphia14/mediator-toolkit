'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithPopup } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export default function Page() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
        hello world
    </div>
  )
}
