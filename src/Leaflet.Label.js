L.Label = L.Popup.extend({

    options: {
        pane: 'labelPane',
        offset: [6, -6],
        direction: 'auto',
        permanent: false,
        sticky: false,
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
        map.fire('labelopen', {label: this});
        if (this._source) this._source.fire('labelopen', {label: this}, true);
    },

    onRemove: function (map) {
        L.DomUtil.remove(this._container);
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

L.label = function (options, source) {
    return new L.Label(options, source);
};

L.Map.include({

    openLabel: function (label, latlng, options) {
        if (!(label instanceof L.Label)) label = new L.Label(options).setContent(label);
        if (latlng) label.setLatLng(latlng);
        if (this.hasLayer(label)) return this;
        return this.addLayer(label);
    },

    closeLabel: function (label) {
        if (label) this.removeLayer(label);
        return this;
    }

});

L.Map.addInitHook(function () {
    this._labelPane = this.createPane('labelPane');
});

L.Layer.include({

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

    toggleLabel: function (target) {
        if (this._label) {
            if (this._label._map) this.closeLabel();
            else this.openLabel(target);
        }
        return this;
    },

    isLabelOpen: function () {
        return this._label.isOpen();
    },

    setLabelContent: function (content) {
        if (this._label) this._label.setContent(content);
        return this;
    },

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

L.Icon.Default.mergeOptions({
    labelAnchor: [12, -28],
});
