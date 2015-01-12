$(window).resize(function () {
    var h = $(window).height(),
      offsetTop = 105; // Calculate the top offset

    $('#map').css('height', (h - offsetTop));
}).resize();

(function(){
    var cached_layers = {};
    var cached_json = {};
    var cached_jenks = {};
    var acc_layer = new L.FeatureGroup();
    var jenks_cutoffs;
    var category;
    var filename;
    var cache_index;
    var cta_layer = new L.FeatureGroup();
    var metra_layer = new L.FeatureGroup();
    var highway_layer = new L.FeatureGroup();
    var cta_line_names = ["blue", "brown", "green", "orange", "pink", "purple", "red", "yellow"];

    var total_jobs = {};
    total_jobs['C000'] = 3899528;
    total_jobs['CA01'] = 871198;
    total_jobs['CA02'] = 2249836;
    total_jobs['CA03'] = 778494;
    total_jobs['CE01'] = 896012;
    total_jobs['CE02'] = 1277261;
    total_jobs['CE03'] = 1726255;
    total_jobs['CNS01'] = 2717;
    total_jobs['CNS02'] = 1292;
    total_jobs['CNS03'] = 15784;
    total_jobs['CNS04'] = 117228;
    total_jobs['CNS05'] = 371876;
    total_jobs['CNS06'] = 223940;
    total_jobs['CNS07'] = 419238;
    total_jobs['CNS08'] = 169656;
    total_jobs['CNS09'] = 87951;
    total_jobs['CNS10'] = 220226;
    total_jobs['CNS11'] = 57577;
    total_jobs['CNS12'] = 298923;
    total_jobs['CNS13'] = 77490;
    total_jobs['CNS14'] = 297369;
    total_jobs['CNS15'] = 379818;
    total_jobs['CNS16'] = 498555;
    total_jobs['CNS17'] = 77582;
    total_jobs['CNS18'] = 300148;
    total_jobs['CNS19'] = 146863;
    total_jobs['CNS20'] = 135295;
    total_jobs['CR01'] = 3039123;
    total_jobs['CR02'] = 539251;
    total_jobs['CR03'] = 16233;
    total_jobs['CR04'] = 255263;
    total_jobs['CR05'] = 4774;
    total_jobs['CR07'] = 44884;
    total_jobs['CT01'] = 3323788;
    total_jobs['CT02'] = 575740;
    total_jobs['CD01'] = 351201;
    total_jobs['CD02'] = 687096;
    total_jobs['CD03'] = 910699;
    total_jobs['CD04'] = 1079334;
    total_jobs['CS01'] = 1936191;
    total_jobs['CS02'] = 1963337;

    var map = L.map('map', {center:[41.8910,-87.8839], zoom: 11});

    L.tileLayer('https://{s}.tiles.mapbox.com/v3/joysword.i6b4jale/{z}/{x}/{y}.png', {
        attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>'
    }).addTo(map);

    L.control.scale().addTo(map);

    load_lines();
    show_lines();

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
                low.toFixed(2) + '%' + (high ? '&ndash;' + high.toFixed(2) + '%': '+'));
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

    $('#checkbox-cta').change(function(){
        if ($('#checkbox-cta').is(':checked')) {
            map.addLayer(cta_layer);
        }
        else {
            map.removeLayer(cta_layer);
        }
    });
    $('#checkbox-metra').change(function(){
        if ($('#checkbox-metra').is(':checked')) {
            map.addLayer(metra_layer);
        }
        else {
            map.removeLayer(metra_layer);
        }
    });
    $('#checkbox-highway').change(function(){
        if ($('#checkbox-highway').is(':checked')) {
            map.addLayer(highway_layer);
        }
        else {
            map.removeLayer(highway_layer);
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
            try {
                legend.removeFrom(map);
            } catch(e) {};
            acc_layer.clearLayers();
            if (typeof acc_layer != 'undefined') {
                map.removeLayer(acc_layer);
            }

            acc_layer.addLayer(cached_layers[cache_index]).addTo(map);
            legend.addTo(map);
            //map.fitBounds(acc_layer.getBounds());
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
                    var content = 'Accessibility: ' + (100*feature.properties[category]).toFixed(1) + '% of ' + total_jobs[category] + ' jobs';
                    layer.bindLabel(content);
                }
            });
            // end block 2

            // block 3
            try {
                legend.removeFrom(map);
            } catch(e) {}
            acc_layer.clearLayers();
            if (typeof acc_layer != 'undefined') {
                map.removeLayer(acc_layer);
            }

            acc_layer.addLayer(cached_layers[cache_index]).addTo(map);
            legend.addTo(map);
            //map.fitBounds(acc_layer.getBounds());
            // end block 3

        }
        else {
            console.log('nothing cached');

            $('#map').spin({lines: 12, length: 0, width: 8, radius: 12});

            $.getJSON($SCRIPT_ROOT + filename, function(data) {

                // block 1
                cached_json[filename] = data;
                // end block 1

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
                        var content = 'Accessibility: ' + (100*feature.properties[category]).toFixed(1) + '% of ' + total_jobs[category] + ' jobs';
                        layer.bindLabel(content);
                    }
                });
                // end block 2

                $('#map').spin(false);

                // block 3
                try {
                    legend.removeFrom(map);
                } catch(e) {};
                acc_layer.clearLayers();
                if (typeof acc_layer != 'undefined') {
                    map.removeLayer(acc_layer);
                }

                acc_layer.addLayer(cached_layers[cache_index]).addTo(map);
                legend.addTo(map);
                //map.fitBounds(acc_layer.getBounds());
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
            d > cached_jenks[cache_index][6] ? map_colors[7] :
            d > cached_jenks[cache_index][5] ? map_colors[6] :
            d > cached_jenks[cache_index][4] ? map_colors[5] :
            d > cached_jenks[cache_index][3] ? map_colors[4] :
            d > cached_jenks[cache_index][2] ? map_colors[3] :
            d > cached_jenks[cache_index][1] ? map_colors[2] :
            d > cached_jenks[cache_index][0] ? map_colors[1] :
                     map_colors[0];
        return color
    }

    function acc_style(feature) {
        return {
            fillColor: get_color(100*feature.properties[category]),
            weight: 1,
            opacity: 0.7,
            color: get_color(100*feature.properties[category]),
            fillOpacity: 0.7
        }
    }

    function acc_filter(feature, layer) {
        return feature.properties.GEOID10 == '170979900000' ? false :
            feature.properties.GEOID10 == '170319900000' ? false :
            true;
    }

    function load_lines() {
        for (var i in cta_line_names) {
            load_line(cta_line_names[i]);
        }
        $.getJSON($SCRIPT_ROOT + "static/json/metra.geojson", function(data) {
            metra_layer.addLayer(
                L.geoJson(data.features, {
                    style: function(feature) {
                        return {
                            weight: 3,
                            opacity: 0.6,
                            color: '#679aaf'
                        }
                    }
                })
            );
        });
    }

    function load_line(name) {
        $.getJSON($SCRIPT_ROOT + "static/json/"+name+".geojson", function(data) {
            cta_layer.addLayer(
                L.geoJson(data.features, {
                    style: function(feature) {
                        var final_style = {
                            weight: 3,
                            opacity: 0.6
                        }
                        switch (name) {
                            case 'blue':
                                final_style.color = '#00a1de';
                                break;
                            case 'brown':
                                final_style.color = '#62361b';
                                break;
                            case 'green':
                                final_style.color = '#009b3a';
                                break;
                            case 'orange':
                                final_style.color = '#f9461c';
                                break;
                            case 'pink':
                                final_style.color = '#e27ea6';
                                break;
                            case 'purple':
                                final_style.color = '#522398';
                                break;
                            case 'red':
                                final_style.color = '#c60c30';
                                break;
                            case 'yellow':
                                final_style.color = '#f9e300';
                                break;
                        }
                        return final_style;
                    }
                })
            );
        });
    }

    function show_lines() {
        if ($('#checkbox-cta').checked) {
            map.addLayer(cta_layer);
        }
        if ($('#checkbox-metra').checked) {
            map.addLayer(metra_layer);
        }
        if ($('#checkbox-highway').checked) {
            map.addLayer(highway_layer);
        }
    }

})();