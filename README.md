# The Den · website

A single-page 3D website for The Den (Coffee and Contemporary Culture), inside HUB Make Lab,
First United Building, 413 Escolta St, Binondo, Manila.

## Run it

```bash
npm install
npm run dev      # local preview at http://localhost:5173
npm run build    # production files in dist/
npm run preview  # serve the built dist/ locally
```

To publish, upload the contents of `dist/` to any static host (Netlify, Vercel, Cloudflare Pages,
or ordinary web hosting). The page must be served over http(s); opening `index.html` straight from
disk will not load the scripts.

## Where to edit things

| What | File |
| --- | --- |
| Menu items, descriptions, **prices** | `src/data/menu.js` |
| Hours, address, phone, email, links, Google rating | `src/data/site.js` |
| Page copy and section order | `index.html` |
| Colours, fonts, spacing | `src/styles/base.css` (the `:root` block) |
| Section layouts | `src/styles/sections.css` |
| 3D cup, splash, beans | `src/scene/` |

### Adding prices

The cafe's own site lists no prices, so none are shown. Add `price` (in pesos) to any item in
`src/data/menu.js` and it appears on the menu automatically:

```js
{ name: 'Latte', desc: 'Espresso shots with milk.', serve: BOTH, soy: true, price: 160 },
```

### Moving the 3D cup

The cup is pinned to empty "stage" elements in `index.html` marked `data-anchor`. Attributes on
each one control how the cup sits there (`data-fit` size, `data-rot` tilt, `data-lid`,
`data-splash`, `data-beans`). They are documented at the top of `src/scene/index.js`.

## Performance notes

The page was tuned on a laptop with integrated graphics (Intel Iris Xe, 1080p). Things that
were measured to cause stutter, and are deliberately avoided:

- **No `backdrop-filter` blur on cards or the nav.** A blurred, see-through panel over the
  animated 3D canvas has to be re-blurred every frame. Cards are opaque instead.
- **The Google map loads only when "Show map" is clicked.** The embed froze scrolling for a
  couple of seconds when it loaded by itself.
- **Cards are 3D only while hovered**, with no nested `translateZ` layers, and the glass
  illustrations use plain shapes (no `clipPath` or gradients).
- **The number of lights in the 3D scene never changes**, so shaders are not recompiled mid-scroll.

The 3D scene also throttles itself. `<html data-scene-mode>` shows the current mode:

| Mode | When | What it does |
| --- | --- | --- |
| `full` | default | every frame, all animation |
| `eco` | frames stay under about 45 fps | lowers resolution, then draws every other frame |
| `still` | still slow in `eco` | no idle animation; draws only on scroll or drag |
| `stills` | no usable GPU (software rendering) | one pre-rendered image per stage, WebGL shut down |

## Content sources

- Menu, about text, hours, contact details: thedenmanila.com
- Rating, price range, service options, address: the cafe's Google listing
- Building history (1928, 1936, 2016): Wikipedia, "First United Building"

The open/closed badge is worked out live from the hours in `site.js`, in Manila time.
