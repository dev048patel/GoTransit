//<script type='text/javascript'>
var routeLayer;
var busStops;
var alertStops;
var alertArr = new Array();
var testArr;

//Map functions
function deleteAlert(alert_id, alias, r) {
    var result = confirm("Are you sure you want to delete alert: " + alias + "?");
    if (result == true) {
        var data = { 'alert_id': alert_id, 'action': 'delete_alert' };
        $.ajax({
            type: "GET",
            url: 'classes/ajax/alerts.php',
            data: data,
            error: function (textStatus, xhr, errorThrown, error) { alert("No Data Removed: " + textStatus + " " + errorThrown + " " + error); },
            success: function (data) { }
        }).done(function () {
            getOnChange(r);
        });
    }
}

function editAlert(e) {
    drawNewForm(e, e.route_id, 'edit_alert');
}

function addElementToTable(e) {
    var table = '';
    table += "<tr>";
    table += "<td>" + e['alias'] + "</td>";
    table += "<td>" + e['route_id'] + "</td>";
    table += "<td>" + e['stop_id'] + " @ " + e['stop_time'] + "</td>";
    table += "<td>" + e['repeat_type'] + "</td>";   //Days active
    table += "<td>" + e['warn_time'] + " mins" + "</td>";
    table += "<td>" + e['start_date'] + " to " + e['end_date'] + "</td>";
    (e['active'] == 1) ? imageSource = 'images/email_accept.png' : imageSource = 'images/email_delete.png';
    table += "<td><img src='" + imageSource + "' alt='bus alerts'></td>";        //status
    table += "<td onClick='editAlert(" + JSON.stringify(e) + ")' >Edit</td>";                //edit
    table += "<td onclick='deleteAlert(\"" + e.alert_id + "\", \"" + e.alias + "\", \"" + e.route_id + "\");' >Delete</td>";
    table += "</tr>";
    return table;
}

//displays the current alerts is tabular format
function buildAlertTableForRoute(r) {
    var table = '<table class="alertsTable" style="font-size:12px;"><tbody>';
    var tableHeader = new Array("Alias", "Route", "Stop Time", "Days Active", "Warn Me Time", "Duration", "Status", "Edit", "Delete");

    //Build Header row
    table += '<tr>';
    for (var i = 0; i < tableHeader.length; i++) {
        table += '<th>' + tableHeader[i] + '</th>';
    }
    table += '</tr>';

    $.each(alertArr, function (key, e) {
        table += addElementToTable(e);
    });

    table += '</tbody></table>';
    dynamicInputContent(table);
}

//displays the current alerts is tabular format
function buildAlertTableForStop(id) {
    var table = '<table class="alertsTable" style="font-size:12px;"><tbody>';
    var tableHeader = ["Alias", "Route", "Stop Time", "Days Active", "Warn Me Time", "Duration", "Status", "Edit", "Delete"];

    //Build Header row
    table += '<tr>';
    for (var i = 0; i < tableHeader.length; i++) {
        table += '<th>' + tableHeader[i] + '</th>';
    }
    table += '</tr>';

    $.each(alertArr, function (key, e) {
        if (e.stop_id == id) {
            table += addElementToTable(e);
        }
    });

    table += '</tbody></table>';
    dynamicInputContent(table);

    //onclick for edit and delete cell pass the 'alert_id'
}

function updateRoute(r) {
    if (r > 0) {
        $.ajax({
            type: "GET",
            url: "polylines/route" + r + ".js",
            dataType: "json",
            success: function (data) {
                if (routeLayer) {
                    map.removeLayer(routeLayer);
                }
                routeLayer = new L.geoJson(data, { style: data['style'] }).addTo(map);
                map.fitBounds(routeLayer.getBounds());
            }
        });
    } else {
        if (routeLayer)
            map.removeLayer(routeLayer);
    }
}

function loadSelectTime(time, days, direction, stop_time_id) {
    $('#stop_time').val(time);
    if (days == 'W') {
        days = Array('M', 'T', 'W', 'R', 'F');
    } else {
        days = Array(days);
    }

    var content;
    content = '<p>Time: ' + time + '<\p>';
    content += '<p>Direction: ' + direction + '</p>';
    content += '<p>Alert on which days: <div>';
    content += '<input type="hidden" id="stop_time_id" value="' + stop_time_id + '" />';
    days.forEach(function (element, index, array) {
        var e = spellDays(element);
        content += '<label class="dayCheckBox" ><input type="checkbox" name="days" value="' + element + '" checked>' + e + '</label>';
    });
    content += '</div>';

    dynamicClosestTime(content);
}

