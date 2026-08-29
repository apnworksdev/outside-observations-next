import {createElement as h, useCallback, useMemo, useState} from 'react'
import {set} from 'sanity'
import {Stack, Text} from '@sanity/ui'

const LINES = 12
const MAX_END = LINES + 1

/**
 * Visual replacement for the "Starts at line" + "Width" number fields of a
 * text section: a 12-cell band mirroring the site grid. Click a cell to move
 * the block there (same width), click and drag to paint start and width in
 * one gesture. Writes into the same startColumn / columnSpan fields, so the
 * data model and every existing article stay untouched.
 */
export function ColumnBandInput(props) {
  const {value = {}, onChange, renderDefault} = props
  const start = Number.isFinite(value.startColumn) ? value.startColumn : 2
  const span = Number.isFinite(value.columnSpan) ? value.columnSpan : 8
  // Two-click selection: first click anchors the start, second click sets the
  // end. Between the two, hovering previews the band.
  const [anchor, setAnchor] = useState(null)
  const [hovered, setHovered] = useState(null)

  const apply = useCallback(
    (nextStart, nextSpan) => {
      const safeSpan = Math.max(1, Math.min(LINES, nextSpan))
      const safeStart = Math.max(1, Math.min(MAX_END - safeSpan, nextStart))
      onChange([set(safeStart, ['startColumn']), set(safeSpan, ['columnSpan'])])
    },
    [onChange]
  )

  const shown = useMemo(() => {
    if (anchor !== null) {
      const target = hovered ?? anchor
      return {from: Math.min(anchor, target), to: Math.max(anchor, target)}
    }
    return {from: start, to: start + span - 1}
  }, [anchor, hovered, start, span])

  const handleClick = useCallback(
    (line) => {
      if (anchor === null) {
        setAnchor(line)
        setHovered(line)
        return
      }
      const a = Math.min(anchor, line)
      const b = Math.max(anchor, line)
      apply(a, b - a + 1)
      setAnchor(null)
      setHovered(null)
    },
    [anchor, apply]
  )

  const cells = Array.from({length: LINES}, (_, i) => {
    const line = i + 1
    const active = line >= shown.from && line <= shown.to
    return h(
      'div',
      {
        key: line,
        onClick: () => handleClick(line),
        onPointerEnter: () => {
          if (anchor !== null) setHovered(line)
        },
        style: {
          flex: 1,
          height: 44,
          borderRadius: 3,
          cursor: 'pointer',
          border: '1px solid var(--card-border-color)',
          background: active ? 'var(--card-focus-ring-color, #556bfc)' : 'var(--card-bg-color)',
          opacity: active ? 0.85 : 1,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 4,
          fontSize: 10,
          color: active ? '#fff' : 'var(--card-muted-fg-color)',
          userSelect: 'none',
          touchAction: 'none',
        },
      },
      String(line)
    )
  })

  return h(Stack, {space: 3}, [
    h(Text, {key: 'label', size: 1, weight: 'medium'}, 'Position on the grid'),
    h(
      'div',
      {
        key: 'band',
        style: {display: 'flex', gap: 3},
      },
      cells
    ),
    h(
      Text,
      {key: 'caption', size: 1, muted: true},
      anchor !== null
        ? 'Now click the last column of the block.'
        : `Line ${shown.from} to ${shown.to + 1}, ${shown.to - shown.from + 1} column(s) wide. First click sets the start, second click sets the end.`
    ),
    h('div', {key: 'rest'}, renderDefault(props)),
  ])
}
