'use client'

export type StructuredOutputDataType = 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN'

export interface StructuredOutputSchema {
  type: StructuredOutputDataType
  description: string
}

export interface StructuredOutputFieldDef {
  name: string
  schema: StructuredOutputSchema
}

const DATA_TYPES: StructuredOutputDataType[] = ['STRING', 'NUMBER', 'INTEGER', 'BOOLEAN']

const inputClass = 'w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-500 resize-none'
const labelClass = 'text-sm font-medium text-neutral-400'

export function StructuredOutputField({ field, fieldIndex, disabled, descriptionOnly, onUpdateName, onUpdateType, onUpdateDescription, onDelete }: {
  field: StructuredOutputFieldDef
  fieldIndex: number
  disabled?: boolean
  descriptionOnly?: boolean
  onUpdateName: (index: number, name: string) => void
  onUpdateType: (index: number, type: StructuredOutputDataType) => void
  onUpdateDescription: (index: number, description: string) => void
  onDelete: (index: number) => void
}) {
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 grid grid-cols-3 gap-3">

          <div className="space-y-1.5">
            <label className={labelClass}>Field name</label>
            <input
              type="text"
              value={field.name}
              disabled={disabled || descriptionOnly}
              onChange={e => onUpdateName(fieldIndex, e.target.value)}
              placeholder="e.g. response"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Field type</label>
            <select
              value={field.schema.type}
              onChange={e => onUpdateType(fieldIndex, e.target.value as StructuredOutputDataType)}
              disabled={disabled || descriptionOnly}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-500 cursor-pointer disabled:opacity-50"
            >
              {DATA_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Field description</label>
            <textarea
              value={field.schema.description}
              disabled={disabled}
              onChange={e => onUpdateDescription(fieldIndex, e.target.value)}
              placeholder="Describe what this field represents…"
              rows={2}
              className={inputClass}
            />
          </div>

        </div>

        <button
          onClick={() => onDelete(fieldIndex)}
          disabled={disabled || descriptionOnly}
          title="Remove field"
          className="mt-0.5 w-6 h-6 flex items-center justify-center rounded text-sm text-neutral-500 hover:text-neutral-200 hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          ×
        </button>
      </div>
    </div>
  )
}