function addTimeTableElement(e) {
    var time = e.time;
    var direction = e.direction;
    var days = e.days;
    if (days == 'W') {
        var daysDisplay = 'Weekdays';
    } else if (days == 'S') {
        var daysDisplay = 'Saturday';
    } else if (days == 'U') {
        var daysDisplay = 'Sunday';
    }

    var stop_time_id = e.stop_time_id;
    var id = days.join('') + time;
    console.log(time + " " + days + " " + direction);
    var timeContent = '<tr><td>';
    timeContent += '<label for="' + id + '"><input type="radio" name="time" id="' + id + '" onClick="loadSelectTime(\'' + time + '\', \'' + days + '\', \'' + direction + '\', \'' + stop_time_id + '\');"></label></td>';
    timeContent += '<td><label for="' + id + '">' + e.time + '</label></td>';
    timeContent += '<td><label for="' + id + '">' + daysDisplay + '</label></td>';
    timeContent += '<td><label for="' + id + '">' + e.direction + '</label><input id="' + id + 'direction' + '"type="hidden" value="' + direction + '" /></td>';
    timeContent += '</tr>';
    return timeContent;
}


function editSelectTime(time, days, repeat_type, direction, stop_time_id) {
    $('#stop_time').val(time);

    var content;
    content = '<p>Time: ' + time + '<\p>';
    content += '<p>Direction: ' + direction + '</p>';
    content += '<p>Alert on which days: <div>';
    content += '<input type="hidden" id="stop_time_id" value="' + stop_time_id + '" />';
    if (days == 'W') {
        days = Array('M', 'T', 'W', 'R', 'F');
    } else {
        days = Array(days);
    }
    days.forEach(function (element, index, array) {
        if (repeat_type.indexOf(element) == -1) {
            var e = spellDays(element);
            content += '<label class="dayCheckBox"><input type="checkbox" name="days" value="' + element + '">' + e + '</label>';
        } else {
            var e = spellDays(element);
            content += '<label class="dayCheckBox"><input type="checkbox" name="days" value="' + element + '" checked>' + e + '</label>';
        }
    });
    content += '</div>';

    dynamicClosestTime(content);

}

function spellDays(element) {
    switch (element) {
        case 'U':
            element = 'Sunday';
            break;
        case 'S':
            element = 'Saturday';
            break;
        case 'M':
            element = 'Monday';
            break;
        case 'T':
            element = 'Tuesday';
            break;
        case 'W':
            element = 'Wednesday';
            break;
        case 'R':
            element = 'Thursday';
            break;
        case 'F':
            element = 'Friday';
            break;
    }
    return element;
}

function editClosestStopTimes(r, arr) {
    var weekdays = /[M|T|W|R|F]+/;
    var saturday = /[S]/;
    var sunday = /[U]/;
    if (arr.stop_time.length == 5) {
        arr.stop_time = arr.stop_time + ':00';
    }
    if (weekdays.test(arr.repeat_type)) {
        var id = 'W' + arr.stop_time;
    } else if (saturday.test(arr.repeat_type)) {
        var id = 'S' + arr.stop_time;
    } else if (sunday.test(arr.repeat_type)) {
        var id = 'U' + arr.stop_time;
    }

    var data = { 'action': 'getTimeStops', 'route_id': arr.route_id, 'stop_id': arr.stop_id, 'stop_time': arr.stop_time };
    $.ajax({
        type: "GET",
        url: '../ajax/alertschris.php',
        data: data,
        error: function (textStatus, xhr, errorThrown, error) { alert("Can't retieve closest times: " + textStatus.responceText + " " + errorThrown + " " + error); },
        success: function (data) {

            var obj = jQuery.parseJSON(data);
            if (!obj)
                obj = data;

            $.each(obj, function (key, e) {
                if (id == (e.days.join('') + e.time)) {
                    editSelectTime(e.time, e.days, arr.repeat_type, e.direction, e.stop_time_id);
                }
            });
        }
    });
}

