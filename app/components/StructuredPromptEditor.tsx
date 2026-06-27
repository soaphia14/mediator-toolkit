'use client'

import React, { createContext, useContext, useState, useRef, useEffect } from 'react'

// ============================================================
// Types (mirrors @deliberation-lab/utils — swap for real imports when available)
// ============================================================

export enum PromptItemType {
  TEXT = 'TEXT',
  CONTEXT = 'CONTEXT',
  STAGE_CONTEXT = 'STAGE_CONTEXT',
  PROFILE_INFO = 'PROFILE_INFO',
  PROFILE_CONTEXT = 'PROFILE_CONTEXT',
  GROUP = 'GROUP',
}

export enum SeedStrategy {
  EXPERIMENT = 'experiment',
  COHORT = 'cohort',
  PARTICIPANT = 'participant',
  CUSTOM = 'custom',
}

export enum StageKind {
  PRIVATE_CHAT = 'PRIVATE_CHAT',
  GROUP_CHAT = 'GROUP_CHAT',
}

export enum ConditionOperator {
  AND = 'AND',
  OR = 'OR',
}

export interface ShuffleConfig {
  shuffle: boolean
  seed: SeedStrategy
  customSeed: string
}

export interface Condition {
  operator: ConditionOperator
  conditions: Condition[]
}

export interface ConditionTarget {
  id: string
  label: string
}

export interface PromptItem {
  type: PromptItemType
  condition?: Condition
}

export interface TextPromptItem extends PromptItem {
  type: PromptItemType.TEXT
  text: string
}

export interface StageContextPromptItem extends PromptItem {
  type: PromptItemType.STAGE_CONTEXT
  stageId: string
  includePrimaryText: boolean
  includeInfoText: boolean
  includeStageDisplay: boolean
  includeParticipantAnswers: boolean
}

export interface PromptItemGroup extends PromptItem {
  type: PromptItemType.GROUP
  title: string
  items: PromptItem[]
  shuffleConfig?: ShuffleConfig
}

export interface Stage {
  id: string
  name: string
  kind: StageKind
}

// Covers all possible field updates across every PromptItem subtype.
// Defined explicitly to avoid intersection of discriminated literals collapsing to never.
export interface PromptItemUpdate {
  type?: PromptItemType
  condition?: Condition
  // TextPromptItem
  text?: string
  // StageContextPromptItem
  stageId?: string
  includePrimaryText?: boolean
  includeInfoText?: boolean
  includeStageDisplay?: boolean
  includeParticipantAnswers?: boolean
  // PromptItemGroup
  title?: string
  items?: PromptItem[]
  shuffleConfig?: ShuffleConfig
}

// ============================================================
// Factory functions
// ============================================================

export function createDefaultPromptItemGroup(): PromptItemGroup {
  return {
    type: PromptItemType.GROUP,
    title: 'New Group',
    items: [],
    shuffleConfig: { shuffle: false, seed: SeedStrategy.EXPERIMENT, customSeed: '' },
  }
}

export function createDefaultStageContextPromptItem(stageId: string): StageContextPromptItem {
  return {
    type: PromptItemType.STAGE_CONTEXT,
    stageId,
    includePrimaryText: true,
    includeInfoText: false,
    includeStageDisplay: true,
    includeParticipantAnswers: false,
  }
}

export function createShuffleConfig(config: Partial<ShuffleConfig>): ShuffleConfig {
  return {
    shuffle: config.shuffle ?? false,
    seed: config.seed ?? SeedStrategy.EXPERIMENT,
    customSeed: config.customSeed ?? '',
  }
}

export function createConditionGroup(operator: ConditionOperator, conditions: Condition[]): Condition {
  return { operator, conditions }
}

// ============================================================
// Immutable tree update helpers
// ============================================================

function treeUpdateItem(root: PromptItem[], target: PromptItem, updates: PromptItemUpdate): PromptItem[] {
  return root.map(item => {
    if (item === target) return { ...item, ...updates } as PromptItem
    if (item.type === PromptItemType.GROUP) {
      const g = item as PromptItemGroup
      const newItems = treeUpdateItem(g.items, target, updates)
      return newItems === g.items ? item : { ...g, items: newItems }
    }
    return item
  })
}

