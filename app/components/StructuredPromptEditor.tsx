'use client'

import React, { createContext, useContext, useState, useRef, useEffect } from 'react'

// ============================================================
// Types
// ============================================================

export enum PromptItemType {
  TEXT = 'TEXT',
  CONTEXT = 'CONTEXT',
}

export interface PromptItem {
  type: PromptItemType | string
}

export interface TextPromptItem extends PromptItem {
  type: PromptItemType.TEXT
  text: string
}

export interface ContextPromptItem extends PromptItem {
  type: PromptItemType.CONTEXT
}

export interface PromptItemUpdate {
  text?: string
}

// ============================================================
// Immutable tree update helpers
// ============================================================

function treeUpdateItem(root: PromptItem[], target: PromptItem, updates: PromptItemUpdate): PromptItem[] {
  return root.map(item => item === target ? { ...item, ...updates } as PromptItem : item)
}

function treeAddTo(root: PromptItem[], targetArr: PromptItem[], newItem: PromptItem): PromptItem[] {
  if (root === targetArr) return [...root, newItem]
  return root
}

function treeRemoveFrom(root: PromptItem[], targetArr: PromptItem[], index: number): PromptItem[] {
  if (root === targetArr) return root.filter((_, i) => i !== index)
  return root
}

function treeMoveIn(root: PromptItem[], targetArr: PromptItem[], index: number, dir: number): PromptItem[] {
  if (root !== targetArr) return root
  const newIndex = index + dir
  if (newIndex < 0 || newIndex >= root.length) return root
  const copy = [...root]
  ;[copy[index], copy[newIndex]] = [copy[newIndex], copy[index]]
  return copy
}

