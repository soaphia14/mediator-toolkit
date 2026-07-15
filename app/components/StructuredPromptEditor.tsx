'use client'

import { createContext, useContext, useState, useRef, useEffect } from 'react'

// ============================================================
// Types
// ============================================================

export enum PromptItemType {
  TEXT = 'TEXT',
  CONTEXT = 'CONTEXT',
  PROFILE_INFO = 'PROFILE_INFO',
  PRELOADED_CONTEXT = 'PRELOADED_CONTEXT',
  BIASED = 'BIASED',
  TOPIC_NAME = 'TOPIC_NAME',
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
  context: 'all' | 'current' | 'before'
}

export interface ProfileInfoPromptItem extends PromptItem {
  type: PromptItemType.PROFILE_INFO
}

export interface PreloadedContextPromptItem extends PromptItem {
  type: PromptItemType.PRELOADED_CONTEXT
}

export interface BiasedPromptItem extends PromptItem {
  type: PromptItemType.BIASED
  bias: 'pro' | 'against'
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

// ============================================================
// Editor context
// ============================================================

interface EditorCtx {
  locked: boolean
  updateItem: (item: PromptItem, updates: PromptItemUpdate) => void
  addItem: (targetArr: PromptItem[], newItem: PromptItem) => void
  deleteItem: (targetArr: PromptItem[], index: number) => void
  moveItem: (targetArr: PromptItem[], index: number, dir: number) => void
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

function AddMenu({ targetArr, textOnly }: { targetArr: PromptItem[], textOnly?: boolean }) {
  const { addItem, locked } = useEditorCtx()
  if (locked) return null
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
        id='tour-add-item'
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-md border border-dashed border-neutral-600 text-sm text-neutral-400 hover:border-neutral-400 hover:text-neutral-200 transition-colors px-3 py-1.5"
      >
        <span className="text-base leading-none">+</span> Add item
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl">
          <div className={itemClass} role="button" onClick={() => pick({ type: PromptItemType.TEXT, text: '' } as TextPromptItem)}>
            Freeform Text
          </div>
          <div className="my-0.5 border-t border-neutral-700/60" />
          <div className={itemClass} role="button" onClick={() => pick({ type: PromptItemType.TEXT, text: '{topic_name}' } as TextPromptItem)}>
            Topic Name
          </div>
          <div className="my-0.5 border-t border-neutral-700/60" />
          <div className={itemClass} role="button" onClick={() => pick({ type: PromptItemType.CONTEXT, context: 'before' } as ContextPromptItem)}>
            Pre-conversation Context
          </div>
          {!textOnly && (
            <>
              <div className="my-0.5 border-t border-neutral-700/60" />
              <div className={itemClass} role="button" onClick={() => pick({ type: PromptItemType.CONTEXT, context: 'current' } as ContextPromptItem)}>
                Conversation Context
              </div>
              <div className="my-0.5 border-t border-neutral-700/60" />
              <div className={itemClass} role="button" onClick={() => pick({ type: PromptItemType.PROFILE_INFO } as ProfileInfoPromptItem)}>
                Profile Info
              </div>
              <div className="my-0.5 border-t border-neutral-700/60" />
              <div className={itemClass} role="button" onClick={() => pick({ type: PromptItemType.PRELOADED_CONTEXT } as PreloadedContextPromptItem)}>
                Initialization Result
              </div>
            </>
          )}
          {textOnly && (
            <>
              <div className="my-0.5 border-t border-neutral-700/60" />
              <div className={itemClass} role="button" onClick={() => pick({ type: PromptItemType.BIASED, bias: 'pro' } as BiasedPromptItem)}>
                Biased: Pro
              </div>
              <div className="my-0.5 border-t border-neutral-700/60" />
              <div className={itemClass} role="button" onClick={() => pick({ type: PromptItemType.BIASED, bias: 'against' } as BiasedPromptItem)}>
                Biased: Against
              </div>
            </>
          )}
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
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [item.text])

