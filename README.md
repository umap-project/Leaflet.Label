# Leaflet.Label

Leaflet.Label reboot.

[Demo](http://umap-project.github.io/Leaflet.Label/).

Includes:

- Leaflet 1.0.0 support
- polygons and polylines support
- top and bottom label direction

May eventually be included in core, see https://github.com/Leaflet/Leaflet/pull/3952


## API

- layer.bindLabel(content or label, options)

- layer.unbindLabel()

- layer.openLabel()

- layer.closeLabel()


## Options

- **direction**=auto *auto, left, right, top, bottom* Where to display the label relatively to the feature.
- **offset**=[6, 6] *[x, y]* Offset of the label relatively to the feature center point.
- **permanent**=false *boolean* Always visible, or only on mouse over.
- **sticky**=false *boolean* Follow the mouse instead of being fixed at the center.
- **interactve**=false **boolean** Receive mouse events just like the feature it is attached to.
- **opacity**=0.8 **float** Opacity of the label, between 0 and 1.
