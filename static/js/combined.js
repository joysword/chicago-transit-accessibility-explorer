$(window).resize(function () {
    var h = $(window).height(),
      offsetTop = 50; // Calculate the top offset

    $('#map').css('height', (h - offsetTop));
    $('#map2').css('height', (h - offsetTop));
}).resize();

(function(){
    //var cached_layers = {};
    var cached_json = {};
    var cache_index;
    var cached_jenks = {};
    var metro_layer;
    var chicago_layer;
    var metro_layer_2;
    var chicago_layer_2;
    var has_metro_layer = false;
    var has_chicago_layer = false;
    var jenks_cutoffs;
    var layer;
    var category_iso;
    var cta_layer = new L.FeatureGroup();
    var cta_line_names = ["blue", "brown", "green", "orange", "pink", "purple", "red", "yellow", "metra"];

    var val = [];

    var my_layer = null;

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

    var cur_num_metro;
    var cur_num_chicago;

    var iso_cutoff = [600, 1200, 1800, 2700, 3600, 4500, 5400, 6300, 7200];

    var map = L.map('map', {center: [41.8910,-87.8839], zoom: 10, minZoom: 8, zoomControl: false, attributionControl: false});
    var map2 = L.map('map2', {center: [41.8910,-87.8839], zoom: 10, minZoom: 8, zoomControl: false});

    L.tileLayer('https://{s}.tiles.mapbox.com/v3/joysword.i6b4jale/{z}/{x}/{y}.png').addTo(map);

    L.tileLayer('https://{s}.tiles.mapbox.com/v3/joysword.i6b4jale/{z}/{x}/{y}.png', {
        attribution: "<a href='https://www.mapbox.com/about/maps/' target='_blank'>&copy; Mapbox &copy; OpenStreetMap</a> | <a href='http://utc.webhost.uic.edu/metsi/' target='_blank'>&copy; Metropolitan Transportation Support Initiative<a/>"
    }).addTo(map2);

    L.control.scale({position: 'bottomright'}).addTo(map2);

    L.control.zoom({position: 'topright'}).addTo(map2);

    map.on('drag', function(e) {
        map2.setView(map.getCenter());
    });

    map2.on('drag', function(e) {
        map.setView(map2.getCenter());
    });

    map.on('zoomend', style_change);
    map2.on('zoomend', function(e) {
        map.setZoom(map2.getZoom());
    });


    function style_change() {
        map2.setZoom(map.getZoom());

        if (!(has_metro_layer || has_chicago_layer)) {
            return;
        }
        console.log('zoom:', map.getZoom());
        if (map.getZoom() <= 10) {
            console.log('<=10');
            my_layer.setStyle(function(feature) {
                var new_color = get_color(100*cached_json[cache_index][feature.properties.num]);
                return {
                    color: new_color,
                    opacity: 0.4,
                    weight: 1.5,
                }
            });
            console.log('changed to: new_color, 1.5')
        }
        else {
            console.log('>10');
            my_layer.setStyle(function(feature) {
                var new_color = get_color(100*cached_json[cache_index][feature.properties.num]);
                return {
                    color: '#fff',
                    weight: 1,
                    opacity: 1,
                }
            });
            console.log('changed to: #fff, 1')
        }
    }

    load_lines();
    show_lines();

    var legend = L.control({position: 'bottomleft'});
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

    var legend_iso = L.control({position: 'bottomleft'});
    legend_iso.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'legend');
        var labels = [];
        var low;
        var high;
        $.each(iso_cutoff, function(i, v) {
            low = (i==0)?0:(iso_cutoff[i-1]);
            high = v;
            labels.push('<i style="background:' + get_iso_color(high) + '"></i>' +
            high/60 + ' min');
        });
        labels.push('<i style="background:' + get_iso_color(iso_cutoff[iso_cutoff.length-1]+1000) + '"></i>' + iso_cutoff[iso_cutoff.length-1]/60 + ' min+');
        div.innerHTML = '<div><strong>' + 'Travel Time:' + '</strong><br />' + labels.join('<br />') + '</div>';
        return div;
    }

    legend_iso.addTo(map2);

    // which accessibility? job, or other land uses?
    $('#select-acc').change(function(){
        switch (this.value) {
            case "job":
                // show filter and categories
                $('#form-filter').removeClass('no-disp');
                $('#form-category').removeClass('no-disp');
                break;
            default:
                // hide filter and categories
                $('#form-filter').addClass('no-disp');
                $('#form-category').addClass('no-disp');
                break;
        }
    })

    // which type? auto, transit, bicycle or walk?
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
            map2.addLayer(cta_layer);
        }
        else {
            map.removeLayer(cta_layer);
            map2.removeLayer(cta_layer);
        }
    });

    $('#btn-submit').on('click', show_map);
    $('#btn-submit').on('click', show_map2);

    // called when the button is clicked
    function show_map(e) {
        console.log('in show_map()');
        var landuse = $('#select-acc').val();
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
        var category = null;

        $('#map').spin({lines: 12, length: 0, width: 8, radius: 12});

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

        var filename = 'static/json/';

        // get the geometry if not done
        if (landuse != "job") {
            filename += 'acc_chicago_' + type + '/';
            if (type == 'transit') {
                filename += time + '/';
            }
            filename += threshold + '/' + landuse + '.json';
            cache_index = filename;
            console.log('cach_index:', cache_index);
            if (!has_chicago_layer) {
                console.log('no chicago layer, downloading');
                var which_feature = 0;
                $.getJSON($SCRIPT_ROOT + '/static/json/chicago.topojson', function(data) {
                    chicago_layer = L.geoJson(topojson.feature(data, data.objects['BlockGroupsTIGER2010']), {
                        onEachFeature: function(feature, layer) {
                            feature.properties.num = which_feature;
                            which_feature++;
                        }
                    });
                    has_chicago_layer = true;
                    console.log('got chicago layer');
                    my_layer = chicago_layer;
                    get_attributes(landuse, category);
                });
            }
            else {
                my_layer = chicago_layer;
                get_attributes(landuse, category);
            }
        }
        else {
            filename += 'acc_large_' + type + '/';
            if (type == 'transit') {
                filename += time + '/';
            }
            filename += threshold + '/' + category + '.json';
            cache_index = filename;
            console.log('cach_index:', cache_index);
            if (!has_metro_layer) {
                console.log('no metropolitan layer, downloading');
                var which_feature = 0;
                $.getJSON($SCRIPT_ROOT + '/static/json/metro.topojson', function(data) {
                    metro_layer = L.geoJson(topojson.feature(data, data.objects['metro_nad83']), {
                        onEachFeature: function(feature, layer) {
                            feature.properties.num = which_feature;
                            which_feature++;
                        }
                    });
                    has_metro_layer = true;
                    console.log('got metropolitan layer');
                    my_layer = metro_layer;
                    get_attributes(landuse, category);
                });
            }
            else {
                my_layer = metro_layer;
                get_attributes(landuse, category);
            }

        }
    }

    function get_attributes(landuse, category) {
        console.log('in get_attributes()');
        if (cached_json[cache_index] == undefined) {
            console.log('nothing cached');
            time_start = Date.now();
            console.log(Date(time_start));

            console.log('cache_index:', cache_index);

            $.getJSON($SCRIPT_ROOT + '/' + cache_index, function(data) {

                // block 1
                cached_json[cache_index] = data;

                console.log('got data');
                time_1_2 = Date.now();
                console.log(Date(time_1_2));
                console.log(time_1_2 - time_start);
                // end block 1

                // block 2
                val = [];
                for (var i in data) {
                    if (data[i]>=0) {
                        val.push(100*data[i]);
                    }
                }
                jenks_cutoffs = jenks(val, 7);
                console.log('jenks:', jenks_cutoffs);
                jenks_cutoffs[0] = 0;
                jenks_cutoffs.pop(); // don't need to know what is the largest
                cached_jenks[cache_index] = jenks_cutoffs;
                console.log(jenks_cutoffs);

                render_layer(landuse, category, time_1_2);
            });
        }
        else {
            console.log('already has this json file');
            time_1_2 = Date.now();
            console.log(Date(time_1_2));
            render_layer(landuse, category, time_1_2);
        }
    }

    function render_layer(landuse, category, time_1_2) {

        console.log('in render_layer()');
        console.log('cache_index:', cache_index);

        var data = cached_json[cache_index];

        for (var i in my_layer._layers) {
        //my_layer.eachLayer(function(bg){
            var bg = my_layer._layers[i];
            var num = bg.feature.properties.num;
            var content = 'GEOID10: ' + bg.feature.properties.GEOID10;
            if (landuse=="job") {
                if (_.has(data, num)) {
                    bg.setStyle(acc_style(data[num]));
                    content += '<br>Accessibility: ' + (100*data[num]).toFixed(1) + '%<br>Total jobs: ' + total_jobs[category];
                }
                else {
                    bg.setStyle(acc_style(0));
                    content += '<br>Accessibility: N/A<br>Total jobs: ' + total_jobs[category];
                }
            }
            else {
                if (_.has(data, num)) {
                    bg.setStyle(acc_style(data[num]));
                    content += '<br>Accessibility: ' + (100*data[num]).toFixed(1) + '%<br>Total number: ' + ((landuse=='park_area')?total_landuse[landuse].toFixed(2):total_landuse[landuse]);
                }
                else {
                    bg.setStyle(acc_style(0));
                    content += '<br>Accessibility: N/A<br>Total number: ' + ((landuse == 'park_area')?total_landuse[landuse].toFixed(2):total_landuse[landuse]);
                }
            }
            bg.bindLabel(content);
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
        //acc_layer.clearLayers();
        // if (acc_layer != undefined) {
        //     map.removeLayer(acc_layer);
        // }

        if (landuse=="job") {
            try {
                map.removeLayer(chicago_layer);
            } catch(e) {};
            metro_layer.addTo(map);
        }
        else {
            try {
                map.removeLayer(metro_layer);
            } catch(e) {};
            chicago_layer.addTo(map);
        }
        //acc_layer.addLayer(my_layer).addTo(map);

        legend.addTo(map);

        // bing up CTA/Metra layers to top
        if ($('#checkbox-cta').is(':checked')) {
            cta_layer.bringToFront();
        }

        //map.fitBounds(acc_layer.getBounds());

        console.log('adding layer done');
        time_done = Date.now();
        console.log(Date(time_done));
        console.log(time_done - time_2_3);
        // end block 3
    }

    function show_map2(e) {
        console.log('in show_map2()');
        layer = ($('#select-acc').val()=='job')?'metro':'chicago';
        var type =  $('#select-type').val();
        var time =  $('#select-time').val();

        var filename = 'static/json/' + layer + '.topojson';

        {

            if (layer=="metro") {
                if (typeof metro_layer_2 != 'undefined') {
                    if (map2.hasLayer(chicago_layer_2)) {
                        map2.removeLayer(chicago_layer_2);
                    }
                    if (!map2.hasLayer(metro_layer_2)) {
                        map2.addLayer(metro_layer_2);
                    }
                    if (typeof cur_num_metro != 'undefined') {
                        select_bg(cur_num_metro, false);
                    }
                    return;
                }
            }
            else {
                if (typeof chicago_layer_2 != 'undefined') {
                    if (map2.hasLayer(metro_layer_2)) {
                        map2.removeLayer(metro_layer_2);
                    }
                    if (!map2.hasLayer(chicago_layer_2)) {
                        map2.addLayer(chicago_layer_2);
                    }
                    if (typeof cur_num_chicago != 'undefined') {
                        select_bg(cur_num_chicago, true);
                    }
                    return;
                }
            }

            $('#map2').spin({lines: 12, length: 0, width: 8, radius: 12});

            $.getJSON($SCRIPT_ROOT + '/' + filename, function(data) {

                // block 1
                console.log('got data');
                // end block 1

                // block 2
                if (layer == 'metro') {
                    var which_feature = 0;
                    metro_layer_2 = L.geoJson(topojson.feature(data, data.objects['metro_nad83']), {
                        style: empty_style,
                        //filter: acc_filter,
                        onEachFeature: function(feature, layer) {
                            feature.properties.num = which_feature;
                            var content ='GEOID10: ' + feature.properties.GEOID10;
                            layer.bindLabel(content);
                            layer.on('click', clickHandler_metro);
                            which_feature++;
                        }
                    });
                    console.log('which_feature:');
                    console.log(which_feature);
                    console.log(metro_layer_2);
                }
                else {
                    var which_feature = 0;
                    // cached_layers[cache_index] = L.geoJson(my_data.features, {
                    chicago_layer_2 = L.geoJson(topojson.feature(data, data.objects['BlockGroupsTIGER2010']), {
                        style: empty_style,
                        //filter: acc_filter,
                        onEachFeature: function(feature, layer) {
                            feature.properties.num = which_feature;
                            var content ='GEOID10: ' + feature.properties.GEOID10;
                            layer.bindLabel(content);
                            layer.on('click', clickHandler_chicago);
                            which_feature++;
                        }
                    });
                    console.log('which_feature:');
                    console.log(which_feature);
                    console.log(chicago_layer_2);
                }

                console.log('calculation done');
                // end block 2

                $('#map2').spin(false);

                // block 3
                if (layer=='metro') {
                    if (map2.hasLayer(chicago_layer_2)) {
                        map2.removeLayer(chicago_layer_2);
                    }
                    if (!map2.hasLayer(metro_layer_2)) {
                        map2.addLayer(metro_layer_2);
                    }
                }
                else {
                    if (map2.hasLayer(metro_layer_2)) {
                        map2.removeLayer(metro_layer_2);
                    }
                    if (!map2.hasLayer(chicago_layer_2)) {
                        map2.addLayer(chicago_layer_2);
                    }
                }

                // bing up CTA/Metra layers to top
                if ($('#checkbox-cta').is(':checked')) {
                    cta_layer.bringToFront();
                }

                //map.fitBounds(acc_layer.getBounds());

                console.log('adding layer done');
                // end block 3

            });
        }
    }

    function clickHandler_chicago(e){
        console.log('in clickHandler_chicago()');
        cur_num_chicago = e.target.feature.properties.num;
        e.target._hideLabel();
        console.log('clicked feature id:', cur_num_chicago);
        select_bg(cur_num_chicago, true, e);
    }

    function clickHandler_metro(e){
        console.log('in clickHandler_metro()');
        cur_num_metro = e.target.feature.properties.num;
        e.target._hideLabel();
        console.log('clicked feature id:', cur_num_metro);
        select_bg(cur_num_metro, false, e);
    }

    function select_bg(num, isChicago, e){

        console.log('in select_bg()');

        console.log('bg:', num);

        var file_prefix = "/static/json/iso_"
        var travel_type = $('#select-type').val();

        if (travel_type == 'transit') {
            travel_type += '/' + $('#select-time').val();
        }

        if (isChicago) {
            $.getJSON($SCRIPT_ROOT + file_prefix + "chicago_" + travel_type + "/" + num + '.json', function(data){
                $.each(chicago_layer_2._layers, function(i, bg){
                    var num = bg.feature.properties.num;
                    var content = 'GEOID10: ' + bg.feature.properties.GEOID10;
                    if (_.has(data, num))
                    {
                        bg.setStyle({
                            fill: true,
                            fillColor: get_iso_color(data[num]),
                        });
                        content += '<br>Travel Time: ' + toTime(data[num]);
                    }
                    else
                    {
                        bg.setStyle({
                            fillOpacity: 0,
                            stroke: false
                        });
                    }
                    bg.bindLabel(content);
                });
                if (typeof e !== 'undefined') {
                    e.target._showLabel(e);
                }
            });
        }
        else {
            $.getJSON($SCRIPT_ROOT + file_prefix + "large_" + travel_type + "/" + num + '.json', function(data){
                $.each(metro_layer_2._layers, function(i, bg){
                    var num = bg.feature.properties.num;
                    var content = 'GEOID10: ' + bg.feature.properties.GEOID10;
                    if (_.has(data, num))
                    {
                        bg.setStyle({
                            fill: true,
                            fillColor: get_iso_color(data[num]),
                        });
                        content += '<br>Travel Time: ' + toTime(data[num]);
                    }
                    else
                    {
                        bg.setStyle({
                            fillOpacity: 0,
                            stroke: false
                        });
                    }
                    bg.bindLabel(content);
                });
                if (typeof e !== 'undefined') {
                    e.target._showLabel(e);
                }
            });
        }
    }

    function toTime(sec) {
        return Math.floor(sec/60) + ' min';
    }

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
        if (d > cached_jenks[cache_index][3]) {
            if (d > cached_jenks[cache_index][5]) {
                if (d > cached_jenks[cache_index][6]) {
                    return map_colors[7];
                }
                else {
                    return map_colors[6];
                }
            }
            else {
                if (d > cached_jenks[cache_index][4]) {
                    return map_colors[5];
                }
                else {
                    return map_colors[4];
                }
            }
        }
        else {
            if (d > cached_jenks[cache_index][1]) {
                if (d > cached_jenks[cache_index][2]) {
                    return map_colors[3];
                }
                else {
                    return map_colors[2];
                }
            }
            else {
                if (d > cached_jenks[cache_index][0]) {
                    return map_colors[1];
                }
                else {
                    return map_colors[0];
                }
            }
        }
    }

    function get_iso_color(seconds) {
        if (seconds <= iso_cutoff[0]) {
            return '#f46d6c';
        }
        else if (seconds <= iso_cutoff[1])
        {
            return '#fda36c';

        }
        else if (seconds <= iso_cutoff[2])
        {
            return '#fedc6c';

        }
        else if (seconds <= iso_cutoff[3])
        {
            return '#d4f470';

        }
        else if (seconds <= iso_cutoff[4])
        {
            return '#a7f49a';

        }
        else if (seconds <= iso_cutoff[5])
        {
            return '#85ffe0';

        }
        else if (seconds <= iso_cutoff[6])
        {
            return '#6fcfff';

        }
        else if (seconds <= iso_cutoff[7])
        {
            return '#6d91f3';

        }
        else if (seconds <= iso_cutoff[8])
        {
            return '#6b69e8';

        }
        return '#7c7dbb';
    }

    function acc_style(num) {
        var color = get_color(100*num);
        if (map.getZoom()<=10) {
            return {
                fillColor: color,
                weight: 1.5,
                color: color,
                opacity: 0.5,
                fillOpacity: 0.7
            }
        }
        else {
            return {
                fillColor: color,
                weight: 1,
                color: '#fff',
                opacity: 1,
                fillOpacity: 0.7
            }
        }
    }

    function empty_style(feature) {
        return {
            weight: 1,
            color: '#fff',
            fillColor: '#7c7dbb',
            fillOpacity: 0.5,
        }
    }

    function load_lines() {
        for (var i in cta_line_names) {
            load_line(cta_line_names[i]);
        }
    }

    function load_line(name) {
        $.getJSON($SCRIPT_ROOT + "/static/json/"+name+".json", function(data) {
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
                            case 'metra':
                                final_style.color = '#679aaf';
                                break;
                        }
                        return final_style;
                    }
                })
            );
        });
    }

    function show_lines() {
        if ($('#checkbox-cta').is(':checked')) {
            map.addLayer(cta_layer);
            map2.addLayer(cta_layer);
        }
    }

})();