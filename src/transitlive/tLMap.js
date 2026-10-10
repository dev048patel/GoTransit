//tLMap.js?v=20251125

var diff = function (a, b) {
    return a.filter(function (i) { return b.indexOf(i) < 0; });
};

//need these for alert pop-ups Aug 2020 
var thenum = 0;
var thenum2 = 0;
var thenum3 = 0;
var thedate = new Date();
var thehours = thedate.getHours();

// Bump this whenever you change any /polyLines/route*.js files
var ROUTE_JS_VERSION = '20251125';
//console.log(thehours);

var tLMap = {
    options: {
        gpsEnabled: false,
        tileServer: "https://tiles.transitlive.com/osm/{z}/{x}/{y}.png",
        cityCenter: [50.461001, -104.60495],
        zoom_position: 'topright',
        attribution: 'OpenStreetMap contributors | Regina Transit',
        zoomShowStops: 15,
        zoomShowDetourPopups: 16,
        loadRouteJSON: true,
        cacheStops: false,
        loadDefaultRoute: '-1',
        loadDefaultStop: -1,
        loadDetour: '-1',
        loadDefaultBus: 0,
        loadDefaultCenter: [50.461001, -104.60495],
        loadOffRoute: false,
        loadDefaultZoom: 13,
        numStopTimes: 3,
        enableBuses: true,
        routeHover: true,
        setBusesTimer: 2000,
        setStopsTimer: 20000,
        setBusesRemoveTimer: 120000,
        showSeconds: false,
        showAllDetours: false
    },
    map: {},
    stops: {},
    buses: {},
    routeLayer: {},
    detourLayer: {},
    dashLayer: {},
    dashLayer2: {},
    dashLayer3: {},
    dashLayer4: {},
    routeList: [],
    selectedRoutes: [],
    popupOptions: { 'closeButton': false },
    hoveringOn: -1,                    //Pretty hacky, stop stopTimes update on hover so the popup window doesn't jump around
    routeDialogContent: '',
    dockDialog: {},
    skip: 0,
    stopTimer: 0,
    busTimer: 0,
    removeBusTimer: 0,
    focusedStop: 0,
    gpsMarker: {},
    follow: 0,  //bus to follow
    menuItems: []
};

tLMap.createMap = function (mapid, opts) {
    tLMap.options = $.extend(tLMap.options, opts);

    var osm = new L.TileLayer(tLMap.options.tileServer, { detectRetina: true, reuseTiles: true });
    var southWest = new L.LatLng(tLMap.options.cityCenter[0] - 0.4, tLMap.options.cityCenter[1] - 0.7);
    var northEast = new L.LatLng(tLMap.options.cityCenter[0] + 0.4, tLMap.options.cityCenter[1] + 0.7);
    var bounds = new L.LatLngBounds(southWest, northEast);

    tLMap.map = new L.map(mapid, {
        center: tLMap.options.loadDefaultCenter,
        zoom: tLMap.options.loadDefaultZoom,
        zoomControl: false,
        maxBounds: bounds,
        minZoom: 11,
        attributionControl: false,
        keyboard: true,
        layers: [osm],
        zoomControl: false
    });
    tLMap.map.invalidateSize();

    tLMap.map.addControl(new L.Control.ZoomMin({ position: tLMap.options.zoom_position }));
    //L.control.zoom({position: tLMap.options.zoom_position}).addTo(tLMap.map);

    //L.control.L.Control.ZoomMin({position: tLMap.options.zoom_position}).addTo(tLMap.map);

    L.control.attribution({ position: 'bottomright' }).addAttribution(tLMap.options.attribution).addTo(tLMap.map);

    tLMap.loadAllRoutes();

    tLMap.map.on('drag', tLMap.stopFollow);
    tLMap.map.on('zoomend', tLMap.checkForMarkers);
    tLMap.map.on('zoomend', tLMap.checkForDetourPopups)
    tLMap.map.on('moveend', tLMap.checkForDetourPopups);
    tLMap.map.on('moveend', tLMap.checkForMarkers);
    tLMap.map.on('popupopen', tLMap.checkPopupWidth);
    tLMap.map.on('popupclose', tLMap.clearStopTimer);

    tLMap.menuItems.unshift({ id: "dm_route", title: "Routes", callback: tLMap.showRoutesDialog },
        { id: "dm_stops", title: "Search For Stop", callback: tLMap.findStopDialog });

    $('#' + mapid).append('<div id="menuDiv"></div>');
    $("#menuDiv").addMenu({ title: "Menu", items: tLMap.menuItems });

    //Reset view control
    //$('.leaflet-control-zoom').append('<a class="leaflet-control-reset fa fa-refresh"></a>');

    if (tLMap.options.gpsEnabled) {
        tLMap.map.on('locationerror', tLMap.onLocationError);
        tLMap.map.on('locationfound', tLMap.onLocationFound);

        //Seems to be race condition with tile layer that causes a freeze if the map isn't ready
        tLMap.map.whenReady(function () {
            tLMap.map.locate();
        });

        $('.leaflet-control-reset').click(function (e) {
            tLMap.map.locate();
        });
    } else {
        $('.leaflet-control-reset').click(function (e) {
            tLMap.stopFollow();
            tLMap.map.setView(tLMap.options.loadDefaultCenter, tLMap.options.loadDefaultZoom, { 'animate': 'true' });
        });
    }

    tLMap.popupOptions.maxWidth = $('#' + mapid).width() - 60;
    $(document).resize(function () {
        tLMap.popupOptions.maxWidth = $('#' + mapid).width() - 60;
    });

    //ALERT POP-UP July 13th
    //if(thenum==0){                                                                                                                                   
    //      alert("11th Ave is closed for Regina Transit buses from Oct 16 – Nov 10. All westbound buses will use bus stop #1356 and all eastbound buses will use bus stop #0038 as the main transfer point on 12th Ave");                                           
    //  thenum += 1;
    // } 
};

/****************** Dialog constructors **********************************************/
tLMap.showRoutesDialog = function () {
    $.dialog({
        title: "Routes",
        id: "routeMenu",
        position: { left: 5, top: $("#menuDiv").offset().top + 5 },
        content: tLMap.routeDialogContent,
        onResize: tLMap.resizeRouteDialog,
        buttons: [{ id: 'clearBtn', value: "Clear Selected", onClick: function () { tLMap.clearRoutes(); tLMap.checkForMarkers(); } }],
        //BAD FIX FOR BUG: onDestroy seems to get overwritten to use most recently opened dialog (docked stop times).
        onDestroy: function () {
            tLMap.clearStopTimer();
            tLMap.resizeRouteDialog();
        },
        beforeShow: function () {
            $.each(tLMap.selectedRoutes, function (i, r) {
                tLMap.setRouteMenuActive(r);
            });
            tLMap.resizeRouteDialog();
        }
    });
};

tLMap.resizeRouteDialog = function () {
    var newHeight = $(document).height() - $("#menuDiv").offset().top - 80;

    if ($('#msg-box-dockDialog').length) {
        newHeight -= $('#msg-box-dockDialog').height() + 20;
    }

    $('#msg-box-ctn-routeMenu').height(newHeight);

    if ($('#msg-box-routeMenu').width() > $(document).width() - 40) {
        $("#msg-box-routeMenu").css("width", $(document).width() - 40 + "px");
        $("#msg-box-routeMenu").css("font-size", "small");
    }
};

tLMap.setRouteMenuActive = function (r) {
    $(".lblRoute" + r).removeClass("lblRouteOff");
};

tLMap.setRouteMenuInactive = function (r) {
    $(".lblRoute" + r).addClass("lblRouteOff");
};

