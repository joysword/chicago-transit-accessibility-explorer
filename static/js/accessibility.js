$(window).resize(function () {
    var h = $(window).height(),
      offsetTop = 50; // Calculate the top offset

    $('#map').css('height', (h - offsetTop));
}).resize();

(function(){
    //var cached_layers = {};
    var cached_json = {};
    var cache_index;
    var cached_jenks = {};
    var acc_layer = new L.FeatureGroup();
    var metro_layer = new L.FeatureGroup();
    var chicago_layer = new L.FeatureGroup();
    var has_metro_layer = false;
    var has_chicago_layer = false;
    var jenks_cutoffs;
    var cta_layer = new L.FeatureGroup();
    var metra_layer = new L.FeatureGroup();
    var cta_line_names = ["blue", "brown", "green", "orange", "pink", "purple", "red", "yellow"];

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

    var map = L.map('map', {center: [41.8910,-87.8839], zoom: 11, minZoom: 9, zoomControl: false});

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

    map.on('zoomend', style_change);

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

    function style_change() {
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



    $('#btn-submit').on('click', show_map);

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
                    console.log('my_layer:',my_layer);
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

        console.log('my_layer:');
        console.log(my_layer);
        console.log(my_layer==metro_layer)

        //for (var i in my_layer._layers) {
        my_layer.eachLayer(function(bg){
            //var bg = my_layer._layers[i];
            var num = bg.feature.properties.num;
            if (num == 0) {
                console.log('bg[0]:', bg);
            }
            var content = 'id: ' + bg.feature.properties.num + '<br>GEOID10: ' + bg.feature.properties.GEOID10;
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
                    content += '<br>Accessibility: ' + (100*data[num]).toFixed(1) + '%<br>Total number: ' + (landuse=='park_area')?total_landuse[landuse].toFixed(2):total_landuse[landuse];
                }
                else {
                    bg.setStyle(acc_style(0));
                    content += '<br>Accessibility: N/A<br>Total number: ' + (landuse == 'park_area')?total_landuse[landuse].toFixed(2):total_landuse[landuse];
                }
            }
            bg.bindLabel(content);
            if (num == 5913) {
                console.log('bg[0]:', bg);
            }
        });

        console.log(my_layer);

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
        if ($('#checkbox-metra').is(':checked')) {
            metra_layer.bringToFront();
        }

        //map.fitBounds(acc_layer.getBounds());

        console.log('adding layer done');
        time_done = Date.now();
        console.log(Date(time_done));
        console.log(time_done - time_2_3);
        // end block 3
    }

    function clickHandler(e){
        console.log('in clickHandler()');
        select_bg(e.target.feature.properties.num);
    }

    function select_bg(num){

        console.log('in select_bg()');

        bg = num;
        //updateHash();
        $.getJSON($SCRIPT_ROOT + "/static/json/chicago_od_driving_" + num + '.json', function(data){
            _.each(my_layer._layers, function(bg){
                var num = bg.feature.properties.num;

                if (_.has(data, num))
                {
                    bg.setStyle({
                        fill: true,
                        fillColor: get_iso_color(data[num]),
                    });
                }
                else
                {
                    hex.setStyle({
                        fillOpacity: 0,
                        stroke: false
                    });
                }
            });
        });
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
        if (seconds < 300) {
            return '#f46d6c';
        }
        else if (seconds < 600)
        {
            return '#fda36c';

        }
        else if (seconds < 900)
        {
            return '#fedc6c';

        }
        else if (seconds < 1200)
        {
            return '#d4f470';

        }
        else if (seconds < 1800)
        {
            return '#a7f49a';

        }
        else if (seconds < 2400)
        {
            return '#85ffe0';

        }
        else if (seconds < 2700)
        {
            return '#6fcfff';

        }
        else if (seconds < 3000)
        {
            return '#6d91f3';

        }
        else if (seconds < 3600)
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


    function acc_filter(feature, layer) {
        return feature.properties.GEOID10 == '170979900000' ? false :
            feature.properties.GEOID10 == '170319900000' ? false :
            true;
    }

    function load_lines() {
        for (var i in cta_line_names) {
            load_line(cta_line_names[i]);
        }
        $.getJSON($SCRIPT_ROOT + "/static/json/metra.json", function(data) {
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
        }
        if ($('#checkbox-metra').is(':checked')) {
            map.addLayer(metra_layer);
        }
    }

})();