function getClosestStopTimes(r, stop_id) {

    var stop_time = $('#stop_time').val();

    //check for valid input
    var timeFormat = /([01]?[0-9]|2[0-3]):[0-5]?[0-9](:[0-5]?[0-9])?$/;
    if (!timeFormat.test(stop_time)) {
        var content = '<p>Oops!  The time you have entered is incorrect.  Please try again using 24 hour format. ex 14:30</p>';
        dynamicClosestTime(content);
        return false;
    }

    var data = { 'action': 'getTimeStops', 'route_id': r, 'stop_id': stop_id, 'stop_time': stop_time };
    $.ajax({
        type: "GET",
        url: '../ajax/alerts.php',
        data: data,
        accept: 'json',
        error: function (textStatus, xhr, errorThrown, error) { alert("Can't retieve closest times: " + textStatus.responseText + " " + errorThrown + " " + error); },
        success: function (data) {
            console.log(data);
            var obj = jQuery.parseJSON(data);
            if (!obj)
                obj = data;

            var timeContent;

            if (obj.length == 0) {
                timeContent = '<p>There are no stops near that time</p>';
            } else {
                var d = new Date().getDay();
                switch (d) {
                    case 0:
                        d = 'U';
                        break;
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                        d = 'W';
                        break;
                    case 6:
                        d = 'S';
                }
                var matchingStop = null;
                var timeContent = '<br /><table class="alert_form"><tr> <th>Select</th> <th>time</th> <th>Days</th> <th>Direction</th> </tr>';
                $.each(obj, function (key, e) {
                    //check to see if submited time matches on of the options exactly
                    if (e.time == stop_time && e.days == d) {
                        matchingStop = e;
                    }
                    timeContent += addTimeTableElement(e);
                });
                timeContent += '</table>';
            }

            dynamicClosestTime(timeContent);
            //loads exact match if one was found
            if (matchingStop) {
                loadSelectTime(matchingStop.time, matchingStop.days, matchingStop.direction, matchingStop.stop_time_id);
            }
        }
    });
}

function validateFormData() {

    if (!(alias = $('#alias').val())) {
        alert("No Alias Provided");
        return false;
    }

    if (!(start_date = $('#start_date').val()) || start_date == 'Click to select Date') {
        alert("No start Date Provided");
        return false;
    }

    if (!(end_date = $('#end_date').val()) || end_date == 'Click to select Date') {
        alert("No End Date Provided");
        return false;
    }

    if (start_date > end_date) {
        alert("Ensure your end_date is set to after your start date");
        return false;
    }

    warn_time = $('#warn_time').val();
    if (warn_time == "") {
        alert("Please enter an number for the number of minutes before warning");
        return false;
    }

    var days = new Array();
    $("input:checkbox[name=days]:checked").each(function () {
        days.push($(this).val());
    });

    if (days.length == 0) {
        alert("Please select at least one day for the alert to be active");
        return false;
    }

    if ($('#active').is(':checked')) {
        var active = 1;
    } else {
        var active = 0;
    }

    var stop_time_id = $('#stop_time_id').val();

    //  var formData = new Array(alias, start_date, end_date, warn_time, [days], r, stop);
    var formData = {
        alias: alias,
        start_date: start_date,
        end_date: end_date,
        warn_time: warn_time,
        days: days,
        active: active,
        stop_time_id: stop_time_id
    };

    return formData;
}