tLMap.findStopDialog = function () {
    $.dialog({
        title: "Find Stop",
        id: "findStopDialog",
        position: { left: 5, top: $("#menuDiv").offset().top },
        content: '<span id="findStopTxt">Please enter the stop # you want to find:</span>',
        onResize: null,
        inputs: [{ type: "number", value: "", id: "searchStopId", min: "1", max: "9999" }],
        buttons: [{ value: "Find" }],
        beforeShow: function () {
            $("#searchStopId").bind("focus", function (e) {
                e.stopPropagation();
                e.preventDefault();
            });
        },
        success: function (state) {
            var stop = $("#searchStopId").val() || $("#searchStopId").attr("value");
            tLMap.findStop(stop);
        },
        afterShow: function () {
            $("#searchStopId").focus();
        }
    });
};

$(document).keyup(function (e) {
    if ($("#searchStopId").is(":focus") && (e.keyCode == 13)) {
        var stop = $("#searchStopId").val() || $("#searchStopId").attr("value");
        tLMap.findStop(stop);
    }
});

/***************************STOP FUNCTIONS***************************/
tLMap.loadStops = function () {
    $.ajax({
        type: "GET",
        url: JSON_ROOT + "/stops.js",
        cache: tLMap.options.cacheStops,
        ifModified: true,
        dataType: "json",
        success: function (data) {
            L.geoJson(data, {
                pointToLayer: function (feature, latlng) {
                    var stopMarker;
                    stopMarker = tLMap.createStopMarker(feature, latlng);

                    if (typeof (stopMarker) !== 'undefined') {
                        return stopMarker;
                    }
                }
            });

            if (tLMap.options.loadDefaultStop != -1) {
                tLMap.focusStop(tLMap.stops[padStr(tLMap.options.loadDefaultStop, 4)]);
            }
            tLMap.checkForMarkers();
        }
    });
};

tLMap.findStop = function (s) {
    s = padStr(s, 4);

    if (!(s in tLMap.stops)) {
        $("#findStopTxt").html("Sorry, no results returned");
        return;
    }

    $("#findStopTxt").html("Please enter the stop # you want to find:");
    var stopMarker = tLMap.stops[s];
    var stopInfo = stopMarker.feature.properties;
    var allRoutes = false;

    tLMap.clearRoutes();
    tLMap.focusStop(stopMarker);
};

//Center focus onto a stop
//Input:  StopMarker to focus on
tLMap.focusStop = function (s) {
    var stopInfo = s.feature.properties;
    //var popup = L.popup(tLMap.popupOptions);

    tLMap.stopFollow();

    //Setup listener to open popup once the map has moved
    tLMap.map.once('moveend', function (e) {
        //Move map down a bit to center popup
        //tLMap.map.panBy([0,-100]);
        tLMap.focusedStop = stopInfo.id;
        //popup.setContent(tLMap.defaultStopPopup(s));
        var popup = L.popup(tLMap.popupOptions)
            .setContent(tLMap.defaultStopPopup(s));

        s.bindPopup(popup).openPopup();

        tLMap.skip = 0;
        tLMap.getTimes();
        //Move map down a bit to center popup
        tLMap.map.panBy([0, -100]);
    });

    if (tLMap.map.getZoom() >= tLMap.options.zoomShowStops) {
        tLMap.map.panTo(s.getLatLng());
    } else {
        tLMap.map.setView(s.getLatLng(), tLMap.options.zoomShowStops);
    }
};