  return (
    <textarea
      ref={ref}
      className="w-full min-h-[72px] p-2 rounded-md border border-neutral-600/60 bg-neutral-900 text-sm text-neutral-200 placeholder-neutral-600 resize-none overflow-hidden focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500/30"
      placeholder="Add freeform text here…"
      value={item.text}
      onChange={e => updateItem(item, { text: e.target.value })}
    />
  )
}

function ItemEditor({ item }: { item: PromptItem }) {
  switch (item.type) {
    case PromptItemType.TEXT:
      if ((item as TextPromptItem).text === '{topic_name}' || (item as TextPromptItem).text === '{topic_name}\n') {
        return (
          <div className="cursor-default rounded bg-[#fde8c8] px-3 py-1.5 text-sm font-medium text-neutral-900">
            Topic Name
          </div>
        )
      }
      return <TextItemEditor item={item as TextPromptItem} />
    case PromptItemType.CONTEXT:
      return (
        <div className="cursor-default rounded bg-[#dce1fd] px-3 py-1.5 text-sm font-medium text-neutral-900">
          {(item as ContextPromptItem).context === 'before' ? 'Pre-conversation context: the name of the participants and their responses to the pre-conversation surveys' : 'Conversation context: the transcript of the conversation up to the current moment'}
        </div>
      )
    case PromptItemType.PROFILE_INFO:
      return (
        <div className="cursor-default rounded bg-[#f9d8f5] px-3 py-1.5 text-sm font-medium text-neutral-900">
          Profile Info
        </div>
      )
    case PromptItemType.PRELOADED_CONTEXT:
      return (
        <div className="cursor-default rounded bg-[#d8f9e0] px-3 py-1.5 text-sm font-medium text-neutral-900">
          Initialization Result
        </div>
      )
    case PromptItemType.BIASED:
      return (
        <div className="cursor-default rounded bg-[#f08673] px-3 py-1.5 text-sm font-medium text-neutral-900">
          Biased {(item as BiasedPromptItem).bias === 'pro' ? 'Pro' : 'Against'}
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
  const { deleteItem, moveItem, locked } = useEditorCtx()

  if (items.length === 0) {
    return (
      <p className={`py-2 text-sm text-neutral-500 ${isNested ? 'italic' : ''}`}>
        ⚠️ No items added yet
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <div
          key={index}
          className="group rounded-lg border border-neutral-700 bg-neutral-800"
        >
          <div className="flex items-start gap-2 p-2.5">
            <div className="min-w-0 flex-1">
              <ItemEditor item={item} />
            </div>
            {!locked && (
              <div className="flex shrink-0 items-center gap-0.5 ">
                <IconButton icon="arrow_upward" onClick={() => moveItem(items, index, -1)} />
                <IconButton icon="arrow_downward" onClick={() => moveItem(items, index, 1)} />
                <IconButton icon="close" onClick={() => deleteItem(items, index)} />
              </div>
            )}
          </div>
        </div>
      ))}
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
  locked?: boolean
  textOnly?: boolean
}

export function StructuredPromptEditor({
  prompt,
  onUpdate,
  label = 'Prompt editor',
  locked = false,
  textOnly = false,
}: StructuredPromptEditorProps) {
  const ctx: EditorCtx = {
    locked,
    updateItem: (item, updates) => onUpdate(treeUpdateItem(prompt, item, updates)),
    addItem: (targetArr, newItem) => onUpdate(treeAddTo(prompt, targetArr, newItem)),
    deleteItem: (targetArr, index) => onUpdate(treeRemoveFrom(prompt, targetArr, index)),
    moveItem: (targetArr, index, dir) => onUpdate(treeMoveIn(prompt, targetArr, index, dir)),
  }

  return (
    <EditorContext.Provider value={ctx}>
      <div className="rounded-lg border border-neutral-700 bg-neutral-900">
        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700/60">
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{label}</span>
          <AddMenu targetArr={prompt} textOnly={textOnly}/>
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