function drawNewForm(arr, r, action, popup) {
    var titleDiv = document.getElementById('popupHeader');
    var titleBar = titleDiv.outerHTML;
    var originalContent = popup._content;

    if (action == 'add_alert') {
        arr.alias = '';
        arr.start_date = 'Click to select Date';
        arr.end_date = 'Click to select Date';
        arr.warn_time = 0;
        enabled = 'checked';
        if (arr.stop_time == null) {
            var userTime = new Date();
            var hr = userTime.getHours();
            var min = userTime.getMinutes();
            if (min < 10) { min = '0' + min; }
            arr.stop_time = hr + ':' + min;
        }
        var closestTimeFunction = getClosestStopTimes;
        var param = arr.stop_id;
        var enabled = 'checked';
    } else {
        var closestTimeFunction = editClosestStopTimes;
        var param = arr;
        (arr['active'] == 1) ? enabled = 'checked' : enabled = '';
    }

    var content = '<b>Creating alert for stop: ' + arr['stop_id'] + '</b>';
    content += '<div id="popupContent">';
    content += 'Alias:<input type="text" id="alias" value="' + arr.alias + '"/><br />';
    content += 'Enabled:<input type="checkbox" id="active" value=1 ' + enabled + ' ><br />';
    content += 'Start Date:<input type="text" id="start_date" width="20" value="' + arr.start_date + '" /><br />';
    content += 'End Date:<input type="text" id="end_date" width="20" value="' + arr.end_date + '" /><br />';
    content += '<input type="text" id="stop_time" width="10" value="' + arr.stop_time + '"/>';
    content += '<input type="button" onClick="getClosestStopTimes(' + r + ', \'' + arr.stop_id + '\')" value="Change Time" />';
    content += '<div id="close_times"></div>';
    content += 'Minutes Before Warning:<input type="number" id="warn_time" value="' + arr.warn_time + '" min="1" max="40" /><br />';
    content += '<input type="button" id="btnSubmitAlert" value="Submit" /><input type="button" id="btnCancelAlert" value="Cancel" />';
    content += '</div>';

    //write form to the page
    popup.setContent(titleBar + content);
    closestTimeFunction(r, param, popup);
    popup.setContent(popup._content);

    var scroll = $('#popupContent').niceScroll({ cursorcolor: '#045c97', zindex: 9999 });
    //ensures the scroll bars follow the popup window

    map.on('move', function () {
        scroll.resize();
    });

    $('#btnCancelAlert').on('click', function () {
        console.log('canceling');
        popup.setContent(originalContent);
        getTimes({ 'stop': $('.leaflet-popup-stoptimes').attr('stop'), 'skip': skip });
        //	  getTimes({stop:arr.stop_id});
    });

    //Bind event handler to the form
    $('#btnSubmitAlert').on('click', function () {
        console.log('submit');
        var isValid = validateFormData();
        if (isValid) {
            var data = {
                'action': action,
                'alias': isValid.alias,
                'start': isValid.start_date,
                'end': isValid.end_date,
                'warntime': isValid.warn_time,
                'stop_day': isValid.days,
                'stid': isValid.stop_time_id,
                'alertid': arr.alert_id,
                'enabled': isValid.active
            };

            $.ajax({
                type: "POST",
                url: '../ajax/alertschris.php',
                data: data,
                error: function (textStatus, xhr, errorThrown) { console.log("Error adding alert: " + errorThrown + " " + textStatus.responseText); },
                success: function (data) {
                    console.log(data);
                    popup.setContent(originalContent + '<div id="successMessage"></div>');
                    getTimes({ stop: arr.stop_id });
                    if (action == 'add_alert') {
                        $('#successMessage').html('<p>Alert successfully added</p>');
                    } else {
                        $('#successMessage').html('<p>Alert successfully updated</p>');
                    }

                }
            });
        }
        return false;
    });

    //initialize calendar widget

    $("#end_date").datepicker({ dateFormat: "yy-mm-dd" });
    $("#start_date").datepicker({ dateFormat: "yy-mm-dd" });


    $("#ui-datepicker-div").on('mouseleave', function () {
        console.log('mouse off');
        $("#start_date").datepicker("hide");
        $("#end_date").datepicker("hide");
    });

    $("#start_date").click(function () {
        $("#start_date").datepicker("show");
    });
    $("#end_date").on("click", function () {
        $("#end_date").datepicker("show");
    });
}