tLMap.defaultStopPopup = function (s) {
    var prop = s.feature.properties;

    if ($('#msg-box-dockDialog').length) {
        tLMap.dockDialog.destroy();
    }

    var content = '<div id="stopPopup">' +
        '<div class="leaflet-popup-title">' +
        '   <span id="popupHeader">' + (prop.id < 4004 ? prop.id + ': ' : '') + prop.name + '</span>' +
        '   <span class="msg-box-close" onclick="tLMap.map.closePopup();"></span>' +
        '   <div>Routes: ' + tLMap.popupRouteList(prop.r, prop.id) + '</div>';

    if (prop.sh == 1) {
        content += '<div>Sheltered Stop</div>';
    }

    content += '<div><font size="1">*Note: Predicted Stop Times are Approximate</font></div>';
    //Commented out the above to put in hardcoded messaged for on-demand stops - fix someday if we do on-demand
    /*
            if (prop.id == "0458" || prop.id == "0504" || prop.id == "0505" || prop.id == "0506" || prop.id == "0638" || prop.id == "0640" || prop.id == "0641" || prop.id == "0642" || prop.id == "0643" || prop.id == "0644" || prop.id == "0646" || prop.id == "0647" || prop.id == "0648" || prop.id == "0649" || prop.id == "0696" || prop.id == "0697" || prop.id == "0698" || prop.id == "0699" || prop.id == "0700" || prop.id == "0702" || prop.id == "0703" || prop.id == "0704" || prop.id == "0705" || prop.id == "0706" || prop.id == "0707" || prop.id == "0708" || prop.id == "0960" || prop.id == "0961" || prop.id == "0962" || prop.id == "0963" || prop.id == "0964" || prop.id == "0965" || prop.id == "0966" || prop.id == "0967" || prop.id == "0968" || prop.id == "0969" || prop.id == "0970" || prop.id == "0971" || prop.id == "0972" || prop.id == "0974" || prop.id == "0975" || prop.id == "0976" || prop.id == "0977" || prop.id == "0978" || prop.id == "0979" || prop.id == "0980" || prop.id == "0981" || prop.id == "0982" || prop.id == "0983" || prop.id == "0984" || prop.id == "0986" || prop.id == "1064" || prop.id == "1065" || prop.id == "1066" || prop.id == "1067" || prop.id == "1068" || prop.id == "1069" || prop.id == "1070" || prop.id == "1071" || prop.id == "1072" || prop.id == "1073" || prop.id == "1074" || prop.id == "1075" || prop.id == "1076" || prop.id == "1077" || prop.id == "1078" || prop.id == "1079" || prop.id == "1080" || prop.id == "1081" || prop.id == "1082" || prop.id == "1083" || prop.id == "1084" || prop.id == "1085" || prop.id == "1086" || prop.id == "1087" || prop.id == "1088" || prop.id == "1089" || prop.id == "1090" || prop.id == "1091" || prop.id == "1092" || prop.id == "1159" || prop.id == "1160" || prop.id == "1061" || prop.id == "1496") {
            content += '<div><font size="2">*Note: An ON-DEMAND Stop after 7pm on Weekdays</font></div>';
        } else if (prop.id == "0002" || prop.id == "0003" || prop.id == "0004" || prop.id == "0005" || prop.id == "0006" || prop.id == "0007" || prop.id == "0008" || prop.id == "0009" || prop.id == "0010" || prop.id == "0011" || prop.id == "0012" || prop.id == "0013" || prop.id == "0014" || prop.id == "0015" || prop.id == "0016" || prop.id == "0017" || prop.id == "0018" || prop.id == "0019" || prop.id == "0020" || prop.id == "0021" || prop.id == "0022" || prop.id == "0023" || prop.id == "0024" || prop.id == "0025" || prop.id == "0027" || prop.id == "0028" || prop.id == "0029" || prop.id == "0030" || prop.id == "0031" || prop.id == "0032" || prop.id == "0033" || prop.id == "0034" || prop.id == "0035" || prop.id == "0037" || prop.id == "0038" || prop.id == "0041" || prop.id == "0042" || prop.id == "0044" || prop.id == "0046" || prop.id == "0109" || prop.id == "0110" || prop.id == "0111" || prop.id == "0112" || prop.id == "0114" || prop.id == "0118" || prop.id == "0119" || prop.id == "0120" || prop.id == "0121" || prop.id == "0122" || prop.id == "0123" || prop.id == "0124" || prop.id == "0125" || prop.id == "0126" || prop.id == "0127" || prop.id == "0130" || prop.id == "0131" || prop.id == "0132" || prop.id == "0133" || prop.id == "0133" || prop.id == "0134" || prop.id == "0135" || prop.id == "0136" || prop.id == "0137" || prop.id == "0138" || prop.id == "0139" || prop.id == "0140" || prop.id == "0141" || prop.id == "0142" || prop.id == "0143" || prop.id == "0174" || prop.id == "0175" || prop.id == "0176" || prop.id == "0178" || prop.id == "0181" || prop.id == "0183" || prop.id == "0185" || prop.id == "0186" || prop.id == "0226" || prop.id == "0227" || prop.id == "0228" || prop.id == "0229" || prop.id == "0230" || prop.id == "0231" || prop.id == "0232" || prop.id == "0233" || prop.id == "0236" || prop.id == "0284" || prop.id == "0286" || prop.id == "0287" || prop.id == "0288" || prop.id == "0289" || prop.id == "0290" || prop.id == "0291" || prop.id == "0292" || prop.id == "0293" || prop.id == "0294" || prop.id == "0295" || prop.id == "0296" || prop.id == "0306" || prop.id == "0307" || prop.id == "338" || prop.id == "0350" || prop.id == "0351" || prop.id == "0352" || prop.id == "0353" || prop.id == "0354" || prop.id == "0356" || prop.id == "0357" || prop.id == "0358" || prop.id == "0359" || prop.id == "0360" || prop.id == "0361" || prop.id == "0403" || prop.id == "0404" || prop.id == "0405" || prop.id == "0406" || prop.id == "0407" || prop.id == "0408" || prop.id == "0410" || prop.id == "0411" || prop.id == "0412" || prop.id == "0450" || prop.id == "0452" || prop.id == "0453" || prop.id == "0454" || prop.id == "0455" || prop.id == "0497" || prop.id == "0650" || prop.id == "0651" || prop.id == "0652" || prop.id == "0653" || prop.id == "0654" || prop.id == "0691" || prop.id == "0692" || prop.id == "0693" || prop.id == "0694" || prop.id == "0695" || prop.id == "0862" || prop.id == "0863" || prop.id == "0864" || prop.id == "0865" || prop.id == "0866" || prop.id == "0867" || prop.id == "0868" || prop.id == "0869" || prop.id == "0870" || prop.id == "0871" || prop.id == "0872" || prop.id == "0873" || prop.id == "0874" || prop.id == "0875" || prop.id == "0876" || prop.id == "0877" || prop.id == "0878" || prop.id == "0879" || prop.id == "0880" || prop.id == "0881" || prop.id == "0882" || prop.id == "0883" || prop.id == "0884" || prop.id == "0886" || prop.id == "0959" || prop.id == "0987" || prop.id == "0988" || prop.id == "0989" || prop.id == "1140" || prop.id == "1141" || prop.id == "1142" || prop.id == "1143" || prop.id == "1144" || prop.id == "1145" || prop.id == "1146" || prop.id == "1147" || prop.id == "1148" || prop.id == "1149" || prop.id == "1150" || prop.id == "1151" || prop.id == "1152" || prop.id == "1153" || prop.id == "1154" || prop.id == "1155" || prop.id == "1156" || prop.id == "1157" || prop.id == "1158" || prop.id == "1174" || prop.id == "1199" || prop.id == "1273" || prop.id == "1355" || prop.id == "1356" || prop.id == "1360" || prop.id == "1362" || prop.id == "1364" || prop.id == "1365" || prop.id == "1366" || prop.id == "1367" || prop.id == "1368" || prop.id == "1369" || prop.id == "1500" || prop.id == "1501" || prop.id == "1542" || prop.id == "1544" || prop.id == "1545" || prop.id == "1547" || prop.id == "1549" || prop.id == "1271"
              || prop.id == "0047" || prop.id == "0049" || prop.id == "0050" || prop.id == "0051" || prop.id == "0052" || prop.id == "0053" || prop.id == "0054" || prop.id == "0055" || prop.id == "0056" || prop.id == "0057" || prop.id == "0058" || prop.id == "0059" || prop.id == "0060" || prop.id == "0061" || prop.id == "0062" || prop.id == "0063" || prop.id == "0064" || prop.id == "0084" || prop.id == "0085" || prop.id == "0086" || prop.id == "0087" || prop.id == "0088" || prop.id == "0089" || prop.id == "0090" || prop.id == "0091" || prop.id == "0092" || prop.id == "0093" || prop.id == "0094" || prop.id == "0096" || prop.id == "0097" || prop.id == "0098" || prop.id == "0099" || prop.id == "0101" || prop.id == "0102" || prop.id == "0103" || prop.id == "0104" || prop.id == "0105" || prop.id == "0106" || prop.id == "0159" || prop.id == "0160" || prop.id == "0161" || prop.id == "0162" || prop.id == "0163" || prop.id == "0164" || prop.id == "0165" || prop.id == "0166" || prop.id == "0167" || prop.id == "0168" || prop.id == "0170" || prop.id == "0172" || prop.id == "0173" || prop.id == "0187" || prop.id == "0189" || prop.id == "0191" || prop.id == "0193" || prop.id == "0194" || prop.id == "0195" || prop.id == "0196" || prop.id == "0197" || prop.id == "0198" || prop.id == "0199" || prop.id == "0200" || prop.id == "0214" || prop.id == "0215" || prop.id == "0216" || prop.id == "0217" || prop.id == "0218" || prop.id == "0219" || prop.id == "0220" || prop.id == "0221" || prop.id == "0222" || prop.id == "0223" || prop.id == "0224" || prop.id == "0225" || prop.id == "0297" || prop.id == "0298" || prop.id == "0299" || prop.id == "0300" || prop.id == "0301" || prop.id == "0302" || prop.id == "0303" || prop.id == "0304" || prop.id == "0305" || prop.id == "0308" || prop.id == "0337" || prop.id == "0339" || prop.id == "0340" || prop.id == "0341" || prop.id == "0342" || prop.id == "0343" || prop.id == "0344" || prop.id == "0345" || prop.id == "0346" || prop.id == "0347" || prop.id == "0348" || prop.id == "0413" || prop.id == "0414" || prop.id == "0415" || prop.id == "0416" || prop.id == "0417" || prop.id == "0419" || prop.id == "0420" || prop.id == "0421" || prop.id == "0423" || prop.id == "0425" || prop.id == "0426" || prop.id == "0427" || prop.id == "0428" || prop.id == "0459" || prop.id == "0460" || prop.id == "0461" || prop.id == "0462" || prop.id == "0463" || prop.id == "0464" || prop.id == "0465" || prop.id == "0466" || prop.id == "0467" || prop.id == "0468" || prop.id == "0470" || prop.id == "0471" || prop.id == "0472" || prop.id == "0473" || prop.id == "0474" || prop.id == "0475" || prop.id == "0480" || prop.id == "0481" || prop.id == "0482" || prop.id == "0483" || prop.id == "0484" || prop.id == "0485" || prop.id == "0486" || prop.id == "0487" || prop.id == "0488" || prop.id == "0490" || prop.id == "0491" || prop.id == "0492" || prop.id == "0493" || prop.id == "0494" || prop.id == "0495" || prop.id == "0496" || prop.id == "1227" || prop.id == "1231" || prop.id == "1232" || prop.id == "1234" || prop.id == "1235" || prop.id == "1266" || prop.id == "1268" || prop.id == "1272" || prop.id == "1434" || prop.id == "1435" || prop.id == "1454" || prop.id == "1455" || prop.id == "1456" || prop.id == "1457" || prop.id == "1458" || prop.id == "1459" || prop.id == "1460" || prop.id == "1461" || prop.id == "1462" || prop.id == "1463" || prop.id == "1470" || prop.id == "1471" || prop.id == "1472" || prop.id == "1473" || prop.id == "1474" || prop.id == "1536" || prop.id == "1552") {
            content += '<div><font size="2">*Note: Also an ON-DEMAND Stop after 7pm on Weekdays</font></div>';
        } else {
            content += '<div><font size="1">*Note: Predicted Stop Times are Approximate</font></div>';
        }
      */
    content += '</div><div class="stopTimes" stop="' + prop.id + '">';

    if (prop.msg.length && prop.dtrRoutes.length === 0) {
        content += '<span>' + prop.msg + '</span></div>';
        //If only Football express is entered, show its message
    } else if (tLMap.selectedRoutes.length > 0 && tLMap.selectedRoutes.every(function (value) { return value > 60 && value < 67 })) {
        content += '<span>' + tLMap.stops[4000].feature.properties.msg + '</span></div>';
    } else {
        content += '</div>' +
            '<div class="leaflet-popup-buttons">' +
            '   <input id="prevBtn" type="button" onclick="tLMap.prevBtn()" value="<Prev"/>' +
            '   <input id="prevSchd" type="button" onclick="tLMap.prevSchd()" value="Sch"/>' +
            '   <input id="dockBtn" type="button" onclick="tLMap.dockBtn()" value="Dock" />' +
            '   <input id="nextBtn" type="button" onclick="tLMap.nextBtn()" value="Next>"/>' +
            '</div></div>';
    }

    return content;
};

