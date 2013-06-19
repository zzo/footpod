var formdata = new FormData();
var loading = $("#loading");
loading.hide();

$('input[type=file]').on('change', function(event) {
    loading.fadeIn('slow');
    formdata.append("tcx", this.files[0]);
    $.ajax({  
        url: "/uploadTCX",  
        type: "POST",  
        data: formdata,  
        processData: false,  
        contentType: false,  
        success: function (res) {  
            loading.fadeOut('slow');
            updateTree(JSON.parse(res));
        },
        error: function(res) {
            loading.fadeOut('slow');
            console.log(res);
        }
    });  
});

function round(x, n) {
    return n ? Math.round(x * (n = Math.pow(10, n))) / n : Math.round(x);
}

function showGraph(obj) {
    $("#chartdiv").html('');
    $.jqplot('chartdiv', [ obj.data  ], {
        title: obj.title
        , axes: {
            xaxis: {
                label: obj.x
                , pad: 0
            }
            , yaxis: {
                label: 'Adjustment'
            }
        }
        , series: [
            {
                lineWidth: 1
                , markerOptions: { show: false }
            }
        ]
    });
}

function updateTree(data) {
    var treeData = [{
        data: 'Adjustment: ' + round(data.adjustment, 3) + ', Distance ' + round(data.totalDistance, 1) + ' mile(s)'
        , children: []
    }]
    ;

    $("#whattodo").html('Multiply your current calibration factor by ' + round(data.adjustment, 3));

    //console.log(data);
    data.lapscale.forEach(function(lapscale, index) {
        treeData[0].children.push({
            data: 'Lap ' 
                + (index + 1) 
                + ' - Adjustment ' 
                + round(lapscale, 3 ) 
                + ', Distance ' 
                + round(data.lapDistance[index], 1)
            , metadata: { lap: index }
        });
    });
   
    $('#tree').jstree({
        json_data: {
            data: treeData
        }
        , plugins: [ 'json_data', 'themes', 'ui' ]

    }).bind("select_node.jstree", function (e, treeD) {
        var lap = treeD.rslt.obj.data("lap");
        if (typeof lap === 'undefined') {
            // selected total
            showGraph({ data: data.lapscale, title: 'Adjustment By Lap', x: 'Lap' }); 
        } else {
            var firstIndex = data.lapdata.lapindex[lap]
                , lastIndex = data.lapdata.lapindex[lap + 1]
            ;

            if (!lastIndex) {
                lastIndex = data.lapdata.scale.length;
            }

            showGraph({ 
                data: data.lapdata.scale.slice(firstIndex, lastIndex)
                , title: 'Adjustment By Lap ' + (lap + 1)
                , x: 'Seconds'
            }); 
        }   
    });

    showGraph({ data: data.lapscale, title: 'Adjustment By Lap', x: 'Lap' }); 

    var myLatLng = new google.maps.LatLng(data.lapdata.gps[0][0], data.lapdata.gps[0][1]);
    var mapOptions = {
        zoom: 16,
        center: myLatLng,
        mapTypeId: google.maps.MapTypeId.TERRAIN
    };
    var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    var runC = [];

    data.lapdata.lapindex.forEach(function(index, which) {
        var pos = data.lapdata.gps[index];
        if (pos) {
            new google.maps.Marker({
                position: new google.maps.LatLng(pos[0], pos[1]),
                map: map,
                title:"Lap " + (which + 1)
            })
        }
    });

    data.lapdata.gps.forEach(function(point) {
        runC.push(new google.maps.LatLng(point[0], point[1]));
    });

    var runPath = new google.maps.Polyline({
      path: runC,
      strokeColor: "#FF0000",
      strokeOpacity: 1.0,
      strokeWeight: 2
    });

    runPath.setMap(map);

    var panoramaOptions = {
            position: myLatLng
            , pov: {
                heading: 34,
                pitch: 10
            }
        }
        , panorama = new google.maps.StreetViewPanorama(document.getElementById("pano"), panoramaOptions)
    ;
    map.setStreetView(panorama);

    google.maps.event.addListener(map, 'click', function(event) {
        panorama.setPosition(event.latLng);
    });

    /*
    $("#currentcal").blur(function(event) {
        if (data) {
            $("#currentcal").html(round($("#currentcal").html() * data.adjustment));
        }
    });
    */
}