function loadStops(r) {
    var data = { 'route': r, 'action': 'bus_stops' };
    $.ajax({
        type: "GET",
        url: 'classes/ajax/alerts.php',
        data: data,
        error: function (textStatus, errorThrown, jqXHR) { alert("Stops not loaded: " + jqXHR + " " + textStatus + " " + errorThrown); },
        success: function (data) {
            var markers = [];                     //Used to store all bus stops before adding to a layer
            if (busStops)                         //clear the layer if stops exits
                busStops.clearLayers();

            var obj = jQuery.parseJSON(data);
            if (!obj)
                obj = data;

            $.each(obj, function (key, arr) {
                var icon = createIcon(arr['intersection'], "black");
                var latlng = [arr['latitude'], arr['longitude']];
                var stop_marker = L.marker(latlng, { 'icon': icon });
                stop_marker.bindPopup('<div class="rounded" id="controle_container"><div id="dynamicForm" ></div><div id="dynamicTable" style="text-align:center;padding-bottom:10px;"></div>', { minWidth: 500 });
                if (jQuery.inArray(stop_marker, markers) < 0) {
                    stop_marker.on('click', function (e) {
                        drawNewForm(arr, r, 'add_alert');
                        var lat = parseFloat(arr['latitude']) + 0.03;
                        latlng = [lat, arr['longitude']];
                        map.panTo(latlng);
                    });
                    markers.push(stop_marker);
                }
            });
            busStops = L.layerGroup(markers).addTo(map);
        }
    });
}


function loadAlertStops(r) {
    var data = { 'route': r, 'action': 'alert_stops' };

    $.ajax({
        type: "GET",
        url: 'classes/ajax/alerts.php',
        data: data,
        error: function (textStatus, errorThrown, jqXHR) { alert("alert stops not loaded: " + jqXHR + " " + textStatus + " " + errorThrown); },
        success: function (data) {

            var markers = [];                     //Used to store all bus stops before adding to a layer
            if (alertStops) {                         //clear the layer if stops exits
                alertStops.clearLayers();
            }

            var obj = jQuery.parseJSON(data);
            if (!obj)
                obj = data;

            $.each(obj, function (key, arr) {
                alertArr.push(arr);
                if (arr['active'] == 1) {
                    var icon = createIcon(arr['intersection'], "green");
                    var zOffset = 200;
                } else {
                    var icon = createIcon(arr['intersection'], "yellow");
                    var zOffset = 199;
                }
                var latlng = [arr['latitude'], arr['longitude']];
                var stop_marker = L.marker(latlng, { 'icon': icon, 'zIndexOffset': zOffset });
                stop_marker.bindPopup('<div class="rounded" id="controle_container"><div id="dynamicForm" ></div><div id="dynamicTable" style="text-align:center;padding-bottom:10px;"></div>', { minWidth: 500 });
                if (jQuery.inArray(stop_marker, markers) < 0) {
                    stop_marker.on('click', function (e) {
                        buildAlertTableForStop(arr.stop_id);
                        var lat = parseFloat(arr['latitude']) + 0.03;
                        latlng = [lat, arr['longitude']];
                        map.panTo(latlng);
                    });
                    markers.push(stop_marker);
                }
            });
            alertStops = L.layerGroup(markers).addTo(map);
        }
    }).done(function () {
        if (alertArr.length == 0) {
            dynamicInputContent("<p>There are no alerts set for this route.<p>");
        } else {
            buildAlertTableForRoute(r);
        }
    });
}

function createIcon(name, iconType) {
    var dir = name.substr(name.length - 3, 2);
    var anchor;

    switch (dir) {
        case 'NB': anchor = [-10, 0]; break;
        case 'SB': anchor = [25, 0]; break;
        case 'EB': anchor = [0, 0]; break;
        case 'WB': anchor = [10, 25]; break;
        default: anchor = [0, 0];
    }

    var imageLocation;
    if (iconType == "black") {
        imageLocation = "images/bus_stop_marker.png";
    } else if (iconType == "green") {
        imageLocation = "images/bus_stop_marker_g.png";
    } else if (iconType == "yellow") {
        imageLocation = "images/bus_stop_marker_y.png";
    }

    var stopIcon = L.icon({
        iconUrl: imageLocation,
        iconSize: [24, 28], // size of the icon
        iconAnchor: anchor, // point of the icon which will correspond to marker's location
        popupAnchor: [-5, -5] // point from which the popup should open relative to the iconAnchor
    });
    return stopIcon;
}

function dynamicFormContent(content) {
    $('#dynamicForm').html(content);
}

function dynamicInputContent(content) {
    $('#dynamicTable').html(content);
}

function dynamicClosestTime(content) {
    $('#close_times').html(content);
}