tLMap.popupRouteList = function (routes, id) {
    var routeshtml = '<ul class="routeList">';

    if (!$.isArray(routes)) {
        routes = [routes];
    }

    $.each(routes, function (i, r) {
        if ($.inArray(r, tLMap.routeList) >= 0) {
            routeshtml += '<li class="lblRoute' + r;

            if ($.inArray(r, tLMap.selectedRoutes) == -1) {
                routeshtml += ' lblRouteOff';
            }

            if (r == 65) {
                r = 'SSDT';
            } else if (r > 50 && r < 60) {
                r = 'S' + (r - 50);
            }

            if (r > 70) {
                r = '#';
            }

            if (r == 61) {
                r = 'SSWH';
            }

            if (r == 62) {
                r = 'SSNG';
            }

            if (r == 63) {
                r = 'SSVS';
            }

            if (r == 64) {
                r = 'SSSL';
            }

            if (r == 66) {
                r = 'SSR';
            }

            if (r == 67) {
                r = 'SSOC';
            }

            if (r == 68) {
                r = 'OD';
            }

            routeshtml += ' routeListing">' + r + "</li>";
        }
    });

    routeshtml += '</ul>';

    //If not a bus
    if (id !== 0) {
        var detours = tLMap.stops[id].feature.properties.dtrRoutes;

        if (detours.length > 0) {
            plural = detours.length == 1 ? ' ' : 's ';
            routeshtml += '<div>No service for route' + plural + detours.join() + ": <br>"
                + tLMap.stops[id].feature.properties.msg + '</div>';
        }
    }

    return routeshtml;
};

tLMap.clickStop = function (e) {
    tLMap.focusStop(tLMap.stops[e.target.feature.properties.id]);
};

tLMap.getTimes = function (stop) {
    stop = typeof stop !== 'undefined' ? stop : tLMap.focusedStop;
    var prop = tLMap.stops[stop].feature.properties;

    if (prop.msg.length && prop.dtrRoutes.length === 0
        || (tLMap.selectedRoutes.length > 0 && tLMap.selectedRoutes.every(function (value) { return value > 60 && value < 67 }))) {
        return;
    }

    routes = tLMap.getRoutes();

    if (prop.dtrRoutes.length) {
        if (routes == "all") {
            curRoutes = prop.r;
        } else {
            curRoutes = routes.split(',').map(function (i) { return parseInt(i); });
        }
        routes = diff(curRoutes, prop.dtrRoutes).join();
    }

    data = {
        action: 'stop_times',
        stop: stop,
        routes: routes,
        lim: tLMap.options.numStopTimes,
        skip: tLMap.skip,
        ws: tLMap.options.showSeconds ? 1 : 0
    };

    $.ajax({
        type: "GET",
        dataType: "json",
        url: AJAX_ROOT + "/livemap.php",
        data: data,
        success: tLMap.stopTimeContent
    });
};

tLMap.stopTimeContent = function (response) {
    var vis;
    var content = "";
    var len = response.length;

    if (len) {
        for (i = 0; i < tLMap.options.numStopTimes; i++) {
            time = response[i];
            content += "<div id='stopTime" + i + "' class='stopTime'>";

            if (typeof (time) !== "undefined") {
                if (time.bus_id === null) {
                    time.bus_id = 'Scheduled';
                } else {
                    time.bus_id = 'Bus #' + time.bus_id;
                }

                content += "#" + time.route_id;

                if ($('#msg-box-dockDialog').length === 0) {
                    content += "-" + time.line_name;
                }

                content += ": " + time.pred_time + " - " + time.bus_id + '</span>';

                if (time.last_stop > 0) {
                    content += '<i class="fa fa-info-circle infoBox" onclick="tLMap.stopInfoBox(event,\'' + padStr(time.last_stop, 4) + '\', \'' + time.end_time + '\')"></i>';
                }
            }

            content += "</div>";
        }

        if (!tLMap.stopTimer) {
            tLMap.stopTimer = window.setInterval(tLMap.getTimes, tLMap.options.setStopsTimer);
        }
    } else {
        var tStop = $('#popupHeader').text().substring(0, $('#popupHeader').text().indexOf(' ') - 1);

        if (tStop == "3998" || tStop == "1599")
            content = '<br><div>Temporary Stop for Routes:<br> 2, 3, 7, 8, 9, 12, 30, 50 and 60</div><br>';
        else
            content = '<br><div>No more times today.</div><br>';
    }

    vis = tLMap.skip <= 0 ? 'hidden' : 'visible';
    $("#prevBtn").css('visibility', vis);

    vis = len != tLMap.options.numStopTimes ? 'hidden' : 'visible';
    $("#nextBtn").css('visibility', vis);

    $('.stopTimes').html(content);

    if ($('#msg-box-dockDialog').length) {
        tLMap.resizeRouteDialog();
    }

    if (tLMap.focusedStop && tLMap.hoveringOn == -1) {
        tLMap.stops[tLMap.focusedStop].setPopupContent($('#stopPopup').html()).update();
        tLMap.checkPopupWidth();
    }
};

tLMap.stopInfoBox = function (e, stop, time) {
    e.stopPropagation();

    //Stop from creating another popup when clicking on the infoWindow
    if (e.target.className.indexOf('infoWindow') > -1) {
        return;
    }

    infos = document.getElementsByClassName('infoWindow');
    while (infos.length) {
        infos[0].parentNode.removeChild(infos[0]);
    }

    info = document.createElement('div');
    info.className += 'infoWindow';
    info.textContent = 'This bus finishes its route at stop #' + stop + ': ' + tLMap.stops[stop].feature.properties.name + ' @ ' + time;
    e.target.appendChild(info);

    //reset timer
    clearInterval(tLMap.stopTimer);
    tLMap.stopTimer = window.setInterval(tLMap.getTimes, tLMap.options.setStopsTimer);

    document.addEventListener('click', function () {
        //remove own listener
        document.removeEventListener('click', arguments.callee);
        //Remove all infoWindows, just in case
        infos = document.getElementsByClassName('infoWindow');
        while (infos.length) {
            infos[0].parentNode.removeChild(infos[0]);
        }
    });
}

