
var startIcon = L.icon({
    iconUrl: IMAGE_ROOT + '/marker-icon-start.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
var endIcon = L.icon({
    iconUrl: IMAGE_ROOT + '/marker-icon-end.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

var holdStops = {};
var holdBuses = {};

tLMap.tripLayer = new L.LayerGroup();         //layer for everything else to be cleared between submits
tLMap.locationLayer = new L.LayerGroup();

tLMap.startLoc = new L.marker([0, 0], { draggable: 'true' }).setIcon(startIcon)  //Start Marker 
tLMap.endLoc = new L.marker([0, 0], { draggable: 'true' }).setIcon(endIcon)      //End Marker
//tLMap.locationLayer.addLayer(tLMap.startLoc);
//tLMap.locationLayer.addLayer(tLMap.endLoc);

tLMap.showTripDialog = function () {
    var dia = $.dialog({
        title: 'Drag Markers OR Enter Info to Set Markers',
        showImage: false,
        id: "tripDialog",
        position: { left: 5, top: $("#menuDiv").offset().top },

        content: showTripDialogContent(),
        buttons: [{ value: "Plan Your Trip" }, { value: "Reset" }],
        onResize: tLMap.resizeTripDialog,
        //beforeShow: function() {
        beforeShow: function () {
            //tLMap.setStartEnd();

            //Copy stops before we remove them
            holdStops = $.extend(true, {}, tLMap.stops);
            tLMap.clearBusTimers();
            $.each(tLMap.stops, function (s, marker) {
                tLMap.map.removeLayer(marker);
            });
            $.each(tLMap.buses, function (s, marker) {
                tLMap.map.removeLayer(marker);
            });
            tLMap.stops = {};
            tLMap.buses = {};
        },
        onDestroy: function () {
            tLMap.clearTrip();
            tLMap.locationLayer.clearLayers();
            tLMap.map.removeLayer(tLMap.tripLayer);
            tLMap.map.removeLayer(tLMap.locationLayer);
            dia = null;
            tLMap.stops = holdStops;
            tLMap.loadBuses();
        },
        success: function (state) {
            if (state == "Plan Your Trip") {
                tLMap.curTripId = 0;
                tLMap.submitTrip();
            } else if (state == "Reset") {
                tLMap.clearTrip();
                tLMap.setStartEnd();
                //$('#FromMarker').show();
            }
        }
    });
};


tLMap.menuItems.push({ id: "dm_trip", title: "Plan a Trip", callback: tLMap.showTripDialog });

var showTripDialogContent = function () {

    tLMap.locationLayer.addLayer(tLMap.startLoc);
    tLMap.locationLayer.addLayer(tLMap.endLoc);
    tLMap.setStartEnd();

    var content = "";

    content += "<style>";
    content += ".typeahead,";
    content += ".tt-query,";
    content += ".tt-hint {";
    content += "  width: 396px;";
    content += "  height: 30px;";
    content += "  padding: 8px 12px;";
    content += "  font-size: 24px;";
    content += "  line-height: 30px;";
    content += "  border: 2px solid #ccc;";
    content += "  -webkit-border-radius: 8px;";
    content += "     -moz-border-radius: 8px;";
    content += "          border-radius: 8px;";
    content += "  outline: none;";
    content += "}";

    content += ".typeahead {";
    content += "  background-color: #fff;";
    content += "}";

    content += ".typeahead:focus {";
    content += "  border: 2px solid #0097cf;";
    content += "}";

    content += ".tt-query {";
    content += "  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);";
    content += "     -moz-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);";
    content += "          box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);";
    content += "}";

    content += ".tt-hint {";
    content += "  color: #999";
    content += "}";

    content += ".tt-dropdown-menu {";
    content += "  width: 422px;";
    content += "  margin-top: 12px;";
    content += "  padding: 8px 0;";
    content += "  background-color: #fff;";
    content += "  border: 1px solid #ccc;";
    content += "  border: 1px solid rgba(0, 0, 0, 0.2);";
    content += "  -webkit-border-radius: 8px;";
    content += "     -moz-border-radius: 8px;";
    content += "          border-radius: 8px;";
    content += "  -webkit-box-shadow: 0 5px 10px rgba(0,0,0,.2);";
    content += "     -moz-box-shadow: 0 5px 10px rgba(0,0,0,.2);";
    content += "          box-shadow: 0 5px 10px rgba(0,0,0,.2);";
    content += "}";

    content += ".tt-suggestion {";
    content += "  padding: 1px 5px;";
    content += "  font-size: 12px;";
    content += "  line-height: 16px;";
    content += "}";

    content += ".tt-suggestion.tt-cursor {";
    content += "  color: #fff;";
    content += "  background-color: #0097cf;";

    content += "}";

    content += ".tt-suggestion p {";
    content += "  margin: 0;";
    content += "}";
    content += "tt-highlight{";
    content += "    color:red;";
    content += "}";
    content += "</style>";


    content += "<div id='uberdiv'>"
    content += "<div id='inputimg' style='display:inline-block;vertical-align:middle;'><img src='images/marker-icon-start.png' alt='Start' width='11' height='18'></div>";
    content += "<div id='inputtext' style='width:200px;margin-left:10px;display:inline-block;'><form>";
    content += "<input id='SFrom' class='form-control' autocomplete='off' size='39' type='text' placeholder='Starting From'></input>";
    content += "</form></div>";

    content += "<div id='whitespace' style='width:200px;margin-left:10px;'><br><br><br><br><br></div>";

    content += "<div id='inputendimg' style='display:inline-block;vertical-align:middle;'><img src='images/marker-icon-end.png' alt='Start' width='11' height='18'></div>";

    content += "<div id='inputtextend' style='width:200px;margin-left:10px;display:inline-block;'><form>";
    content += "<input id='EndAt' class='form-control' autocomplete='off' size='39' type='text' placeholder='Ending At'></input>";
    content += "</form></div>     </div>";

    //    content += "<div id='pathSelect' style='width:290px;margin-left:10px;'></div></div>"
    content += "<script>  $('#whitespace').html('');";

    content += "var engineFrom = new PhotonAddressEngine({";
    content += "url: 'https://transitlive.com:5000',";
    content += "lang: 'en',";
    content += "lat: 50.4550,";
    content += "lon: -104.6306,";
    content += "limit: 30";
    content += "});";
    content += "$('#SFrom').typeahead({";
    content += "hint: false,";
    content += "highlight: false,";
    content += "minLength: 3";
    content += "}, {";
    content += "  source: engineFrom.ttAdapter(),";
    content += "displayKey: 'description'";
    content += "});";
    content += "engineFrom.bindDefaultTypeaheadEvent($('#SFrom'));";
    content += "$(engineFrom).bind('addresspicker:selected', tLMap.updateStartTrip);";
    content += "$(engineFrom).bind('addresspicker:predictions', tLMap.updateWhitespace);";

    var therestofit = "var engineTo = new PhotonAddressEngine({ url: 'https://transitlive.com:5000', lang: 'en', lat: 50.4550, lon: -104.6306,limit: 30}); $('#EndAt').typeahead({ hint: false, highlight: false, minLength: 3 }, { source: engineTo.ttAdapter(), displayKey: 'description' }); engineTo.bindDefaultTypeaheadEvent($('#EndAt')); $(engineTo).bind('addresspicker:selected', tLMap.updateEndTrip); $(engineTo).bind('addresspicker:predictions', tLMap.updateWhitespaceEnd); </script><div id='whitespaceEnd' style='width:200px;margin-left:10px;'><br><br><br><br><br></div><script>  $('#whitespaceEnd').html(''); </script>";

    content += therestofit;

    return content;
}

tLMap.resizeTripDialog = function () {
    var newHeight = $(document).height() - $("#menuDiv").offset().top - 150;

    $('#msg-box-ctn-tripDialog').dialog(
        "resize", "auto"
    );//.height(newHeight); 
};


tLMap.setStartEnd = function () {
    center = tLMap.map.getCenter();
    tLMap.map.addLayer(tLMap.tripLayer);
    tLMap.map.addLayer(tLMap.locationLayer);

    //provide a static offset for the end location so the start/end markers are not on top of eachother
    tLMap.startLoc.setLatLng([center.lat, center.lng])
    tLMap.endLoc.setLatLng([center.lat, center.lng + 0.004])
};

//submit event handler for finding a trip
tLMap.submitTrip = function () {

    startPos = tLMap.startLoc.getLatLng();
    endPos = tLMap.endLoc.getLatLng();

    //    var parameters = "?saddr="+startPos.lat+","+startPos.lng+"&daddr="+endPos.lat+","+endPos.lng+"&dirflg=transit";
    var parameters = "/dir/?api=1&origin=" + startPos.lat + "," + startPos.lng + "&destination=" + endPos.lat + "," + endPos.lng + "&travelmode=transit";

    var iThingParameters = "?saddr=" + startPos.lat + "," + startPos.lng + "&daddr=" + endPos.lat + "," + endPos.lng + "&dirflg=r";

    tLMap.getTrip(parameters, iThingParameters);
};

tLMap.clearTrip = function () {
    tLMap.tripLayer.clearLayers();
    //    tLMap.curTripId = 0;
    //    $('#directions').html('');
    //    $('#pathSelect').html('');
    $('#EndAt').val('');
    $('#SFrom').val('');
    $('#SFrom').removeAttr("disabled", "disabled");
    $('#EndAt').removeAttr("disabled", "disabled");
    $('#inputtext').html('');
    $('#inputtextend').html('');
    $('#inputimg').html('');
    $('#inputendimg').html('');
    $('#whitespace').html('');
    $('#whitespaceEnd').html('');
    $('#uberdiv').html('');
    $('#uberdiv').append(showTripDialogContent());
    //showTripDialogContent();
};


tLMap.updateWhitespace = function (event, predictions) {
    $('#whitespace').html('<br><br><br><br><br>');
}


tLMap.updateWhitespaceEnd = function (event, predictions) {
    $('#whitespaceEnd').html('<br><br><br><br><br>');
}


tLMap.updateStartTrip = function (event, selected) {

    if (document.getElementById("SFrom").value) {

        $('#SFrom').val(selected.description);

        tLMap.startLoc.setLatLng({ lon: selected.geometry.coordinates[0], lat: selected.geometry.coordinates[1] });

        $('#SFrom').attr("disabled", "disabled");

        $('#whitespace').html('');
    }

    // }else{
    //if (!document.getElementById("SFrom").value){
    //	$('#SFrom').attr("placeholder", "Starting from Marker");
    //	$('#whitespace').html('');
    //	$('#SFrom').val('');
    //    }

};


tLMap.updateEndTrip = function (event, selected) {

    if (document.getElementById("EndAt").value) {

        $('#EndAt').val(selected.description);

        tLMap.endLoc.setLatLng({ lon: selected.geometry.coordinates[0], lat: selected.geometry.coordinates[1] });

        $('#EndAt').attr("disabled", "disabled");

        $('#whitespaceEnd').html('');
    }



};


tLMap.validateForm = function () {
    return true;
};

tLMap.getTrip = function (parameters, iThingParameters) {

    //    window.location = "http://www.google.com/maps"+parameters

    //    window.open("http://www.google.com/maps"+parameters);


    if (isIOS()) {
        // Open Apple Maps for iOS
        window.location.href = `http://maps.apple.com/` + iThingParameters;
    } else {
        // Open Google Maps for non-iOS

        window.open("https://www.google.com/maps" + parameters);
    }

};

function updateLocations(ele) {
    var center = tLMap.map.getCenter();
    var data = {
        q: ele.value,
        lon: center.lng.toPrecision(7),
        lat: center.lat.toPrecision(6)
    };

}

// Function to detect if the current device is iOS
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}
