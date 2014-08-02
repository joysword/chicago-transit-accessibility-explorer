$(window).resize(function () {
    var h = $(window).height(),
      offsetTop = 105; // Calculate the top offset

    $('#map').css('height', (h - offsetTop));
}).resize();

(function(){
    var grid_layer = new L.FeatureGroup();
    var jenks_cutoffs;
    //var map = L.mapbox.map('map', 'joysword.i6b4jale').setView([41.8910,-87.6839], 11);
    var map = L.map('map', {center:[41.8910,-87.6839], zoom: 11});

    L.tileLayer('https://{s}.tiles.mapbox.com/v3/joysword.i6b4jale/{z}/{x}/{y}.png', {
        attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>'
    }).addTo(map);


    var drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    var drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems
        },
        draw: {
            polyline: false,
            marker: false,
            circle: {
                shapeOptions: {
                    'color': '#123456',
                    'opacity': 0.4,
                    'fillOpacity': 0
                }
            },
            polygon: {
                shapeOptions: {
                    'color': '#123456',
                    'opacity': 0.4,
                    'fillOpacity': 0
                }
            },
            rectangle: {
                shapeOptions: {
                    'color': '#123456',
                    'opacity': 0.4,
                    'fillOpacity': 0
                }
            }
        }
    });

    map.addControl(drawControl);
    map.on('draw:created', draw_create);
    map.on('draw:edited', draw_edit);
    map.on('draw:deleted', draw_delete);
    map.on('draw:drawstart', draw_delete);

    function draw_create(e) {
        this.drawnItems.clearLayers();
        this.drawnItems.addLayer(e.layer);
        this.dataLayer = e.layer.toGeoJSON();
    }

    function draw_edit(e) {
        this.drawnItems.clearLayers();
    }

    function draw_edit(e) {
        var layers = e.layers;
        this.drawnItems.clearLayers();
        var self = this;
        layers.eachLayer(function(layer){
            self.dataLayer = layer.toGeoJSON();
            self.drawnItems.addLayer(layer);
        });
    }
})()