//resize the popup if needed
tLMap.checkPopupWidth = function () {
    var widest = 0;
    $('.leaflet-popup-content').children().each(function () {
        if ($(this).width() > widest) {
            widest = $(this).width();
        }
    });
    $('.leaflet-popup-content').width(widest);

    //keep it all on one line if we can
    if (widest >= tLMap.popupOptions.maxWidth) {
        $('.leaflet-popup-content').css('font-size', 'small');
        $('.leaflet-popup-content').css('white-space', 'normal');
    }
};

tLMap.clearStopTimer = function () {
    clearInterval(tLMap.stopTimer);
    tLMap.stopTimer = 0;
    if (tLMap.focusedStop !== 0) {
        tLMap.stops[tLMap.focusedStop].unbindPopup();
        tLMap.focusedStop = 0;
    }
};

tLMap.prevBtn = function (e) {
    if (tLMap.skip > 0) {
        tLMap.skip -= tLMap.options.numStopTimes;
        tLMap.getTimes();
    }
};

tLMap.prevSchd = function (e) {
    window.location.href = "https://transitlive.com/mobile/textview.php?display=m&stop_id=" + tLMap.focusedStop + "&route_id=0&action=show_times";
};

tLMap.nextBtn = function (e) {
    tLMap.skip += tLMap.options.numStopTimes;
    tLMap.getTimes();
};

tLMap.dockBtn = function (e) {
    var s = $('.stopTimes').attr('stop');
    tLMap.map.closePopup();

    tLMap.dockDialog = $.dialog({
        id: 'dockDialog',
        title: "#" + s + ' ' + tLMap.popupRouteList(tLMap.stops[s].feature.properties.r, tLMap.stops[s].feature.properties.id) + '</div>',
        content: '<div stop="' + s + '" class="stopTimes"></div>',
        onResize: null,
        position: { left: 5, bottom: 5 },
        buttons: [{ id: 'prevBtn', value: '< Prev', onClick: tLMap.prevBtn },
        { id: 'nextBtn', value: 'Next >', onClick: tLMap.nextBtn }],
        onDestroy: function () {
            tLMap.clearStopTimer();
            tLMap.resizeRouteDialog();
        }
    });

    tLMap.focusedStop = s;
    tLMap.getTimes();
};

tLMap.createStopMarker = function (feature, latlng) {
    var prop = feature.properties;
    var className = 'stopIcon';
    var anchor = [0, 0];
    var popAnchor = [0, 0];
    var innerhtml;
    var size = 40;
    var halfSize = size / 2;
    var quarterSize = size / 4;

    if (prop.msg.length) {
        if (prop.dtrRoutes.length) {
            className = 'partialDetour';
        } else if (prop.id >= "4004") {
            className = 'footballMarker';
            //stupid kluge - removing some numbers that are detoured from below replaced with zeros for now
            //0976, 0977, 0978, 1072, 1073, 1074
        }
        /*	else if(prop.id == "0458" || prop.id == "0459" || prop.id == "0504" || prop.id == "0505" || prop.id == "0506" || prop.id == "0638" || prop.id == "0640" || prop.id == "0641" || prop.id == "0642" || prop.id == "0643" || prop.id == "0644" || prop.id == "0646" || prop.id == "0647" || prop.id == "0648" || prop.id == "0649" || prop.id == "0696" || prop.id == "0697" || prop.id == "0698" || prop.id == "0699" || prop.id == "0700" || prop.id == "0702" || prop.id == "0703" || prop.id == "0704" || prop.id == "0705" || prop.id == "0706" || prop.id == "0707" || prop.id == "0708" || prop.id == "0960" || prop.id == "0961" || prop.id == "0962" || prop.id == "0963" || prop.id == "0964" || prop.id == "0965" || prop.id == "0966" || prop.id == "0967" || prop.id == "0968" || prop.id == "0969" || prop.id == "0970" || prop.id == "0971" || prop.id == "0972" || prop.id == "0974" || prop.id == "0975" || prop.id == "0000" || prop.id == "0000" || prop.id == "0000" || prop.id == "0979" || prop.id == "0980" || prop.id == "0981" || prop.id == "0982" || prop.id == "0983" || prop.id == "0984" || prop.id == "0986" || prop.id == "1064" || prop.id == "1065" || prop.id == "1066" || prop.id == "1067" || prop.id == "1068" || prop.id == "1069" || prop.id == "1070" || prop.id == "1071" || prop.id == "0000" || prop.id == "0000" || prop.id == "0000" || prop.id == "1075" || prop.id == "1076" || prop.id == "1077" || prop.id == "1078" || prop.id == "1079" || prop.id == "1080" || prop.id == "1081" || prop.id == "1082" || prop.id == "1083" || prop.id == "1084" || prop.id == "1085" || prop.id == "1086" || prop.id == "1087" || prop.id == "1088" || prop.id == "1089" || prop.id == "1090" || prop.id == "1091" || prop.id == "1092" || prop.id == "1159" || prop.id == "1160" || prop.id == "1061" || prop.id == "1496") {
                    className = 'stopMarker';
                }
        */
        else {
            className = 'detourMarker';
        }
    } else if (prop.sh) {
        className = 'shelterMarker';
    } else {
        className = 'stopMarker';
    }

    switch (prop.dir) {
        case 'NB': anchor = [quarterSize, halfSize]; popAnchor = [quarterSize, -quarterSize]; break;
        case 'SB': anchor = [(3 * quarterSize), halfSize]; popAnchor = [-quarterSize, -quarterSize]; break;
        case 'EB': anchor = [halfSize, quarterSize]; popAnchor = [0, 0]; break;
        case 'WB': anchor = [halfSize, (3 * quarterSize)]; popAnchor = [0, -halfSize]; break;
    }

    className += ' stop' + prop.dir[0];
    innerhtml = '<div class="' + className + '"></div>';

    var stopIcon = L.divIcon({
        iconSize: [size, size],
        iconAnchor: anchor,        // point of the icon which will correspond to marker's location
        popupAnchor: popAnchor,     // point from which the popup should open relative to the iconAnchor
        className: 'stopArea',
        html: innerhtml
    });

    var marker = L.marker(latlng, { icon: stopIcon, title: prop.id });
    marker.on('click', tLMap.clickStop);

    tLMap.stops[prop.id] = marker;

    return marker;
};

tLMap.checkForMarkers = function (r) {
    //Worry about zoom for stops
    if (tLMap.map.getZoom() >= tLMap.options.zoomShowStops) {
        $.each(tLMap.stops, function (s, marker) {
            tLMap.checkMarker(marker);
        });
    } else {
        $.each(tLMap.stops, function (s, marker) {
            tLMap.map.removeLayer(marker);
        });
    }

    //Don't worry about zoom for buses
    $.each(tLMap.buses, function (b, marker) {
        if (typeof (marker.feature) !== "undefined") {
            tLMap.checkMarker(marker);
        } else {
            delete tLMap.buses[b];
        }
    });
};

tLMap.checkMarker = function (marker) {
    if (tLMap.markerOnRoute(marker.feature.properties.r) && tLMap.map.getBounds().contains(marker.getLatLng())) {
        tLMap.map.addLayer(marker);
    } else {
        tLMap.map.removeLayer(marker);
    }
};

tLMap.markerOnRoute = function (routes) {
    if (!tLMap.options.loadOffRoute && routes === 0) {
        return false;
    }
    //a temp fix for charters so public interface don't see them - doesn't even show-up with a=1 which needs to be fixed later
    if (routes === 70 && !tLMap.options.showAllBuses) {
        return false;
    }
    //doing the same as above but for route 67 which is now the TRAINING buses - jan 2020
    if (routes === 67 && !tLMap.options.showAllBuses) {
        return false;
    }
    var len = tLMap.selectedRoutes.length;

    if (len) {
        if ($.isArray(routes)) {
            while (len--) {
                if ($.inArray(tLMap.selectedRoutes[len], routes) > -1) {
                    return true;
                }
            }

            return false;
        } else {
            if ($.inArray(routes, tLMap.selectedRoutes) > -1) {
                return true;
            } else {
                return false;
            }
        }
    } else {
        return true;
    }
};

