var map, mpoSearch = [],
    mpoLayer;

var baseLayer = new L.StamenTileLayer("toner-lite");

function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 5
    });

    if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
    }
}

function resetHighlight(e) {
    mpoLayer.resetStyle(e.target);
}

function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
    var feature = e.target.feature;
    map.openPopup("<table class='table table-striped table-bordered table-condensed'>" +
        "<tr><th>Name</th><td><a href='http://www.planning.dot.gov/Summary.asp?ID=" + feature.properties.MPO_ID + "' target='_blank'>" + feature.properties.MPO_NAME + "</a></td></tr>" +
        "<tr><th>Designated</th><td>" + feature.properties.DESIGNATED + "</td></tr>" +
        "<tr><th>City</th><td>" + feature.properties.CITY + "</td></tr>" +
        "<tr><th>State</th><td>" + feature.properties.STATE + "</td></tr>" +
        "<tr><th>Area</th><td>" + feature.properties.AREA + " mi<sup>2</sup></td></tr>" +
        "<table>",
        e.target.getBounds().getCenter(), {
            closeButton: false
        });
}

mpoLayer = new L.geoJson(null, {
    style: function (feature) {
        return {
            "color": "#000000",
            "weight": 2,
            "opacity": 0.4
        };
    },
    onEachFeature: function (feature, layer) {
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: zoomToFeature
        });
        if (feature.properties) {
            var p = feature.properties;
            var tokens = p.MPO_NAME.split(' ');
            tokens.push(p.CITY);
            tokens.push(p.STATE);
            mpoSearch.push({
                value: p.MPO_NAME,
                tokens: tokens,
                id: L.stamp(layer),
                bounds: layer.getBounds()
            });
        }
    }

});

map = L.map("map", {
    zoom: 4,
    center: new L.LatLng(39, -98),
    layers: [baseLayer, mpoLayer]
});

map.attributionControl.addAttribution('MPO boundaries from 2013 <a href="http://www.rita.dot.gov/bts/sites/rita.dot.gov.bts/files/publications/national_transportation_atlas_database/2013/index.html">NTAD</a>');

map.attributionControl.addAttribution('Nominatim Search Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">, Data © OpenStreetMap contributors, <a href="http://www.openstreetmap.org/copyright">ODbL 1.0</a>');

var scaleControl = L.control.scale();

L.control.locate({
    locateOptions: {
        maxZoom: 12
    }
}).addTo(map);

// Larger screens get scale control and expanded layer control
if (document.body.clientWidth <= 767) {
    var isCollapsed = true;
} else {
    var isCollapsed = false;
    map.addControl(scaleControl);
};


// Highlight search box text on click
$("#searchbox").click(function () {
    $(this).select();
});

var worker = cw(function (data, cb) {
    importScripts('assets/shp.js');
    shp(data).then(cb);
});

worker.data(cw.makeUrl("data/mpo/mpo")).then(function (data) {
    mpoLayer.addData(data);
    $("#loading").hide();

    $("#searchbox").typeahead([{
            name: "MPOs",
            local: mpoSearch,
            minLength: 2,
            limit: 10,
            header: "<h4 class='typeahead-header'>MPOs</h4>"
        }, {
            name: "Places",
            remote: {
                dataType: "jsonp",
                url: "http://open.mapquestapi.com/nominatim/v1/search.php?format=json&addressdetails=0&countrycodes=us&q=%QUERY&json_callback=?",

                filter: function (parsedResponse) {
                    var dataset = [];
                    for (i = 0; i < parsedResponse.length; i++) {
                        dataset.push({
                            value: parsedResponse[i].display_name,
                            tokens: [parsedResponse[i].display_name],
                            layer: "Places",
                            bounds: L.latLngBounds([
                                [parsedResponse[i].lat,
                                    parsedResponse[i].lon
                                ]
                            ])
                        });
                    }
                    return dataset;
                }
            },
            minLength: 2,
            limit: 5,
            header: "<h4 class='typeahead-header'>Places</h4>"
        }


    ]).on("typeahead:selected", function (obj, datum) {
        map.fitBounds(datum.bounds, {
            maxZoom: 12
        });
        if ($("#navbar-collapse").height() > 50) {
            $("#navbar-collapse").collapse("hide");
        };
    }).on("typeahead:initialized ", function () {
        $(".tt-dropdown-menu").css("max-height", 300);
    });
});

$("#navbar-collapse").on("shown.bs.collapse", function () {
    $(".navbar-collapse.in").css("max-height", $(document).height() - $(".navbar-header").height());
    $(".navbar-collapse.in").css("height", $(document).height() - $(".navbar-header").height());
});

// Placeholder hack for IE
if (navigator.appName == "Microsoft Internet Explorer") {
    $("input").each(function () {
        if ($(this).val() == "" && $(this).attr("placeholder") != "") {
            $(this).val($(this).attr("placeholder"));
            $(this).focus(function () {
                if ($(this).val() == $(this).attr("placeholder")) $(this).val("");
            });
            $(this).blur(function () {
                if ($(this).val() == "") $(this).val($(this).attr("placeholder"));
            });
        }
    });
}