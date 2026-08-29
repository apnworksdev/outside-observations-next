import {createElement as h, useCallback, useEffect, useRef, useState} from 'react'
import {Button, Card, Flex} from '@sanity/ui'

/** Widths the site is rendered at inside the pane, whatever the pane's size. */
const DEVICES = {
  desktop: {label: 'Desktop', width: 1440},
  mobile: {label: 'Mobile', width: 390},
}

/**
 * "Preview" tab on writing articles: the real site page for this document's
 * draft. The iframe is laid out at a fixed device width and scaled to fit the
 * pane, so the article always previews with its true grid instead of
 * reflowing to the pane's viewport. A toggle switches desktop and mobile.
 */
export function ArticlePreviewPane({document}) {
  const id = document?.displayed?._id?.replace(/^drafts\./, '')
  const containerRef = useRef(null)
  const [size, setSize] = useState({width: 0, height: 0})
  const [device, setDevice] = useState('desktop')

  const measure = useCallback(() => {
    const node = containerRef.current
    if (!node) return
    setSize({width: node.clientWidth, height: node.clientHeight})
  }, [])

  useEffect(() => {
    measure()
    const node = containerRef.current
    if (!node || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [measure])

  if (!id) {
    return h('div', {style: {padding: 16}}, 'Save the document once to enable the preview.')
  }

  const deviceWidth = DEVICES[device].width
  // Mobile keeps a phone silhouette centred in the pane rather than being
  // blown up to the pane's full width.
  const scale =
    size.width > 0 ? Math.min(size.width / deviceWidth, device === 'mobile' ? 1 : 10) : 1
  const frameWidth = deviceWidth * scale

  return h(Flex, {direction: 'column', style: {height: '100%'}}, [
    h(
      Card,
      {key: 'bar', padding: 2, borderBottom: true},
      h(
        Flex,
        {gap: 2},
        Object.entries(DEVICES).map(([key, config]) =>
          h(Button, {
            key,
            text: config.label,
            mode: device === key ? 'default' : 'ghost',
            tone: device === key ? 'primary' : 'default',
            fontSize: 1,
            padding: 2,
            onClick: () => setDevice(key),
          })
        )
      )
    ),
    h(
      'div',
      {
        key: 'stage',
        ref: containerRef,
        style: {
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
        },
      },
      size.width > 0
        ? h(
            'div',
            {style: {width: frameWidth, height: '100%', overflow: 'hidden'}},
            h('iframe', {
              src: `/writings/preview/${id}`,
              title: 'Article preview',
              style: {
                width: deviceWidth,
                height: size.height / scale,
                border: 0,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              },
            })
          )
        : null
    ),
  ])
}