/***************************LOCATION FUNCTIONS***************************/
tLMap.onLocationError = function () {
    navigator.geolocation.clearWatch(tLMap.options.gpsId);
    tLMap.map.stopLocate();
};

tLMap.onLocationFound = function (e) {
    tLMap.stopFollow();

    if ($.isEmptyObject(tLMap.gpsMarker)) {
        var gpsIcon = L.icon({
            iconUrl: IMAGE_ROOT + "/gps_icon.png",
            iconSize: [10, 10],
            iconAnchor: [5, 5]
        });

        tLMap.gpsMarker = L.marker(e.latlng, { icon: gpsIcon, zIndexOffset: 1000 }).addTo(tLMap.map);
        tLMap.map.setView(e.latlng, tLMap.options.zoomShowStops);
        tLMap.gpsMarker.on('click', function (e) {
            tLMap.map.setView(e.latlng, tLMap.options.zoomShowStops);
        });
    } else {
        tLMap.gpsMarker.setLatLng(e.latlng);
        tLMap.map.setView(e.latlng, tLMap.options.zoomShowStops);
    }
};

/***************************ROUTE FUNCTIONS***************************/
tLMap.getRoutes = function () {
    return tLMap.selectedRoutes.length ? tLMap.selectedRoutes.join() : 'all';
};

tLMap.clearRoutes = function () {
    while (tLMap.selectedRoutes[0]) {
        tLMap.toggleRoute(tLMap.selectedRoutes[0]);
    }

    tLMap.selectedRoutes = [];
};

tLMap.checkForDetourPopups = function () {
    $.each(tLMap.detourLayer, function (e, detour) {
        if (detour.getLayers().length != 0 && detour._map !== undefined && detour._map !== null) {
            if (tLMap.map.getZoom() >= tLMap.options.zoomShowDetourPopups) {
                detour.eachLayer(function (layer) { layer.openPopup() });;
            }
            else {
                detour.eachLayer(function (layer) { layer.closePopup() });
            }
        }
    })
}

tLMap.toggleRoute = function (r) {
    //select route
    var i = $.inArray(r, tLMap.selectedRoutes);
    if (i == -1) {
        tLMap.selectedRoutes.push(parseInt(r));
        tLMap.showRoute(r);
        //deselect route
    } else if (i >= 0) {
        tLMap.selectedRoutes.splice(i, 1);
        tLMap.hideRoute(r);
    }
};

tLMap.showRoute = function (r) {
    if (r in tLMap.routeLayer) {
        tLMap.map.addLayer(tLMap.routeLayer[r]);
        if (r in tLMap.dashLayer) {
            tLMap.map.addLayer(tLMap.dashLayer[r]);
            if (r in tLMap.dashLayer2) {
                tLMap.map.addLayer(tLMap.dashLayer2[r]);
                if (r in tLMap.dashLayer3) {
                    tLMap.map.addLayer(tLMap.dashLayer3[r]);
                    if (r in tLMap.dashLayer4) {
                        tLMap.map.addLayer(tLMap.dashLayer4[r]);
                    }
                }
            }
        }
        if (r in tLMap.detourLayer && tLMap.detourLayer[r].getLayers().length > 0) {
            tLMap.map.addLayer(tLMap.detourLayer[r]);
            if (tLMap.map.getZoom() >= tLMap.options.zoomShowDetourPopups) {
                tLMap.detourLayer[r].eachLayer(function (layer) { layer.openPopup() });
            }
        }
    } else {
        tLMap.loadRoute(r, true);
    }

    tLMap.setRouteMenuActive(r);
    tLMap.checkForMarkers(r);                  //Show/hide stops

    if (tLMap.focusedStop) {
        tLMap.getTimes();
    }
};

tLMap.hideRoute = function (r) {
    //Only remove if not kept in selectedRoutes(to distinguish hovering vs clicking)
    if ($.inArray(r, tLMap.selectedRoutes) == -1) {
        if (r in tLMap.routeLayer) {
            tLMap.map.removeLayer(tLMap.routeLayer[r]);
            if (r in tLMap.dashLayer) {
                tLMap.map.removeLayer(tLMap.dashLayer[r]);
                if (r in tLMap.dashLayer2) {
                    tLMap.map.removeLayer(tLMap.dashLayer2[r]);
                    if (r in tLMap.dashLayer3) {
                        tLMap.map.removeLayer(tLMap.dashLayer3[r]);
                        if (r in tLMap.dashLayer4) {
                            tLMap.map.removeLayer(tLMap.dashLayer4[r]);
                        }
                    }
                }
            }
        }
        if (r in tLMap.detourLayer) {
            tLMap.detourLayer[r].eachLayer(function (layer) { layer.closePopup() });
            tLMap.map.removeLayer(tLMap.detourLayer[r]);
        }
        tLMap.setRouteMenuInactive(r);
        //With the route hidden, now is a good time to reload the route data in case of changes.
        tLMap.loadDetours(r);
    }

    tLMap.checkForMarkers(r);                  //Show/hide stops

    if (tLMap.focusedStop) {
        tLMap.getTimes();
    }
};

tLMap.hoverRoute = function (r, hoverIn) {
    var i = $.inArray(r, tLMap.selectedRoutes);
    if (hoverIn && i == -1) {
        tLMap.hoveringOn = r;
        tLMap.toggleRoute(r);
    }

    if (!hoverIn && tLMap.hoveringOn >= 0) {
        tLMap.toggleRoute(r);
        tLMap.hoveringOn = -1;
    }
};

