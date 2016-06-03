
// 🍂class Label
// 🍂inherits Popup

L.Label = L.Popup.extend({
    // 🍂section
    // 🍂aka Label options
    options: {
        pane: 'labelPane',
        offset: [6, -6],

        // 🍂option direction: String = 'auto'
        // Where to display the label relative to the layer it belongs to. Valid
        // values are: `'auto'`, `'left'`, `'right'`, `'top'`, `'bottom'` and `'center'`.
        direction: 'auto',

        // 🍂option permanent: Boolean = false
        // When `false`, the label will be shown only on mouse hover. When `true` it
        // will be always shown.
        permanent: false,

        // 🍂option sticky: Boolean = false
        // When `true`, the label will follow the mouse position when hovering
        sticky: false,

        // 🍂option interactive: Boolean = false
        // Whether the label receives [mouse events](#marker-event).
        interactive: false,
        opacity: 0.8
    },

    getEvents: function () {
        var events = {
            zoom: this._updatePosition,
            viewreset: this._updatePosition
        };

        if (this._zoomAnimated) events.zoomanim = this._animateZoom;
        return events;
    },

    onAdd: function (map) {
        this._zoomAnimated = this._zoomAnimated && this.options.zoomAnimation;
        if (!this._container) this._initLayout();
        this.getPane().appendChild(this._container);
        this.update();
        L.DomUtil.setOpacity(this._container, this.options.opacity);
        this.bringToFront();

        // 🍂namespace Map
        // 🍂section Label events
        // 🍂event labelopen: LabelEvent
        // Fired when a `Label` is added (shown) in the map
        map.fire('labelopen', {label: this});
        if (this._source) this._source.fire('labelopen', {label: this}, true);
    },

    onRemove: function (map) {
        L.DomUtil.remove(this._container);
        // 🍂event labelclose: LabelEvent
        // Fired when a `Label` is removed (hidden) in the map
        map.fire('labelclose', {label: this});
        if (this._source) this._source.fire('labelclose', {label: this}, true);
    },

    _close: function () {
        if (this._map) this._map.closeLabel(this);
    },

    _initLayout: function () {
        var prefix = 'leaflet-label',
            className = prefix + ' ' + (this.options.className || '') + ' leaflet-zoom-' + (this._zoomAnimated ? 'animated' : 'hide');

        this._contentNode = this._container = L.DomUtil.create('div', className);
    },

    _updateLayout: function () {},

    _adjustPan: function () {},

    _setPosition: function (pos) {
        var map = this._map,
            container = this._container,
            centerPoint = map.latLngToContainerPoint(map.getCenter()),
            labelPoint = map.layerPointToContainerPoint(pos),
            direction = this.options.direction,
            labelWidth = container.offsetWidth,
            labelHeight = container.offsetHeight,
            offset = L.point(this.options.offset),
            anchor = this._getAnchor();

        if (direction === 'top') {
            pos = pos.add(L.point(-labelWidth / 2, -labelHeight + offset.y + anchor.y));
        } else if (direction === 'bottom') {
            pos = pos.subtract(L.point(labelWidth / 2, offset.y));
        } else if (direction === 'center') {
            pos = pos.subtract(L.point(labelWidth / 2, labelHeight / 2 - anchor.y));
        } else if (direction === 'right' || direction === 'auto' && labelPoint.x < centerPoint.x) {
            direction = 'right';
            pos = pos.add([offset.x + anchor.x, anchor.y - labelHeight / 2]);
        } else {
            direction = 'left';
            pos = pos.subtract(L.point(offset.x + labelWidth + anchor.x, labelHeight / 2 - anchor.y));
        }

        L.DomUtil.removeClass(container, 'leaflet-label-right');
        L.DomUtil.removeClass(container, 'leaflet-label-left');
        L.DomUtil.removeClass(container, 'leaflet-label-top');
        L.DomUtil.removeClass(container, 'leaflet-label-bottom');
        L.DomUtil.addClass(container, 'leaflet-label-' + direction);
        L.DomUtil.setPosition(container, pos);
    },

    _updatePosition: function () {
        var pos = this._map.latLngToLayerPoint(this._latlng);
        this._setPosition(pos);
    },

    setOpacity: function (opacity) {
        this.options.opacity = opacity;
        if (this._container) L.DomUtil.setOpacity(this._container, opacity);
    },

    _animateZoom: function (e) {
        var pos = this._map._latLngToNewLayerPoint(this._latlng, e.zoom, e.center);
        this._setPosition(pos);
    },

    _getAnchor: function () {
        // Where should we anchor the label on the source layer?
        return L.point(this._source._getLabelAnchor && !this.options.sticky ? this._source._getLabelAnchor() : [0, 0]);
    }

});

// 🍂class Label
// 🍂factory L.label(options?: Label options, source?: Layer)
// Instantiates a new `Label` object given its options and the `Layer` this label
// belongs to.
L.label = function (options, source) {
    return new L.Label(options, source);
};

// 🍂namespace Map
// 🍂section Methods for Layers and Controls
L.Map.include({

    // 🍂method openLabel(label: Label): this
    // Opens the specified label.
    // 🍂alternative
    // 🍂method openLabel(content: String|HTMLElement, latlng: LatLng, options?: Label options): this
    // Creates a label with the specified content and options and open it.
    openLabel: function (label, latlng, options) {
        if (!(label instanceof L.Label)) label = new L.Label(options).setContent(label);
        if (latlng) label.setLatLng(latlng);
        if (this.hasLayer(label)) return this;
        return this.addLayer(label);
    },

    // 🍂method closeLabel(label: Label): this
    // Closes the given label.
    closeLabel: function (label) {
        if (label) this.removeLayer(label);
        return this;
    }

});

