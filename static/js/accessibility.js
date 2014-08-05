$(window).resize(function () {
    var h = $(window).height(),
      offsetTop = 105; // Calculate the top offset

    $('#map').css('height', (h - offsetTop));
}).resize();

(function(){
    var acc_layer = new L.FeatureGroup();
    var map = L.map('map').fitBounds([[41.644286009999995, -87.94010087999999], [42.023134979999995, -87.52366115999999]]);;

    L.tileLayer('https://{s}.tiles.mapbox.com/v3/joysword.i6b4jale/{z}/{x}/{y}.png', {
        attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>'
    }).addTo(map);

    var drawnItems = L.featureGroup().addTo(map);

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
        drawnItems.clearLayers();
        drawnItems.addLayer(e.layer);
        this.dataLayer = e.layer.toGeoJSON();
    }

    function draw_edit(e) {
        drawnItems.clearLayers();
    }

    function draw_edit(e) {
        var layers = e.layers;
        drawnItems.clearLayers();
        var self = this;
        layers.eachLayer(function(layer){
            self.dataLayer = layer.toGeoJSON();
            self.drawnItems.addLayer(layer);
        });
    }

    function draw_delete(e){
        acc_layer.clearLayers();
        drawnItems.clearLayers();
    }

    // which type? auto or transit
    $('#select-type').change(function(){
        switch (this.value) {
            case "auto":
                $('#form-time').addClass('no-disp');
                break;
            case "transit":
                $('#form-time').removeClass('no-disp');
                break;
        }
    });

    // which filter? age, earning, industry, race, ethnicity, education or gender
    $('#select-filter').change(function(){
        switch (this.value) {
            case "fi_age":
                $('#form-age').attr('class', '');
                $('#form-earning').attr('class', 'no-disp');
                $('#form-industry').attr('class', 'no-disp');
                $('#form-race').attr('class', 'no-disp');
                $('#form-ethnicity').attr('class', 'no-disp');
                $('#form-education').attr('class', 'no-disp');
                $('#form-gender').attr('class', 'no-disp');
                break;
            case "fi_earning":
                $('#form-age').attr('class', 'no-disp');
                $('#form-earning').attr('class', '');
                $('#form-industry').attr('class', 'no-disp');
                $('#form-race').attr('class', 'no-disp');
                $('#form-ethnicity').attr('class', 'no-disp');
                $('#form-education').attr('class', 'no-disp');
                $('#form-gender').attr('class', 'no-disp');
                break;
            case "fi_industry":
                $('#form-age').attr('class', 'no-disp');
                $('#form-earning').attr('class', 'no-disp');
                $('#form-industry').attr('class', '');
                $('#form-race').attr('class', 'no-disp');
                $('#form-ethnicity').attr('class', 'no-disp');
                $('#form-education').attr('class', 'no-disp');
                $('#form-gender').attr('class', 'no-disp');
                break;
            case "fi_race":
                $('#form-age').attr('class', 'no-disp');
                $('#form-earning').attr('class', 'no-disp');
                $('#form-industry').attr('class', 'no-disp');
                $('#form-race').attr('class', '');
                $('#form-ethnicity').attr('class', 'no-disp');
                $('#form-education').attr('class', 'no-disp');
                $('#form-gender').attr('class', 'no-disp');
                break;
            case "fi_ethnicity":
                $('#form-age').attr('class', 'no-disp');
                $('#form-earning').attr('class', 'no-disp');
                $('#form-industry').attr('class', 'no-disp');
                $('#form-race').attr('class', 'no-disp');
                $('#form-ethnicity').attr('class', '');
                $('#form-education').attr('class', 'no-disp');
                $('#form-gender').attr('class', 'no-disp');
                break;
            case "fi_education":
                $('#form-age').attr('class', 'no-disp');
                $('#form-earning').attr('class', 'no-disp');
                $('#form-industry').attr('class', 'no-disp');
                $('#form-race').attr('class', 'no-disp');
                $('#form-ethnicity').attr('class', 'no-disp');
                $('#form-education').attr('class', '');
                $('#form-gender').attr('class', 'no-disp');
                break;
            case "fi_gender":
                $('#form-age').attr('class', 'no-disp');
                $('#form-earning').attr('class', 'no-disp');
                $('#form-industry').attr('class', 'no-disp');
                $('#form-race').attr('class', 'no-disp');
                $('#form-ethnicity').attr('class', 'no-disp');
                $('#form-education').attr('class', 'no-disp');
                $('#form-gender').attr('class', '');
                break;
        }
    });

    function show_map(e) {
        if ($('#select-type').val() == "transit") {
            if ($('#select-time').val() == null) {
                console.log('in');
                $('#select-time').focus();
                return
            }
        }
        switch ($('#select-filter').val()) {
            case 'fi_age':
                if ($('#select-age').val() == null) {
                    $('#select-age').focus();
                    return
                }
            case 'fi_earning':
                if ($('#select-earning').val() == null) {
                    $('#select-earning').focus();
                    return
                }
            case 'fi_industry':
                if ($('#select-industry').val() == null) {
                    $('#select-industry').focus();
                    return
                }
            case 'fi_race':
                if ($('#select-race').val() == null) {
                    $('#select-race').focus();
                    return
                }
            case 'fi_ethnicity':
                if ($('#select-ethnicity').val() == null) {
                    $('#select-ethnicity').focus();
                    return
                }
            case 'fi_education':
                if ($('#select-education').val() == null) {
                    $('#select-education').focus();
                    return
                }
            case 'fi_gender':
                if ($('#select-gender').val() == null) {
                    $('#select-gender').focus();
                    return
                }
        }
        console.log('out switch');
        $('#map').spin({lines: 12, length: 0, width: 8, radius: 12});
        $.getJSON($SCRIPT_ROOT + '/showmap', {
            type: $('#select-type').val(),
            time: $('#select-time').val(),
            threshold: $('#select-threshold').val(),
            filter: $('#select-filter').val(),
            age: $('#select-age').val(),
            earning: $('#select-earning').val(),
            industry: $('#select-industry').val(),
            race: $('#select-race').val(),
            ethnicity: $('#select-ethnicity').val(),
            education: $('#select-education').val(),
            gender: $('#select-gender').val(),
        }, function(data) {
            acc_layer.clearLayers();
            if (typeof acc_layer != 'undefined') {
                map.removeLayer(acc_layer);
            }
            $('#map').spin(false);
            acc_layer.addLayer(L.geoJson(data.ret.features, {
                style: acc_style,
                onEachFeature: function(feature, layer) {
                    var content = '<h4>GEOID: ' + feature.properties.GEOID10 + '</h4><br><h4>Accessibility: ' + 100*feature.properties.C000 + '%</h4>';
                    layer.bindLabel(content);
                }
            })).addTo(map);
            map.fitBounds(acc_layer.getBounds());
        });
    }

    $('#btn-submit').on('click', show_map);

    var map_colors1 = [
        '#deebf7',
        '#c6dbef',
        '#9ecae1',
        '#6baed6',
        '#4292c6',
        '#2171b5',
        '#084594'
    ]

    var map_colors = [
        '#f7fcf5',
        '#e5f5e0',
        '#c7e9c0',
        '#a1d99b',
        '#74c476',
        '#41ab5d',
        '#238b45',
        '#005a32'
    ]

    function get_color(d) {
        var color = 
            d > 0.40 ? map_colors[7] :
            d > 0.27 ? map_colors[6] :
            d > 0.18 ? map_colors[5] :
            d > 0.11 ? map_colors[4] :
            d >  0.06 ? map_colors[3] :
            d >  0.03 ? map_colors[2] :
            d >  0 ? map_colors[1] :
                     map_colors[0];
        return color
    }

    function acc_style(feature) {
        return {
            fillColor: get_color(100*feature.properties.C000),
            weight: 0,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
        }
    }

})()