function treeAddTo(root: PromptItem[], targetArr: PromptItem[], newItem: PromptItem): PromptItem[] {
  if (root === targetArr) return [...root, newItem]
  return root.map(item => {
    if (item.type === PromptItemType.GROUP) {
      const g = item as PromptItemGroup
      if (g.items === targetArr) return { ...g, items: [...g.items, newItem] }
      const newItems = treeAddTo(g.items, targetArr, newItem)
      return newItems === g.items ? item : { ...g, items: newItems }
    }
    return item
  })
}

function treeRemoveFrom(root: PromptItem[], targetArr: PromptItem[], index: number): PromptItem[] {
  if (root === targetArr) return root.filter((_, i) => i !== index)
  return root.map(item => {
    if (item.type === PromptItemType.GROUP) {
      const g = item as PromptItemGroup
      if (g.items === targetArr) return { ...g, items: g.items.filter((_, i) => i !== index) }
      const newItems = treeRemoveFrom(g.items, targetArr, index)
      return newItems === g.items ? item : { ...g, items: newItems }
    }
    return item
  })
}

function treeMoveIn(root: PromptItem[], targetArr: PromptItem[], index: number, dir: number): PromptItem[] {
  const newIndex = index + dir
  if (newIndex < 0 || newIndex >= targetArr.length) return root
  const swap = (arr: PromptItem[]) => {
    const copy = [...arr]
    ;[copy[index], copy[newIndex]] = [copy[newIndex], copy[index]]
    return copy
  }
  if (root === targetArr) return swap(root)
  return root.map(item => {
    if (item.type === PromptItemType.GROUP) {
      const g = item as PromptItemGroup
      if (g.items === targetArr) return { ...g, items: swap(g.items) }
      const newItems = treeMoveIn(g.items, targetArr, index, dir)
      return newItems === g.items ? item : { ...g, items: newItems }
    }
    return item
  })
}

function treeMoveFromTo(root: PromptItem[], targetArr: PromptItem[], from: number, to: number): PromptItem[] {
  if (from === to) return root
  const reorder = (arr: PromptItem[]) => {
    const copy = [...arr]
    const [item] = copy.splice(from, 1)
    copy.splice(to, 0, item)
    return copy
  }
  if (root === targetArr) return reorder(root)
  return root.map(item => {
    if (item.type === PromptItemType.GROUP) {
      const g = item as PromptItemGroup
      if (g.items === targetArr) return { ...g, items: reorder(g.items) }
      const newItems = treeMoveFromTo(g.items, targetArr, from, to)
      return newItems === g.items ? item : { ...g, items: newItems }
    }
    return item
  })
}

// ============================================================
// Editor context (avoids prop drilling through nested item lists)
// ============================================================

interface EditorCtx {
  updateItem: (item: PromptItem, updates: PromptItemUpdate) => void
  addItem: (targetArr: PromptItem[], newItem: PromptItem) => void
  deleteItem: (targetArr: PromptItem[], index: number) => void
  moveItem: (targetArr: PromptItem[], index: number, dir: number) => void
  reorderItems: (targetArr: PromptItem[], from: number, to: number) => void
  supportsConditions: boolean
  conditionTargets: ConditionTarget[]
  availableStages: Stage[]
  stageId: string
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
  rule: '⊨',
}

