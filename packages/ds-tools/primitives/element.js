import merge from 'deepmerge'
import { forwardRef } from 'react'
import { jsx } from '@emotion/core'
import styled from '@emotion/styled'
import { withTheme } from 'emotion-theming'
import interpolate from '@styled-system/css'
import interpolate2 from './interpolate'

/** Base element (name is prefixed to the component) */
const rui = styled('div')()

const marginProps = [
  'margin',
  'marginX',
  'marginY',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight'
]

function Element(
  {
    css: cssProp,
    baseStyles: baseProp,
    style: inlineStyles,
    component,
    theme,

    ...props
  },
  ref
) {
  theme.components = theme.components || {}
  const margins = {}
  Object.keys(props).forEach(prop => {
    if (marginProps.includes(prop)) margins[prop] = props[prop]
  })

  let css
  if (typeof cssProp === 'function') css = cssProp(props)
  else css = cssProp

  let baseStyles
  if (typeof baseProp === 'function') baseStyles = baseProp(props)
  else baseStyles = baseProp

  // deep merge with overriding
  const merged = mergeAll(
    baseStyles || {},
    theme.components[component] || {},
    css || {},
    margins || {}
  )

  /** Allow nested component keys */
  walk(merged, node => {
    const keys = Object.keys(node)
    // capitalized = component name
    const capitalisedKeys = keys.filter(key => /^[A-Z]/.test(key))
    capitalisedKeys.forEach(key => {
      const transformedKey = `[data-component=${key}]`
      node[transformedKey] = node[key]
      delete node[key]
    })
  })

  // Better classNames for debugging
  props['data-component'] = component

  if (component) merged.label = component
  else if (typeof props.as === 'string') merged.label = props.as
  else if (props.as && typeof props.as.displayName === 'string') {
    merged.label = props.as.displayName
  } else {
    // give up
  }

  // instead of React.createElement
  return jsx(rui, {
    // interpolate twice to alllow tokens inside theme,
    // there is an obvious cost to this which needs to be benchmarked
    // alternate solution is to flatten this in themeprovider
    css:
      component === 'Button'
        ? interpolate2(merged)(theme)
        : interpolate(interpolate(merged)(theme))(theme),
    style: interpolate(interpolate(inlineStyles)(theme))(theme),
    ref,
    ...props
  })
}

function mergeAll(a, b, c, d) {
  return merge(merge(merge(a, b), c), d)
}

function walk(obj, callback) {
  if (typeof obj === 'object') {
    callback(obj)
    Object.values(obj).map(node => walk(node, callback))
  }
}

export default withTheme(forwardRef(Element))