tLMap.loadAllRoutes = function () {
    var prefix, rid;
    var colour, r, g, b;

    $.ajax({
        type: "GET",
        dataType: 'json',
        url: AJAX_ROOT + '/livemap.php',
        data: { action: 'get_routes', all: tLMap.options.loadOffRoute },
        success: function (data) {
            var cssColours = "<style>";
            tLMap.routeDialogContent = '<ul class="msg-box-list">';
            var content = '';

            $.each(data, function (rid, route) {
                rid = parseInt(route.route_id);
                colour = route.colour;
                tLMap.routeList.push(rid);

                if (tLMap.options.loadRouteJSON) {
                    tLMap.loadRoute(rid, tLMap.selectedRoutes.indexOf(rid) > -1);
                }

                //Hide route id in SPECIAL routes (currently everything over 50)
                if (rid <= 50) {
                    prefix = rid + " - ";
                } else {
                    prefix = '';
                }

                if (route.proposed != 1 && route.route_id == 79) {
                    tLMap.routeDialogContent += '<li class="lblRoute' + rid + ' lblRouteOff">'
                        + prefix + route.name + ' - <b>COMING SOON</b></li>';
                } else if (route.proposed != 1) {
                    tLMap.routeDialogContent += '<li class="lblRoute' + rid + ' lblRouteOff">'
                        + prefix + route.name + '</li>';
                }

                $(document).on("click", ".lblRoute" + rid, function (evt) {
                    var i = $.inArray(tLMap.hoveringOn, tLMap.selectedRoutes);

                    //Craig: stuff added for alerts for Aug 2020 on-demand and route announcements

                    //if(thehours > 18 && thehours < 25){ 

                    //    if(thenum==0){

                    //        if(rid==21 || rid==30) {
                    //            alert("Service for Routes #21 and #30 start on August 30th");
                    //alert("On-Demand service for Route #10 stops will begin August 31st after 7pm")
                    //            thenum += 1;
                    //        }
                    //    }
                    //}

                    //if(thenum2==0){

                    //	if(rid==68) {

                    //	    alert("New Saturday Service! You can now book an On Demand transit ride Saturday evenings from 7 p.m. to 1.a.m around the north area of Regina. Learn more at\n Regina.ca/ondemand");
                    //	    thenum2 +=1;
                    //	}
                    //  }

                    //Craig: thenum is just a simple way to determine whether or not the route has been clicked before
                    //Only want the alert pop-up once per session

                    //    if(thenum2==0){
                    //        if(rid==16  || rid==17 || rid==22) {
                    //        alert("Routes #16, #17, #22 are returning to service on August 31st");
                    //        thenum2 += 1;
                    //        }
                    //    }

                    //if(thenum3==0){
                    //	if(rid==1){
                    //	  alert("New Service!\n Starting February 1, residents living in the Westerra neighbourhood will have a direct transit route to downtown with the extension of the Dieppe - Route #1 bus schedule.\n Learn more at\n Regina.ca/transit.");
                    //	  thenum3 += 1;
                    //	}
                    //    }


                    //Only toggle if hovering hasn't done so already, otherwise reset hover
                    if (tLMap.hoveringOn && i == -1) {
                        tLMap.toggleRoute(rid);
                    } else {
                        tLMap.hoveringOn = -1;
                        if (tLMap.focusedStop) {
                            tLMap.getTimes();
                        }
                    }
                });

                if (tLMap.options.routeHover) {
                    $(document).on("mouseover", ".lblRoute" + rid, function (evt) {
                        evt.stopPropagation();
                        tLMap.hoverRoute(rid, true);
                    });

                    $(document).on("mouseout", ".lblRoute" + rid, function (evt) {
                        evt.stopPropagation();
                        tLMap.hoverRoute(rid, false);
                    });
                }

                function hexToR(h) { return parseInt(h.substring(1, 3), 16); }
                function hexToG(h) { return parseInt(h.substring(3, 5), 16); }
                function hexToB(h) { return parseInt(h.substring(5, 7), 16); }

                var r = hexToR(colour);
                var g = hexToG(colour);
                var b = hexToB(colour);
                var busColour = 'rgba(' + r + ',' + g + ',' + b + ',0.65)';

                cssColours += '.busRoute' + rid + ' { background-color: ' + busColour + ' } ' +
                    'li.lblRoute' + rid + ' { background-color: ' + colour + '; color: white; }';
            });

            tLMap.routeDialogContent += '</ul>';

            $(cssColours + '</style>').appendTo(document.documentElement);

            if (typeof tLMap.prepProposedContent !== 'undefined') {
                tLMap.prepProposedContent(data);
            }

            if (tLMap.options.loadDefaultRoute != '-1') {
                var routes = tLMap.options.loadDefaultRoute.split(',');
                var len = routes.length;

                while (len--) {
                    tLMap.toggleRoute(routes[len]);
                }
            }

            if (tLMap.options.loadDetour != '-1') {
                var droutes = tLMap.options.loadDetour;
                //    var dlen = droutes.length;
                console.log(droutes);

                //    while(dlen--) {
                tLMap.loadDetourAdmin(droutes, true);
                //    }
            }

            tLMap.loadBuses();
            tLMap.loadStops();
        }
    });
};


tLMap.loadRoute = function (r, show) {
    // Base path for this route's polyline files
    var base = JSON_ROOT + "/polyLines/route" + r;
    // Version query to break caches when you change the files
    var v = "?v=" + ROUTE_JS_VERSION;

    $.getJSON(base + ".js" + v, function (data) {
        // EXACTLY as before
        tLMap.routeLayer[r] = new L.Polyline(data.coordinates, data.style);

        // TODO comment kept as-is
        //TODO: find non hardcode solution to determine dashed routes.
        if (r == 1 || r == 10 || r == 61 || r == 62 || r == 63 || r == 64 ||
            r == 65 || r == 67 || r == 72 || r == 74 || r == 76 || r == 77 ||
            r == 78 || r == 101) {

            // Same condition, same assignment, just with ?v=... appended
            $.getJSON(base + "-dashed.js" + v, function (data) {
                tLMap.dashLayer[r] = new L.Polyline(data.coordinates, data.style);
            });
        }

        if (r == 72 || r == 74 || r == 1 || r == 62 || r == 63 || r == 64) {
            // All three dashed variants still loaded with the same rules
            $.getJSON(base + "-dashed2.js" + v, function (data) {
                tLMap.dashLayer2[r] = new L.Polyline(data.coordinates, data.style);
            });
            $.getJSON(base + "-dashed3.js" + v, function (data) {
                tLMap.dashLayer3[r] = new L.Polyline(data.coordinates, data.style);
            });
            $.getJSON(base + "-dashed4.js" + v, function (data) {
                tLMap.dashLayer4[r] = new L.Polyline(data.coordinates, data.style);
            });
        }

        if (show) {
            // Same as before: only add the main route layer if `show` is true
            tLMap.map.addLayer(tLMap.routeLayer[r]);
        }
    });

    // This is still outside the callback, exactly like your original
    tLMap.loadDetours(r, show);
};


var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

tLMap.loadDetours = function (r, show) {
    $.ajax({
        type: 'POST',
        dataType: 'JSON',
        data: { action: 'loadDetour', route: r },
        url: AJAX_ROOT + "/detour.php",
        success: function (data) {
            if (data.length == 0) return;
            if (data.coordinates[0].length > 0) {
                if (!(r in tLMap.detourLayer)) {
                    tLMap.detourLayer[r] = new L.FeatureGroup();
                }
                data.coordinates.forEach(function (route, index) {
                    if (tLMap.detourLayer[r].getLayers().some(function (layer) { return layer.options.className == data.detourIDs[index]; })) {
                        return;
                    }
                    options = $.extend({}, data.style, { className: data.detourIDs[index] });
                    startDate = new Date(data.startDates[index].replace(' ', 'T'));
                    endDate = new Date(data.endDates[index].replace(' ', 'T'));
                    if (!tLMap.options.showAllDetours && !parseInt(data.showDefault[index]) && (startDate.valueOf() > Date.now() || endDate.valueOf() < Date.now())) {
                        return;
                    }
                    startDateText = months[startDate.getMonth()] + " " + startDate.getDate() + ", " + startDate.getFullYear() + ", " + startDate.toLocaleTimeString();
                    endDateText = months[endDate.getMonth()] + " " + endDate.getDate() + ", " + endDate.getFullYear() + ", " + endDate.toLocaleTimeString();
                    dateRange = startDateText + " -</br> " + endDateText;
                    if (data.oneWays[index] != "0") {
                        tLMap.detourLayer[r].addLayer(new L.ArrowPath(route, options).bindPopup("<p>DETOUR</p><div><font size='1'>" + dateRange + "</font></div>", { autoPan: false, closeButton: false, autoClose: false, closeOnEscapeKey: false }));
                    } else {
                        tLMap.detourLayer[r].addLayer(new L.Polyline(route, options).bindPopup("<p>DETOUR</p><div><font size='1'>" + dateRange + "</font></div>", { autoPan: false, closeButton: false, autoClose: false, closeOnEscapeKey: false }));
                    }
                });
                if (show) {
                    tLMap.map.addLayer(tLMap.detourLayer[r]);
                    if (tLMap.detourLayer[r].getLayers.length != 0) {
                        tLMap.detourLayer[r];
                        if (tLMap.map.getZoom() >= tLMap.options.zoomShowDetourPopups) {
                            tLMap.detourLayer[r].eachLayer(function (layer) { layer.openPopup() });
                        }
                    }
                }
            }
        }
    })
}