L.Map.addInitHook(function () {
    // 🍂pane labelPane = 650
    // Pane for `Label`s.
    this._labelPane = this.createPane('labelPane');
});


// 🍂namespace Layer
// 🍂section Label methods
L.Layer.include({

    // 🍂method bindLabel(content: String|HTMLElement|Function|Label, options?: Label options): this
    // Binds a label to the layer with the passed `content` and sets up the
    // neccessary event listeners. If a `Function` is passed it will receive
    // the layer as the first argument and should return a `String` or `HTMLElement`.
    bindLabel: function (content, options) {

        if (content instanceof L.Label) {
            L.setOptions(content, options);
            this._label = content;
            content._source = this;
        } else {
            if (!this._label || options) {
                this.unbindLabel();
                this._label = L.label(options, this);
            }
            this._label.setContent(content);

        }
        this._initLabelInteractions();
        if (this._label.options.permanent) { this.openLabel(); }
        return this;
    },

    // 🍂method unbindLabel(): this
    // Removes the label previously bound with `bindLabel`.
    unbindLabel: function () {
        if (this._label) {
            this._initLabelInteractions(true);
            this.closeLabel();
            this._label = null;
        }
        return this;
    },

    _initLabelInteractions: function (remove) {
        if (!remove && this._labelHandlersAdded) return;
        var onOff = remove ? 'off' : 'on',
            events = {
                remove: this.closeLabel,
                move: this._moveLabel
            };
        if (!this._label.options.permanent) {
            events.mouseover = this._openLabel;
            events.mouseout = this.closeLabel;
            if (this._label.options.sticky) events.mousemove = this._moveLabel;
            if (L.Browser.touch) events.click = this._openLabel;
        }
        this[onOff](events);
        this._labelHandlersAdded = !remove;
    },

    // 🍂method openLabel(latlng?: LatLng): this
    // Opens the bound label at the specificed `latlng` or at the default label anchor if no `latlng` is passed.
    openLabel: function (layer, latlng) {
        if (!(layer instanceof L.Layer)) {
            latlng = layer;
            layer = this;
        }

        if (layer instanceof L.FeatureGroup) {
            for (var id in this._layers) {
                layer = this._layers[id];
                break;
            }
        }

        latlng = latlng || (layer.getCenter ? layer.getCenter() : layer.getLatLng());

        if (this._label && this._map) {

            // set label source to this layer
            this._label._source = layer;

            // update the label (content, layout, ect...)
            this._label.update();

            // open the label on the map
            this._map.openLabel(this._label, latlng);

            if (this._label.options.interactive) {
                L.DomUtil.addClass(this._label._container, 'leaflet-clickable');
                this.addInteractiveTarget(this._label._container);
            }
        }

        return this;
    },

    // 🍂method closeLabel(): this
    // Closes the label bound to this layer if it is open.
    closeLabel: function () {
        if (this._label) {
            this._label._close();
            // Label container may not be defined if not permanent and never
            /// opened.
            if (this._label.options.interactive && this._label._container) {
                L.DomUtil.removeClass(this._label._container, 'leaflet-clickable');
                this.removeInteractiveTarget(this._label._container);
            }
        }
        return this;
    },

    // 🍂method toggleLabel(): this
    // Opens or closes the label bound to this layer depending on its current state.
    toggleLabel: function (target) {
        if (this._label) {
            if (this._label._map) this.closeLabel();
            else this.openLabel(target);
        }
        return this;
    },

    // 🍂method isLabelOpen(): boolean
    // Returns `true` if the label bound to this layer is currently open.
    isLabelOpen: function () {
        return this._label.isOpen();
    },

    // 🍂method setLabelContent(content: String|HTMLElement|Label): this
    // Sets the content of the label bound to this layer.
    setLabelContent: function (content) {
        if (this._label) this._label.setContent(content);
        return this;
    },

    // 🍂method getLabel(): Label
    // Returns the label bound to this layer.
    getLabel: function () {
        return this._label;
    },

    _openLabel: function (e) {
        var layer = e.layer || e.target;

        if (!this._label || !this._map) return;
        this.openLabel(layer, this._label.options.sticky ? e.latlng : undefined);
    },

    _moveLabel: function (e) {
        var latlng = e.latlng, containerPoint, layerPoint;
        if (this._label.options.sticky && e.originalEvent) {
            containerPoint = this._map.mouseEventToContainerPoint(e.originalEvent);
            layerPoint = this._map.containerPointToLayerPoint(containerPoint);
            latlng = this._map.layerPointToLatLng(layerPoint);
        }
        this._label.setLatLng(latlng);
    }
});


L.Marker.include({
    _getLabelAnchor: function () {
        return this.options.icon.options.labelAnchor || [0, 0];
    }
});

// 🍂namespace Icon
L.Icon.Default.mergeOptions({
    // 🍂option labelAnchor
    // The coordinates of the point from which labels will "open", relative to the icon anchor.
    labelAnchor: [12, -28],
});


/*
🍂namespace Event objects
🍂miniclass LabelEvent (Event objects)
🍂inherits Event
🍂property label: Label
The label that was opened or closed.
*/
