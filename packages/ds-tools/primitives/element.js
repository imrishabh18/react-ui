import merge from 'deepmerge'
import { forwardRef } from 'react'
import { jsx } from '@emotion/core'
import styled from '@emotion/styled'
import { withTheme } from 'emotion-theming'
import interpolate from './interpolate'

const clone = obj => merge(obj, {})

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
    css: cssProp = {},
    style: inlineStyles = {},
    variant = 'default',
    size = 'medium',
    component,
    theme,
    ...props
  },
  ref
) {
  const margins = {}
  Object.keys(props).forEach(prop => {
    if (marginProps.includes(prop)) margins[prop] = props[prop]
  })

  let css
  if (typeof cssProp === 'function') css = cssProp(props)
  else css = clone(cssProp)

  // if variant prop is given, attach the prop to css

  if (
    variant &&
    theme.components[component] &&
    theme.components[component].variants &&
    theme.components[component].variants[variant]
  ) {
    css.variant = component + '.variants.' + variant
  }

  if (size && theme.sizes && theme.sizes[component]) {
    const width = css.width || css.size
    const height = css.height || css.size

    let value
    if (typeof theme.sizes[component] !== 'object') {
      // single value, attach to component
      value = theme.sizes[component]
    } else {
      // if its multiple values, attach the corresponding key
      value = theme.sizes[component][size]
    }

    // if the component already has a height / width property,
    // respect that and attach to the other property only
    if (!width && !height) css.size = value
    else {
      if (!width) css.width = value
      if (!height) css.height = value
    }
  }

  let label
  if (component) label = component
  else if (typeof props.as === 'string') label = props.as
  else if (props.as && typeof props.as.displayName === 'string') {
    label = props.as.displayName
  } else {
    // give up
    label = 'Element'
  }

  // deep merge with overriding
  let merged = mergeAll(
    theme.components[component],
    theme[component],
    css,
    margins
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
  props['data-component'] = label
  merged.label = label

  // instead of React.createElement
  return jsx(rui, {
    // interpolate twice to alllow tokens inside theme,
    // there is an obvious cost to this which needs to be benchmarked
    // alternate solution is to flatten this in themeprovider

    css: interpolate(merged)(theme),
    style: interpolate(inlineStyles)(theme),
    ref,
    ...props
  })
}

function mergeAll(a = {}, b = {}, c = {}, d = {}) {
  return merge(merge(merge(a, b), c), d)
}

function walk(obj, callback) {
  if (typeof obj === 'object') {
    callback(obj)
    Object.values(obj).map(node => walk(node, callback))
  }
}

export default withTheme(forwardRef(Element))
