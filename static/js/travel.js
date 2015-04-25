$(window).resize(function () {
    var h = $(window).height(),
      offsetTop = 50; // Calculate the top offset

    $('#map').css('height', (h - offsetTop));
}).resize();

(function(){
    //var cached_layers = {};
    var cached_json = {};
    var cached_jenks = {};
    var metro_layer;
    var chicago_layer;
    var jenks_cutoffs;
    var layer;
    var category;
    var cache_index;
    var cta_layer = new L.FeatureGroup();
    var cta_line_names = ["blue", "brown", "green", "orange", "pink", "purple", "red", "yellow", "metra"];

    var cur_num_metro;
    var cur_num_chicago;

    var iso_cutoff = [600, 1200, 1800, 2700, 3600, 4500, 5400, 6300, 7200];

    var map = L.map('map', {center: [41.8910,-87.8839], zoom: 11, minZoom: 9, zoomControl: false});

    L.tileLayer('https://{s}.tiles.mapbox.com/v3/joysword.i6b4jale/{z}/{x}/{y}.png', {
        attribution: "<a href='https://www.mapbox.com/about/maps/' target='_blank'>&copy; Mapbox &copy; OpenStreetMap</a> | <a href='http://utc.webhost.uic.edu/metsi/' target='_blank'>&copy; Metropolitan Transportation Support Initiative<a/>"
    }).addTo(map);

    L.control.scale({position: 'bottomright'}).addTo(map);

    L.control.zoom({position: 'topright'}).addTo(map);

    // map.on('click', function(e) {
    //     console.log('map clicked');
    //     var which_bg = leafletPip.pointInLayer(e.latlng, my_layer, true);
    //     console.log('which_bg:');
    //     console.log(which_bg);
    //     if (which_bg.length == 0) { return; }
    //     select_bg(which_bg[0].feature.properties.num);
    // });

    load_lines();
    show_lines();

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

    legend_iso.addTo(map);

    // which type? auto, transit or weighted
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

    $('#checkbox-cta').change(function(){
        if ($('#checkbox-cta').is(':checked')) {
            map.addLayer(cta_layer);
        }
        else {
            map.removeLayer(cta_layer);
        }
    });

    $('#btn-submit').on('click', show_map);

    // called when the button is clicked
    function show_map(e) {
        console.log('in show_map()');
        layer = $('#select-layer').val();
        var type =  $('#select-type').val();
        var time =  $('#select-time').val();

        var filename = 'static/json/' + layer + '.topojson';

        {

            if (layer=="metro") {
                if (typeof metro_layer != 'undefined') {
                    if (map.hasLayer(chicago_layer)) {
                        map.removeLayer(chicago_layer);
                    }
                    if (!map.hasLayer(metro_layer)) {
                        map.addLayer(metro_layer);
                    }
                    if (typeof cur_num_metro != 'undefined') {
                        select_bg(cur_num_metro, false);
                    }
                    return;
                }
            }
            else {
                if (typeof chicago_layer != 'undefined') {
                    if (map.hasLayer(metro_layer)) {
                        map.removeLayer(metro_layer);
                    }
                    if (!map.hasLayer(chicago_layer)) {
                        map.addLayer(chicago_layer);
                    }
                    if (typeof cur_num_chicago != 'undefined') {
                        select_bg(cur_num_chicago, true);
                    }
                    return;
                }
            }

            $('#map').spin({lines: 12, length: 0, width: 8, radius: 12});

            $.getJSON($SCRIPT_ROOT + '/' + filename, function(data) {

                // block 1
                console.log('got data');
                // end block 1

                // block 2
                if (layer == 'metro') {
                    var which_feature = 0;
                    metro_layer = L.geoJson(topojson.feature(data, data.objects['metro_nad83']), {
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
                    console.log(metro_layer);
                }
                else {
                    var which_feature = 0;
                    // cached_layers[cache_index] = L.geoJson(my_data.features, {
                    chicago_layer = L.geoJson(topojson.feature(data, data.objects['BlockGroupsTIGER2010']), {
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
                    console.log(chicago_layer);
                }

                console.log('calculation done');
                // end block 2

                $('#map').spin(false);

                // block 3
                if (layer=='metro') {
                    if (map.hasLayer(chicago_layer)) {
                        map.removeLayer(chicago_layer);
                    }
                    if (!map.hasLayer(metro_layer)) {
                        map.addLayer(metro_layer);
                    }
                }
                else {
                    if (map.hasLayer(metro_layer)) {
                        map.removeLayer(metro_layer);
                    }
                    if (!map.hasLayer(chicago_layer)) {
                        map.addLayer(chicago_layer);
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
                $.each(chicago_layer._layers, function(i, bg){
                    var num = bg.feature.properties.num;
                    var content = 'GEOID10: ' + bg.feature.properties.GEOID10;
                    if (_.has(data, num)) {
                        bg.setStyle({
                            fill: true,
                            fillColor: get_iso_color(data[num]),
                        });
                        content += '<br>Travel Time: ' + toTime(data[num]);
                    }
                    else {
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
                $.each(metro_layer._layers, function(i, bg){
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

    function toTime(tot) {
        var sec = tot;
        var hour = ('00'+Math.floor(sec/3600)).slice(-2)+":";
        sec = sec%3600;
        var min = ('00'+Math.floor(sec/60)).slice(-2)+":";
        sec = ('00'+(sec%60)).slice(-2);
        return hour+min+sec;
    }

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

    function acc_style(feature) {
        var color = get_color(100*feature.properties[category]);
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

    function landuse_style(feature) {
        var color = get_color(100*feature.properties[landuse]);
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
        }
    }

})();