function IconButton({ icon, title, color = 'neutral', onClick }: {
  icon: string
  title?: string
  color?: 'primary' | 'neutral'
  onClick: () => void
}) {
  const colorClass = color === 'primary'
    ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/30'
    : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-700'
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-6 h-6 flex items-center justify-center rounded text-sm transition-colors ${colorClass}`}
    >
      {ICON_CHARS[icon] ?? icon}
    </button>
  )
}

function AddMenu({ targetArr, isRoot }: { targetArr: PromptItem[]; isRoot: boolean }) {
  const { addItem, stageId } = useEditorCtx()
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
        className={`flex items-center gap-1.5 rounded-md border border-dashed border-neutral-600 text-neutral-400 hover:border-neutral-400 hover:text-neutral-200 transition-colors ${isRoot ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1'}`}
      >
        <span className="text-base leading-none">+</span> Add item
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl">
          <div className={itemClass} role="button" onClick={() => pick({ type: PromptItemType.TEXT, text: '' } as TextPromptItem)}>Freeform text</div>
          <div className={itemClass} role="button" onClick={() => pick(createDefaultStageContextPromptItem(stageId))}>Context from single stage</div>
          <div className={itemClass} role="button" onClick={() => pick(createDefaultStageContextPromptItem(''))}>Context from all stages before this stage</div>
          <div className={itemClass} role="button" onClick={() => pick({ type: PromptItemType.PROFILE_CONTEXT })}>Custom agent context</div>
          <div className={itemClass} role="button" onClick={() => pick({ type: PromptItemType.PROFILE_INFO })}>Profile info (avatar, name, pronouns)</div>
          <div className="my-0.5 border-t border-neutral-700/60" />
          <div className={itemClass} role="button" onClick={() => pick(createDefaultPromptItemGroup())}>Group of items</div>
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

function StageContextEditor({ item }: { item: StageContextPromptItem }) {
  const { updateItem, availableStages } = useEditorCtx()
  const allStagesText = 'Context for all stages before and including this stage'
  const stageIdx = availableStages.findIndex(s => s.id === item.stageId)
  const label = item.stageId && stageIdx >= 0
    ? `Stage context: ${stageIdx + 1}. ${availableStages[stageIdx].name}`
    : allStagesText

  const checkboxes: [keyof StageContextPromptItem, string][] = [
    ['includePrimaryText', 'Include stage description'],
    ['includeInfoText', 'Include stage info popup'],
    ['includeStageDisplay', 'Include stage content (e.g., chat history, survey questions)'],
    ['includeParticipantAnswers', 'Include participant stage answers'],
  ]

  return (
    <details>
      <summary className="cursor-pointer list-none rounded bg-blue-900/40 px-3 py-1.5 text-sm font-medium text-blue-200 hover:bg-blue-900/60">
        {label}
      </summary>
      <div className="mt-1 space-y-2 rounded border border-neutral-700 bg-neutral-800/50 p-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-neutral-400">Select stage:</span>
          <select
            className="rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
            value={item.stageId}
            onChange={e => updateItem(item, { stageId: e.target.value })}
          >
            {availableStages.map((s, i) => (
              <option key={s.id} value={s.id}>{i + 1}. {s.name}</option>
            ))}
            <option value="">{allStagesText}</option>
          </select>
        </div>
        {checkboxes.map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 text-neutral-300">
            <input
              type="checkbox"
              checked={item[key] as boolean}
              onChange={() => updateItem(item, { [key]: !item[key] })}
            />
            {label}
          </label>
        ))}
      </div>
    </details>
  )
}