tLMap.loadDetourAdmin = function (r, show) {
    $.ajax({
        type: 'POST',
        dataType: 'JSON',
        data: { action: 'loadDetourAdmin', route: r },
        url: AJAX_ROOT + "/detour.php",
        success: function (data) {
            if (data.length == 0) return;
            if (data.coordinates[0].length > 0) {
                if (!(r in tLMap.detourLayer)) {
                    tLMap.detourLayer[r] = new L.FeatureGroup();
                }
                data.coordinates.forEach(function (route, index) {
                    if (tLMap.detourLayer[r].getLayers().some(function (layer) { return layer.options.className == data.detourIDs[index]; })) {
                        return;
                    }
                    options = $.extend({}, data.style, { className: data.detourIDs[index] });
                    startDate = new Date(data.startDates[index].replace(' ', 'T'));
                    endDate = new Date(data.endDates[index].replace(' ', 'T'));
                    //                    if(!tLMap.options.showAllDetours && !parseInt(data.showDefault[index]) && (startDate.valueOf() > Date.now() || endDate.valueOf() < Date.now())){
                    //                        return;
                    //                    }
                    startDateText = months[startDate.getMonth()] + " " + startDate.getDate() + ", " + startDate.getFullYear() + ", " + startDate.toLocaleTimeString();
                    endDateText = months[endDate.getMonth()] + " " + endDate.getDate() + ", " + endDate.getFullYear() + ", " + endDate.toLocaleTimeString();
                    dateRange = startDateText + " -</br> " + endDateText;
                    if (data.oneWays[index] != "0") {
                        tLMap.detourLayer[r].addLayer(new L.ArrowPath(route, options).bindPopup("<p>DETOUR</p><div><font size='1'>" + dateRange + "</font></div>", { autoPan: false, closeButton: false, autoClose: false, closeOnEscapeKey: false }));
                    } else {
                        tLMap.detourLayer[r].addLayer(new L.Polyline(route, options).bindPopup("<p>DETOUR</p><div><font size='1'>" + dateRange + "</font></div>", { autoPan: false, closeButton: false, autoClose: false, closeOnEscapeKey: false }));
                    }
                });
                if (show) {
                    tLMap.map.addLayer(tLMap.detourLayer[r]);
                    if (tLMap.detourLayer[r].getLayers.length != 0) {
                        tLMap.detourLayer[r];
                        if (tLMap.map.getZoom() >= tLMap.options.zoomShowDetourPopups) {
                            tLMap.detourLayer[r].eachLayer(function (layer) { layer.openPopup() });
                        }
                    }
                }
            }
        }
    })
}





/***************************BUS FUNCTIONS***************************/
tLMap.loadBuses = function () {
    if (tLMap.options.enableBuses) {
        $.ajax({
            type: "GET",
            url: JSON_ROOT + "/buses.js",
            cache: false,
            dataType: "json",
            success: function (data) {
                L.geoJson(data, {
                    pointToLayer: tLMap.createBusMarker
                });

                tLMap.busTimer = window.setInterval(tLMap.updateBuses, tLMap.options.setBusesTimer);
                tLMap.removeBusTimer = window.setInterval(tLMap.deleteBuses, tLMap.options.setBusesRemoveTimer);

                if (tLMap.options.loadDefaultBus && typeof (tLMap.buses[tLMap.options.loadDefaultBus]) !== "undefined") {
                    tLMap.followBus(tLMap.buses[tLMap.options.loadDefaultBus]);
                }
            }
        });
    }
};

tLMap.updateBuses = function () {
    $.ajax({
        type: "GET",
        url: JSON_ROOT + "/updatedBuses.js",
        cache: false,
        dataType: "json",
        success: function (data) {
            L.geoJson(data, {
                pointToLayer: tLMap.createBusMarker
            });

            if (tLMap.follow) {
                tLMap.map.panTo(tLMap.buses[tLMap.follow].getLatLng());
                if (typeof (tLMap.buses[tLMap.follow].getPopup()) === "undefined") {
                    var popup = L.popup(tLMap.popupOptions);
                    popup.setContent(tLMap.busPopupContent(tLMap.buses[tLMap.follow].feature.properties));

                    tLMap.buses[tLMap.follow].bindPopup(popup).openPopup();
                }
            }
        }
    });
};

tLMap.createBusIcon = function (prop) {
    var imageSize;
    var sAnchor;
    var popupAnchor;
    var busImage = IMAGE_ROOT + '/';
    var className = "busIcon busRoute" + prop.r;

    if (prop.dir > 45 && prop.dir < 135) {
        busImage += "busEast.png"; imageSize = [28, 16]; sAnchor = [7, 25]; popupAnchor = [0, -11];
    } else if (prop.dir >= 135 && prop.dir < 225) {
        busImage += "busSouth.png"; imageSize = [18, 28]; sAnchor = [-7, 7]; popupAnchor = [0, -20];
    } else if (prop.dir >= 225 && prop.dir < 315) {
        busImage += "busWest.png"; imageSize = [28, 18]; sAnchor = [7, 25]; popupAnchor = [0, -11];
    } else {
        busImage += "busNorth.png"; imageSize = [18, 28]; sAnchor = [-7, 7]; popupAnchor = [0, -21];
    }

    return L.icon({
        iconUrl: busImage,
        iconSize: imageSize, // size of the icon
        className: className,
        popupAnchor: popupAnchor
    });
};

tLMap.createBusMarker = function (feature, latlng) {
    var prop = feature.properties;
    var marker = L.marker(latlng, { icon: tLMap.createBusIcon(prop), title: 'Bus: ' + prop.b + ', Route: ' + prop.r, zIndexOffset: 2000 });

    marker.on('click', tLMap.followBus);

    if (typeof (tLMap.buses[prop.b]) !== "undefined") {
        tLMap.map.removeLayer(tLMap.buses[prop.b]);
    }

    tLMap.buses[prop.b] = marker;

    if (tLMap.markerOnRoute(prop.r)) {
        marker.addTo(tLMap.map);
    }

    return marker;
};

tLMap.deleteBuses = function () {
    $.ajax({
        type: "GET",
        dataType: 'json',
        url: AJAX_ROOT + "/livemap.php",
        data: { action: "off_bus" },
        success: function (data) {
            $.each(data, function (key, bus) {
                if (typeof (tLMap.buses[bus.bus_id]) !== "undefined") {
                    tLMap.map.removeLayer(tLMap.buses[bus.bus_id]);
                    delete tLMap.buses[bus.bus_id];
                }
            });
        }
    });
};

tLMap.busPopupContent = function (prop) {
    return '<div class="msg-box-title">' +
        '<span id="popupHeader">' + prop.line + '</span>' +
        '</div>' +
        '<div class="msg-box-content">' +
        '   <span bus="' + prop.b + '">' +
        '     Bus: ' + prop.b + '<br/>' +
        '     Route: ' + tLMap.popupRouteList(prop.r, 0) +
        '   </span>' +
        '</div>';
};

tLMap.clearBusTimers = function () {
    clearInterval(tLMap.busTimer);
    clearInterval(tLMap.removeBusTimer);
    tLMap.options.busTimer = 0;
    tLMap.options.removeBusTimer = 0;
};

tLMap.followBus = function (e) {
    var marker = e;

    if (typeof (e.target) !== "undefined") {
        marker = e.target;
    }

    var prop = marker.feature.properties;

    //we *SHOULD* only need to toggle if no routes are selected
    if (tLMap.selectedRoutes.length === 0) {
        tLMap.toggleRoute(prop.r);
    }

    var popup = L.popup(tLMap.popupOptions);
    popup.setContent(tLMap.busPopupContent(prop));

    marker.bindPopup(popup).openPopup();

    if (tLMap.map.getZoom() >= tLMap.options.zoomShowStops) {
        tLMap.map.panTo(marker.getLatLng());
    } else {
        tLMap.map.setView(marker.getLatLng(), tLMap.options.zoomShowStops);
    }

    tLMap.follow = prop.b;
};

tLMap.stopFollow = function () {
    tLMap.map.closePopup();
    tLMap.follow = 0;
};
