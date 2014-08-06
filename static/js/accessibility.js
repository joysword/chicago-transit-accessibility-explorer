$(window).resize(function () {
    var h = $(window).height(),
      offsetTop = 105; // Calculate the top offset

    $('#map').css('height', (h - offsetTop));
}).resize();

(function(){
    var cached_layers = Object();
    var cached_json = Object();
    var cached_jenks = Object();
    var acc_layer = new L.FeatureGroup();
    var jenks_cutoffs;
    var category;
    var filename;
    var cache_index;

    var total_jobs = Object();
    total_jobs['C000'] = 7799056;
    total_jobs['CA01'] = 1742396;
    total_jobs['CA02'] = 4499672;
    total_jobs['CA03'] = 1556988;
    total_jobs['CE01'] = 1792024;
    total_jobs['CE02'] = 2554522;
    total_jobs['CE03'] = 3452510;
    total_jobs['CNS01'] = 5434;
    total_jobs['CNS02'] = 2584;
    total_jobs['CNS03'] = 31568;
    total_jobs['CNS04'] = 234456;
    total_jobs['CNS05'] = 743752;
    total_jobs['CNS06'] = 447880;
    total_jobs['CNS07'] = 838476;
    total_jobs['CNS08'] = 339312;
    total_jobs['CNS09'] = 175902;
    total_jobs['CNS10'] = 440452;
    total_jobs['CNS11'] = 115154;
    total_jobs['CNS12'] = 597846;
    total_jobs['CNS13'] = 154980;
    total_jobs['CNS14'] = 594738;
    total_jobs['CNS15'] = 759636;
    total_jobs['CNS16'] = 997110;
    total_jobs['CNS17'] = 155164;
    total_jobs['CNS18'] = 600296;
    total_jobs['CNS19'] = 293726;
    total_jobs['CNS20'] = 270590;
    total_jobs['CR01'] = 6078246;
    total_jobs['CR02'] = 1078502;
    total_jobs['CR03'] = 32466;
    total_jobs['CR04'] = 510526;
    total_jobs['CR05'] = 9548;
    total_jobs['CR07'] = 89768;
    total_jobs['CT01'] = 6647576;
    total_jobs['CT02'] = 1151480;
    total_jobs['CD01'] = 702402;
    total_jobs['CD02'] = 1374192;
    total_jobs['CD03'] = 1821398;
    total_jobs['CD04'] = 2158668;
    total_jobs['CS01'] = 3872382;
    total_jobs['CS02'] = 3926674;

    var map = L.map('map').fitBounds([[41.644286009999995, -87.94010087999999], [42.023134979999995, -87.52366115999999]]);;

    L.tileLayer('https://{s}.tiles.mapbox.com/v3/joysword.i6b4jale/{z}/{x}/{y}.png', {
        attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>'
    }).addTo(map);

    L.control.scale().addTo(map);

    var legend = L.control({position: 'bottomright'});
    legend.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'legend');
        var labels = [];
        var low;
        var high;
        $.each(cached_jenks[cache_index], function(i, v) {
            low = v;
            high = cached_jenks[cache_index][i+1];
            labels.push('<i style="background:' + get_color(low) + '"></i>' +
                low.toFixed(3) + '%' + (high ? '&ndash;' + high.toFixed(3) + '%': '+'));
        });
        div.innerHTML = '<div><strong>' + 'Legend' + '</strong><br />' + labels.join('<br />') + '</div>';
        return div;
    }

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

    // which filter to show?
    // age, earning, industry, race, ethnicity, education or gender
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
            default:
                $('#form-age').attr('class', 'no-disp');
                $('#form-earning').attr('class', 'no-disp');
                $('#form-industry').attr('class', 'no-disp');
                $('#form-race').attr('class', 'no-disp');
                $('#form-ethnicity').attr('class', 'no-disp');
                $('#form-education').attr('class', 'no-disp');
                $('#form-gender').attr('class', 'no-disp');
        }
    });

    // called when the button is clicked
    function show_map(e) {
        var type =  $('#select-type').val();
        var time =  $('#select-time').val();
        var threshold =  $('#select-threshold').val();
        var filter =  $('#select-filter').val();
        var age =  $('#select-age').val();
        var earning =  $('#select-earning').val();
        var industry =  $('#select-industry').val();
        var race =  $('#select-race').val();
        var ethnicity =  $('#select-ethnicity').val();
        var education =  $('#select-education').val();
        var gender =  $('#select-gender').val();
        if (type == "transit") {
            if (time == null) {
                $('#select-time').focus();
                return
            }
        }
        switch (filter) {
            case 'fi_age':
                if (age == null) {
                    $('#select-age').focus();
                    return
                }
                category = age;
                break;
            case 'fi_earning':
                if (earning == null) {
                    $('#select-earning').focus();
                    return
                }
                category = earning;
                break;
            case 'fi_industry':
                if (industry == null) {
                    $('#select-industry').focus();
                    return
                }
                category = industry;
                break;
            case 'fi_race':
                if (race == null) {
                    $('#select-race').focus();
                    return
                }
                category = race;
                break;
            case 'fi_ethnicity':
                if (ethnicity == null) {
                    $('#select-ethnicity').focus();
                    return
                }
                category = ethnicity;
                break;
            case 'fi_education':
                if (education == null) {
                    $('#select-education').focus();
                    return
                }
                category = education;
                break;
            case 'fi_gender':
                if (gender == null) {
                    $('#select-gender').focus();
                    return
                }
                category = gender;
                break;
            default:
                category = "C000"
        }
        $('#map').spin({lines: 12, length: 0, width: 8, radius: 12});

        filename = "static/json/acc_" + type + "_";

        if (type == "transit") {
            filename += time + "_";
        }
        filename += threshold + '.geojson';

        cache_index = category + '_' + filename;

        // if the layer is cached
        if (cache_index in cached_layers) {
            console.log('layer cached');
            
            // block 3
            $('#map').spin(false);
            try {
                legend.removeFrom(map);
            } catch(e) {};
            acc_layer.clearLayers();
            if (typeof acc_layer != 'undefined') {
                map.removeLayer(acc_layer);
            }
            
            acc_layer.addLayer(cached_layers[cache_index]).addTo(map);
            legend.addTo(map);
            map.fitBounds(acc_layer.getBounds());
            // end block 3

        }
        // if the geojson file is cached
        else if (filename in cached_json) {
            console.log('layer not cached, but json cached');

            // block 2
            var val = [];
            $.each(cached_json[filename].features, function(i, v) {
                val.push(100*v.properties[category]);
            });
            jenks_cutoffs = jenks(val, 7);
            jenks_cutoffs[0] = 0;
            jenks_cutoffs.pop();
            cached_jenks[cache_index] = jenks_cutoffs;

            cached_layers[cache_index] = L.geoJson(cached_json[filename].features, {
                style: acc_style,
                filter: acc_filter,
                onEachFeature: function(feature, layer) {
                    var content = 'Accessibility: ' + 100*feature.properties[category] + '% of ' + total_jobs[category] + ' jobs';
                    layer.bindLabel(content);
                }
            });
            // end block 2

            // block 3
            $('#map').spin(false);
            try {
                legend.removeFrom(map);
            } catch(e) {};
            acc_layer.clearLayers();
            if (typeof acc_layer != 'undefined') {
                map.removeLayer(acc_layer);
            }
            
            acc_layer.addLayer(cached_layers[cache_index]).addTo(map);
            legend.addTo(map);
            map.fitBounds(acc_layer.getBounds());
            // end block 3

        }
        else {
            console.log('nothing cached');

            $.getJSON($SCRIPT_ROOT + filename, function(data) {

                // block 1
                cached_json[filename] = data;
                // end block 1

                // block 2
                var val = [];
                $.each(cached_json[filename].features, function(i, v) {
                    val.push(v.properties[category]);
                });
                jenks_cutoffs = jenks(val, 7);
                jenks_cutoffs[0] = 0;
                jenks_cutoffs.pop();
                cached_jenks[cache_index] = jenks_cutoffs;

                cached_layers[cache_index] = L.geoJson(cached_json[filename].features, {
                    style: acc_style,
                    filter: acc_filter,
                    onEachFeature: function(feature, layer) {
                        var content = 'Accessibility: ' + 100*feature.properties[category] + '% of ' + total_jobs[category] + ' jobs';
                        layer.bindLabel(content);
                    }
                });
                // end block 2

                // block 3
                $('#map').spin(false);
                try {
                    legend.removeFrom(map);
                } catch(e) {};
                acc_layer.clearLayers();
                if (typeof acc_layer != 'undefined') {
                    map.removeLayer(acc_layer);
                }
                
                acc_layer.addLayer(cached_layers[cache_index]).addTo(map);
                legend.addTo(map);
                map.fitBounds(acc_layer.getBounds());
                // end block 3

            });
        }
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
            d > jenks_cutoffs[6] ? map_colors[7] :
            d > jenks_cutoffs[5] ? map_colors[6] :
            d > jenks_cutoffs[4] ? map_colors[5] :
            d > jenks_cutoffs[3] ? map_colors[4] :
            d > jenks_cutoffs[2] ? map_colors[3] :
            d > jenks_cutoffs[1] ? map_colors[2] :
            d > jenks_cutoffs[0] ? map_colors[1] :
                     map_colors[0];
        return color
    }

    function acc_style(feature) {
        return {
            fillColor: get_color(100*feature.properties[category]),
            weight: 0,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
        }
    }

    function acc_filter(feature, layer) {
        var show =  feature.properties.GEOID10 == '170979900000' ? false :
            feature.properties.GEOID10 == '170319900000' ? false :
            true;
        return show;
    }

})()