function GroupEditor({ group }: { group: PromptItemGroup }) {
  const { updateItem } = useEditorCtx()
  const sc = group.shuffleConfig

  const shuffleIndicator = sc?.shuffle
    ? <span className="ml-2 text-xs text-neutral-400">🔀 {sc.seed}{sc.seed === SeedStrategy.CUSTOM ? `: ${sc.customSeed}` : ''}</span>
    : null

  return (
    <details open>
      <summary className="flex cursor-pointer list-none items-center rounded bg-neutral-700/50 px-3 py-1.5 text-sm font-medium text-neutral-200 hover:bg-neutral-700">
        Group:
        <input
          type="text"
          className="ml-2 rounded border border-neutral-600 bg-neutral-800 px-2 py-0.5 text-sm text-neutral-200 focus:outline-none"
          value={group.title}
          onChange={e => updateItem(group, { title: e.target.value })}
          onClick={e => e.stopPropagation()}
        />
        {shuffleIndicator}
      </summary>
      <div className="mt-1 space-y-3 rounded border border-neutral-700 bg-neutral-800/30 p-3">
        {sc && (
          <div className="space-y-2 text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-neutral-300">
              <input
                type="checkbox"
                checked={sc.shuffle}
                onChange={() => updateItem(group, { shuffleConfig: createShuffleConfig({ ...sc, shuffle: !sc.shuffle }) })}
              />
              Shuffle items in this group
            </label>
            {sc.shuffle && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-neutral-400">using seed:</span>
                <select
                  className="rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
                  value={sc.seed}
                  onChange={e => updateItem(group, { shuffleConfig: createShuffleConfig({ ...sc, seed: e.target.value as SeedStrategy }) })}
                >
                  <option value={SeedStrategy.EXPERIMENT}>Experiment ID</option>
                  <option value={SeedStrategy.COHORT}>Cohort ID</option>
                  <option value={SeedStrategy.PARTICIPANT}>Participant ID</option>
                  <option value={SeedStrategy.CUSTOM}>Custom seed</option>
                </select>
                {sc.seed === SeedStrategy.CUSTOM && (
                  <input
                    type="text"
                    placeholder="Enter custom seed"
                    className="rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
                    value={sc.customSeed}
                    onChange={e => updateItem(group, { shuffleConfig: createShuffleConfig({ ...sc, customSeed: e.target.value }) })}
                  />
                )}
              </div>
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
          <AddMenu targetArr={group.items} isRoot={false} />
        </div>
        <PromptItemList items={group.items} isNested />
      </div>
    </details>
  )
}

function ItemEditor({ item }: { item: PromptItem }) {
  switch (item.type) {
    case PromptItemType.TEXT:
      return <TextItemEditor item={item as TextPromptItem} />
    case PromptItemType.CONTEXT: {
      const context = (item as PromptItem & { context?: string }).context
      const label = context === 'current'
        ? 'Context from current stage'
        : 'Context from all stages before and including this stage'
      return (
        <div className="cursor-default rounded bg-blue-900/40 px-3 py-1.5 text-sm font-medium text-blue-200">
          {label}
        </div>
      )
    }
    case PromptItemType.STAGE_CONTEXT:
      return <StageContextEditor item={item as StageContextPromptItem} />
    case PromptItemType.PROFILE_INFO:
      return (
        <details>
          <summary className="cursor-pointer list-none rounded bg-neutral-600/50 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-600/70">
            Profile info
          </summary>
          <div className="mt-1 px-3 py-2 text-sm text-neutral-400">Name, avatar, pronouns (if defined)</div>
        </details>
      )
    case PromptItemType.PROFILE_CONTEXT:
      return (
        <details>
          <summary className="cursor-pointer list-none rounded bg-neutral-600/50 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-600/70">
            Custom agent context
          </summary>
          <div className="mt-1 px-3 py-2 text-sm text-neutral-400">
            Context string provided when specific agent is created (or empty string if none)
          </div>
        </details>
      )
    case PromptItemType.GROUP:
      return <GroupEditor group={item as PromptItemGroup} />
    default:
      return null
  }
}

// ============================================================
// Recursive item list
// ============================================================

function PromptItemList({ items, isNested = false }: { items: PromptItem[]; isNested?: boolean }) {
  const { deleteItem, moveItem, reorderItems, updateItem, supportsConditions, conditionTargets } = useEditorCtx()
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  if (items.length === 0) {
    return (
      <p className={`py-2 text-sm text-neutral-500 ${isNested ? 'italic' : ''}`}>
        {isNested ? 'No items in group yet' : '⚠️ No items added yet'}
      </p>
    )
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index)) // required for Firefox
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
      // Adjust for the removal shifting indices when dropping below the source
      const to = dropIndex > dragIndex ? dropIndex - 1 : dropIndex
      reorderItems(items, dragIndex, to)
    }
    setDragIndex(null)
    setDropIndex(null)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDropIndex(null)
    }
  }

  const isNoOp = (drop: number) => drop === dragIndex || drop === dragIndex! + 1

  return (
    <div className="flex flex-col gap-1.5" onDragLeave={handleDragLeave}>
      {items.map((item, index) => {
        const hasCondition = item.condition !== undefined
        const showCondBtn = supportsConditions && conditionTargets.length > 0 && item.type !== PromptItemType.GROUP
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
              className={`group rounded-lg border bg-neutral-800 transition-opacity ${isNested ? 'ml-3 border-neutral-700/60' : 'border-neutral-700'} ${isDragging ? 'opacity-30' : ''}`}
            >
              <div className="flex items-start gap-2 p-2.5">
                <div
                  className="mt-0.5 shrink-0 cursor-grab select-none text-neutral-600 hover:text-neutral-400 active:cursor-grabbing transition-colors"
                  title="Drag to reorder"
                >
                  ⠿
                </div>
                <div className="min-w-0 flex-1">
                  <ItemEditor item={item} />
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {showCondBtn && (
                    <IconButton
                      icon="rule"
                      color={hasCondition ? 'primary' : 'neutral'}
                      title={hasCondition ? 'Remove display condition' : 'Add display condition'}
                      onClick={() => updateItem(item, {
                        condition: hasCondition
                          ? undefined
                          : createConditionGroup(ConditionOperator.AND, []),
                      })}
                    />
                  )}
                  <IconButton icon="arrow_upward" onClick={() => moveItem(items, index, -1)} />
                  <IconButton icon="arrow_downward" onClick={() => moveItem(items, index, 1)} />
                  <IconButton icon="close" onClick={() => deleteItem(items, index)} />
                </div>
              </div>
              {hasCondition && (
                <div className="mx-2.5 mb-2.5 rounded-md bg-neutral-900 p-2 text-xs text-neutral-400">
                  {/* Replace with real condition editor when available */}
                  Condition: {JSON.stringify(item.condition)}
                </div>
              )}
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
  stageId: string
  onUpdate: (prompt: PromptItem[]) => void
  stages?: Stage[]
  stageKind?: StageKind
  canEditStages?: boolean
  label?: string
}

export function StructuredPromptEditor({
  prompt,
  stageId,
  onUpdate,
  stages = [],
  stageKind,
  label = 'Prompt editor',
}: StructuredPromptEditorProps) {
  const currentIdx = stages.findIndex(s => s.id === stageId)
  const availableStages = currentIdx >= 0 ? stages.slice(0, currentIdx + 1) : []
  const supportsConditions = stageKind === StageKind.PRIVATE_CHAT
  // Wire up getConditionTargetsFromStages here when @deliberation-lab/utils is available
  const conditionTargets: ConditionTarget[] = []

  const ctx: EditorCtx = {
    updateItem: (item, updates) => onUpdate(treeUpdateItem(prompt, item, updates)),
    addItem: (targetArr, newItem) => onUpdate(treeAddTo(prompt, targetArr, newItem)),
    deleteItem: (targetArr, index) => onUpdate(treeRemoveFrom(prompt, targetArr, index)),
    moveItem: (targetArr, index, dir) => onUpdate(treeMoveIn(prompt, targetArr, index, dir)),
    reorderItems: (targetArr, from, to) => onUpdate(treeMoveFromTo(prompt, targetArr, from, to)),
    supportsConditions,
    conditionTargets,
    availableStages,
    stageId,
  }

  return (
    <EditorContext.Provider value={ctx}>
      <div className="rounded-lg border border-neutral-700 bg-neutral-900">
        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700/60">
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{label}</span>
          <AddMenu targetArr={prompt} isRoot />
        </div>
        <div className="p-3">
          <PromptItemList items={prompt} />
        </div>
      </div>
    </EditorContext.Provider>
  )
}

// ============================================================
// Example — one text item saying "hi"
// ============================================================

export function StructuredPromptEditorExample() {
  const [prompt, setPrompt] = useState<PromptItem[]>([
    { type: PromptItemType.TEXT, text: 'hi' } as TextPromptItem,
  ])

  return (
    <div className="space-y-3">
      <StructuredPromptEditor
        prompt={prompt}
        stageId=""
        onUpdate={setPrompt}
      />
      <details>
        <summary className="cursor-pointer text-xs text-neutral-600 hover:text-neutral-400">Prompt JSON</summary>
        <pre className="mt-1.5 overflow-auto rounded-md bg-neutral-800/50 p-3 text-xs text-neutral-400">
          {JSON.stringify(prompt, null, 2)}
        </pre>
      </details>
    </div>
  )
}