function treeMoveFromTo(root: PromptItem[], targetArr: PromptItem[], from: number, to: number): PromptItem[] {
  if (from === to || root !== targetArr) return root
  const copy = [...root]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

// ============================================================
// Editor context
// ============================================================

interface EditorCtx {
  updateItem: (item: PromptItem, updates: PromptItemUpdate) => void
  addItem: (targetArr: PromptItem[], newItem: PromptItem) => void
  deleteItem: (targetArr: PromptItem[], index: number) => void
  moveItem: (targetArr: PromptItem[], index: number, dir: number) => void
  reorderItems: (targetArr: PromptItem[], from: number, to: number) => void
}

const EditorContext = createContext<EditorCtx | null>(null)
const useEditorCtx = () => {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('Must render inside StructuredPromptEditor')
  return ctx
}

// ============================================================
// Primitive UI components
// ============================================================

const ICON_CHARS: Record<string, string> = {
  arrow_upward: '↑',
  arrow_downward: '↓',
  close: '×',
}

function IconButton({ icon, title, onClick }: {
  icon: string
  title?: string
  onClick: () => void
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-6 h-6 flex items-center justify-center rounded text-sm transition-colors text-neutral-500 hover:text-neutral-200 hover:bg-neutral-700"
    >
      {ICON_CHARS[icon] ?? icon}
    </button>
  )
}

function AddMenu({ targetArr }: { targetArr: PromptItem[] }) {
  const { addItem } = useEditorCtx()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const pick = (item: PromptItem) => { addItem(targetArr, item); setOpen(false) }
  const itemClass = 'px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 cursor-pointer whitespace-nowrap transition-colors'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-md border border-dashed border-neutral-600 text-sm text-neutral-400 hover:border-neutral-400 hover:text-neutral-200 transition-colors px-3 py-1.5"
      >
        <span className="text-base leading-none">+</span> Add item
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl">
          <div className={itemClass} role="button" onClick={() => pick({ type: PromptItemType.TEXT, text: '' } as TextPromptItem)}>
            Freeform text
          </div>
          <div className="my-0.5 border-t border-neutral-700/60" />
          <div className={itemClass} role="button" onClick={() => pick({ type: PromptItemType.CONTEXT } as ContextPromptItem)}>
            Context
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Item editors
// ============================================================

function TextItemEditor({ item }: { item: TextPromptItem }) {
  const { updateItem } = useEditorCtx()
  return (
    <textarea
      className="w-full min-h-[72px] p-2 rounded-md border border-neutral-600/60 bg-neutral-900 text-sm text-neutral-200 placeholder-neutral-600 resize-y focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500/30"
      placeholder="Add freeform text here…"
      value={item.text}
      onChange={e => updateItem(item, { text: e.target.value })}
    />
  )
}

function ItemEditor({ item }: { item: PromptItem }) {
  switch (item.type) {
    case PromptItemType.TEXT:
      return <TextItemEditor item={item as TextPromptItem} />
    case PromptItemType.CONTEXT:
      return (
        <div className="cursor-default rounded bg-blue-900/40 px-3 py-1.5 text-sm font-medium text-blue-200">
          Context
        </div>
      )
    default:
      return null
  }
}

// ============================================================
// Item list
// ============================================================

function PromptItemList({ items, isNested = false }: { items: PromptItem[]; isNested?: boolean }) {
  const { deleteItem, moveItem, reorderItems } = useEditorCtx()
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  if (items.length === 0) {
    return (
      <p className={`py-2 text-sm text-neutral-500 ${isNested ? 'italic' : ''}`}>
        ⚠️ No items added yet
      </p>
    )
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDropIndex(e.clientY < rect.top + rect.height / 2 ? index : index + 1)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (dragIndex !== null && dropIndex !== null) {
      const to = dropIndex > dragIndex ? dropIndex - 1 : dropIndex
      reorderItems(items, dragIndex, to)
    }
    setDragIndex(null)
    setDropIndex(null)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDropIndex(null)
  }

  const isNoOp = (drop: number) => drop === dragIndex || drop === dragIndex! + 1

  return (
    <div className="flex flex-col gap-1.5" onDragLeave={handleDragLeave}>
      {items.map((item, index) => {
        const isDragging = dragIndex === index
        const showLineBefore = dropIndex === index && dragIndex !== null && !isNoOp(index)

        return (
          <div key={index}>
            {showLineBefore && <div className="h-0.5 rounded-full bg-blue-500 mx-1" />}
            <div
              draggable
              onDragStart={e => handleDragStart(e, index)}
              onDragOver={e => handleDragOver(e, index)}
              onDrop={handleDrop}
              onDragEnd={() => { setDragIndex(null); setDropIndex(null) }}
              className={`group rounded-lg border border-neutral-700 bg-neutral-800 transition-opacity ${isDragging ? 'opacity-30' : ''}`}
            >
              <div className="flex items-start gap-2 p-2.5">
                <div className="mt-0.5 shrink-0 cursor-grab select-none text-neutral-600 hover:text-neutral-400 active:cursor-grabbing transition-colors" title="Drag to reorder">
                  ⠿
                </div>
                <div className="min-w-0 flex-1">
                  <ItemEditor item={item} />
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconButton icon="arrow_upward" onClick={() => moveItem(items, index, -1)} />
                  <IconButton icon="arrow_downward" onClick={() => moveItem(items, index, 1)} />
                  <IconButton icon="close" onClick={() => deleteItem(items, index)} />
                </div>
              </div>
            </div>
          </div>
        )
      })}
      {dropIndex === items.length && dragIndex !== null && !isNoOp(items.length) && (
        <div className="h-0.5 rounded-full bg-blue-500 mx-1" />
      )}
    </div>
  )
}

// ============================================================
// Main component
// ============================================================

export interface StructuredPromptEditorProps {
  prompt: PromptItem[]
  stageId?: string
  onUpdate: (prompt: PromptItem[]) => void
  label?: string
}

export function StructuredPromptEditor({
  prompt,
  onUpdate,
  label = 'Prompt editor',
}: StructuredPromptEditorProps) {
  const ctx: EditorCtx = {
    updateItem: (item, updates) => onUpdate(treeUpdateItem(prompt, item, updates)),
    addItem: (targetArr, newItem) => onUpdate(treeAddTo(prompt, targetArr, newItem)),
    deleteItem: (targetArr, index) => onUpdate(treeRemoveFrom(prompt, targetArr, index)),
    moveItem: (targetArr, index, dir) => onUpdate(treeMoveIn(prompt, targetArr, index, dir)),
    reorderItems: (targetArr, from, to) => onUpdate(treeMoveFromTo(prompt, targetArr, from, to)),
  }

  return (
    <EditorContext.Provider value={ctx}>
      <div className="rounded-lg border border-neutral-700 bg-neutral-900">
        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700/60">
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{label}</span>
          <AddMenu targetArr={prompt} />
        </div>
        <div className="p-3">
          <PromptItemList items={prompt} />
        </div>
      </div>
    </EditorContext.Provider>
  )
}

// ============================================================
// Example
// ============================================================

export function StructuredPromptEditorExample() {
  const [prompt, setPrompt] = useState<PromptItem[]>([
    { type: PromptItemType.TEXT, text: 'hi' } as TextPromptItem,
  ])

  return (
    <div className="space-y-3">
      <StructuredPromptEditor prompt={prompt} onUpdate={setPrompt} />
      <details>
        <summary className="cursor-pointer text-xs text-neutral-600 hover:text-neutral-400">Prompt JSON</summary>
        <pre className="mt-1.5 overflow-auto rounded-md bg-neutral-800/50 p-3 text-xs text-neutral-400">
          {JSON.stringify(prompt, null, 2)}
        </pre>
      </details>
    </div>
  )
}
