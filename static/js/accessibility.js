$(window).resize(function () {
    var h = $(window).height(),
      offsetTop = 50; // Calculate the top offset

    $('#map').css('height', (h - offsetTop));
}).resize();

(function(){
    var cached_layers = {};
    var cached_json = {};
    var cached_jenks = {};
    var acc_layer = new L.FeatureGroup();
    var jenks_cutoffs;
    var landuse;
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

    var total_landuse = {};
    total_landuse['park_area'] = 11.983198780000007;
    total_landuse['library'] = 78;
    total_landuse['fire_sta'] = 92;
    total_landuse['school'] = 988;
    total_landuse['hospital'] = 44;
    total_landuse['pri_sch'] = 355;
    total_landuse['pub_sch'] = 633;
    total_landuse['grocery'] = 506;
    total_landuse['park_count'] = 580;

    var map = L.map('map', {center: [41.8910,-87.8839], zoom: 11, minZoom: 11, zoomControl: false});

    L.tileLayer('https://{s}.tiles.mapbox.com/v3/joysword.i6b4jale/{z}/{x}/{y}.png', {
        attribution: "<a href='https://www.mapbox.com/about/maps/' target='_blank'>&copy; Mapbox &copy; OpenStreetMap</a>"
    }).addTo(map);

    L.control.scale({position: 'bottomright'}).addTo(map);

    L.control.zoom({position: 'topright'}).addTo(map);

    load_lines();
    show_lines();

    var legend = L.control({position: 'topright'});
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

    // map.addControl(drawControl);
    map.on('draw:created', draw_create);
    map.on('draw:edited', draw_edit);
    map.on('draw:deleted', draw_delete);
    map.on('draw:drawstart', draw_delete);

    map.on('zoomend', change_weight);

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

    function change_weight() {
        console.log('in change_weight()');
        console.log(cached_layers[cache_index]);
        if (typeof cached_layers[cache_index] != 'undefined') {
            console.log('has layer')
            cached_layers[cache_index].setStyle(function(feature) {
                return {weight: get_weight()}
            })
            console.log('changed style')
        }
    }

    var cur_acc_type;
    var cur_travel_type;

    // which accessibility? job, or other land uses?
    $('#select-acc').change(function(){
        cur_acc_type = this.value;
        switch (this.value) {
            case "job":
                // show filter and categories
                $('#form-filter').removeClass('no-disp');
                $('#form-category').removeClass('no-disp');
                // show corresponding type and threshold
                $('#form-type').removeClass('no-disp');
                $('#form-type-less').addClass('no-disp');
                $('#form-threshold').removeClass('no-disp');
                $('#form-threshold-less').addClass('no-disp');
                // show corresponding time
                if ($('#select-type').val() == "transit") {
                    $('#form-time').removeClass('no-disp');
                    $('#form-time-less').addClass('no-disp');
                }
                else {
                    $('#form-time').addClass('no-disp');
                    $('#form-time-less').addClass('no-disp');
                }
                break;
            default:
                // hide filter and categories
                $('#form-filter').addClass('no-disp');
                $('#form-category').addClass('no-disp');
                // show corresponding type and threshold
                $('#form-type').addClass('no-disp');
                $('#form-type-less').removeClass('no-disp');
                $('#form-threshold').addClass('no-disp');
                $('#form-threshold-less').removeClass('no-disp');
                // show corresponding time
                if ($('#select-type-less').val() == "transit") {
                    $('#form-time').addClass('no-disp');
                    $('#form-time-less').removeClass('no-disp');
                }
                else {
                    $('#form-time').addClass('no-disp');
                    $('#form-time-less').addClass('no-disp');
                }
                break;
        }
    })

    // which type? auto, transit or weighted
    // for job
    $('#select-type').change(function(){
        switch (this.value) {
            case "transit":
                $('#form-time').removeClass('no-disp');
                break;
            default:
                $('#form-time').addClass('no-disp');
                break;
        }
    });

    // for other land use
    $('#select-type-less').change(function(){
        switch (this.value) {
            case "transit":
                $('#form-time-less').removeClass('no-disp');
                break;
            default:
                $('#form-time-less').addClass('no-disp');
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
        landuse = $('#select-acc').val();
        var type =  $('#select-type').val();
        var type_less =  $('#select-type-less').val();
        var time =  $('#select-time').val();
        var time_less =  $('#select-time-less').val();
        var threshold =  $('#select-threshold').val();
        var threshold_less =  $('#select-threshold-less').val();
        var filter =  $('#select-filter').val();
        var age =  $('#select-age').val();
        var earning =  $('#select-earning').val();
        var industry =  $('#select-industry').val();
        var race =  $('#select-race').val();
        var ethnicity =  $('#select-ethnicity').val();
        var education =  $('#select-education').val();
        var gender =  $('#select-gender').val();

        // check whether a class is specified for each category
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

        filename = "static/json/acc_";
        if (landuse != "job") {
            filename += "landuse_" + type_less + "_";
            if (type_less == "transit") {
                filename += time_less + "_";
            }
            filename += threshold_less + '_.json';
        }
        else {
            filename += type + "_";
            if (type == "transit") {
                filename += time + "_";
            }
            filename += threshold + '_.json';
        }

        if (landuse != "job") {
            cache_index = landuse + '_' + filename;
        }
        else {
            cache_index = category + '_' + filename;
        }

        // if the layer is cached
        if (cache_index in cached_layers) {
            console.log('layer cached');
            time_2_3 = Date.now();
            console.log(Date(time_2_3));

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

            console.log('adding layer done');
            time_done = Date.now();
            console.log(Date(time_done));
            console.log(time_done - time_2_3)
            // end block 3

        }
        // if the geojson file is cached
        else if (filename in cached_json) {
            console.log('layer not cached, but json cached');
            time_1_2 = Date.now();
            console.log(Date(time_1_2));

            // block 2
            var val = [];
            $.each(cached_json[filename].features, function(i, v) {
                if (landuse=="job") {
                    val.push(100*v.properties[category]);
                }
                else {
                    val.push(100*v.properties[landuse]);
                }
            });
            jenks_cutoffs = jenks(val, 7);
            jenks_cutoffs[0] = 0;
            jenks_cutoffs.pop();
            cached_jenks[cache_index] = jenks_cutoffs;

            if (landuse=="job") {
                cached_layers[cache_index] = L.geoJson(cached_json[filename].features, {
                    style: acc_style,
                    filter: acc_filter,
                    onEachFeature: function(feature, layer) {
                        var content = 'Accessibility: ' + (100*feature.properties[category]).toFixed(1) + '%<br>Total jobs: ' + total_jobs[category];
                        layer.bindLabel(content);
                    }
                });
            }
            else {
                 cached_layers[cache_index] = L.geoJson(cached_json[filename].features, {
                    style: landuse_style,
                    filter: acc_filter,
                    onEachFeature: function(feature, layer) {
                        if (landuse == "park_area") {
                            var content = 'Accessibility: ' + (100*feature.properties[landuse]).toFixed(1) + '%<br>Total area (sq. miles): ' + (total_landuse[landuse]).toFixed(1);
                        }
                        else {
                            var content = 'Accessibility: ' + (100*feature.properties[landuse]).toFixed(1) + '%<br>Total number: ' + total_landuse[landuse];
                        }
                        layer.bindLabel(content);
                    }
                });
            }

            console.log('calculation done');
            time_2_3 = Date.now();
            console.log(Date(time_2_3));
            console.log(time_2_3 - time_1_2);
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

            console.log('adding layer done');
            time_done = Date.now();
            console.log(Date(time_done));
            console.log(time_done - time_2_3);
            // end block 3

        }
        else {
            console.log('nothing cached');
            time_start = Date.now();
            console.log(Date(time_start));

            $('#map').spin({lines: 12, length: 0, width: 8, radius: 12});

            $.getJSON($SCRIPT_ROOT + filename, function(data) {

                // block 1
                cached_json[filename] = data;

                console.log('got data');
                time_1_2 = Date.now();
                console.log(Date(time_1_2));
                console.log(time_1_2 - time_start);
                // end block 1

                // block 2
                var val = [];
                $.each(cached_json[filename].features, function(i, v) {
                    if (landuse=="job") {
                        val.push(100*v.properties[category]);
                    }
                    else {
                        val.push(100*v.properties[landuse]);
                    }
                });
                jenks_cutoffs = jenks(val, 7);
                jenks_cutoffs[0] = 0;
                jenks_cutoffs.pop();
                cached_jenks[cache_index] = jenks_cutoffs;

                if (landuse=="job") {
                    cached_layers[cache_index] = L.geoJson(cached_json[filename].features, {
                        style: acc_style,
                        filter: acc_filter,
                        onEachFeature: function(feature, layer) {
                            var content = 'Accessibility: ' + (100*feature.properties[category]).toFixed(1) + '%<br>Total jobs: ' + total_jobs[category];
                            layer.bindLabel(content);
                        }
                    });
                }
                else {
                     cached_layers[cache_index] = L.geoJson(cached_json[filename].features, {
                        style: landuse_style,
                        filter: acc_filter,
                        onEachFeature: function(feature, layer) {
                            if (landuse == "park_area") {
                                var content = 'Accessibility: ' + (100*feature.properties[landuse]).toFixed(1) + '%<br>Total number: ' + (total_landuse[landuse]).toFixed(2);
                            }
                            else {
                                var content = 'Accessibility: ' + (100*feature.properties[landuse]).toFixed(1) + '%<br>Total number: ' + total_landuse[landuse];
                            }
                            layer.bindLabel(content);
                        }
                    });
                }

                console.log('calculation done');
                time_2_3 = Date.now();
                console.log(Date(time_2_3));
                console.log(time_2_3 - time_1_2);
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

                console.log('adding layer done');
                time_done = Date.now();
                console.log(Date(time_done));
                console.log(time_done - time_2_3);
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
        return color;
    }

    function get_weight() {
        var zoom = map.getZoom();
        return zoom < 11 ? 0 : 1;

    }

    function acc_style(feature) {
        var color = get_color(100*feature.properties[category]);
        return {
            fillColor: color,
            weight: get_weight(),
            color: '#fff',
            fillOpacity: 0.7
        }
    }

    function landuse_style(feature) {
        var color = get_color(100*feature.properties[landuse]);
        return {
            fillColor: color,
            weight: get_weight(),
            color: '#fff',
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
        $.getJSON($SCRIPT_ROOT + "static/json/metra.json", function(data) {
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
        $.getJSON($SCRIPT_ROOT + "static/json/"+name+".json", function(data) {
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