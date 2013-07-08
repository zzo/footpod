var formdata = new FormData();
var loading = $("#loading");
loading.hide();

function sum(arr) {
  var s = 0;
  arr.forEach(function(val) {
    s += val;
  });
  return s;
}

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
            var obj = JSON.parse(res);
            if (obj.error) {
              alert(obj.error);
            } else {
              updateTree(obj);
            }
        },
        error: function(res) {
            loading.fadeOut('slow');
            alert("Server Error - You Sunk My Battleship!");
        }
    });  
});

function round(x, n) {
    return n ? Math.round(x * (n = Math.pow(10, n))) / n : Math.round(x);
}

function distGraph(obj) {
    $("#distdiv").html('');
    $.jqplot('distdiv', obj.data, {
        title: obj.title
        , axes: {
            xaxis: {
                label: obj.x
                , pad: 0
            }
            , yaxis: {
                label: 'Distance'
            }
        }
        , series: [
            {
                lineWidth: 1
                , markerOptions: { show: false }
            }
            , {
                lineWidth: 1
                , markerOptions: { show: false }
            }
        ]
      , cursor:{ 
        show: true,
        zoom:true, 
        showTooltip:true
      } 
      , legend:{
            show:true
            , labels: ['GPS', 'Foot Pod' ]
            , rendererOptions:{ numberRows: 2, placement: "outside"}
            , location: 'e'
        }
    });
}

function adjGraph(obj, data) {
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
      , cursor:{ 
        show: true,
        zoom:true, 
        showTooltip:true
      } 
      , canvasOverlay: {
            show: true
            , objects: [
                {
                    horizontalLine: {
                        y: data.adjustment + data.stdev
                        , lineWidth: 3
                        , xOffset: 0
                        , color: 'rgb(255, 0, 0)'
                    }
                    , horizontalLine: {
                        y: data.adjustment - data.stdev
                        , lineWidth: 3
                        , xOffset: 0
                        , color: 'rgb(0, 255, 0)'
                    }
                    , horizontalLine: {
                        y: data.adjustment
                        , lineWidth: 3
                        , xOffset: 0
                        , color: 'rgb(0, 0, 255)'
                    }
                }
            ]
      }
    });
}

function updateTree(data) {
    var treeData = [{
        data: 'Adjustment: ' + round(data.adjustment, 3) + ', Distance ' + round(data.totalDistance, 1) + ' mile(s)'
        , children: []
        , state: 'open'
    }]
    ;

            var totalgps = round(sum(data.lapdata.gpsdistance), 2);
            var totalpod = round(sum(data.lapdata.footpoddistance), 2);
            var totalratio = round(totalgps / totalpod, 2);

    $("#whattodo").html('Multiply your current calibration factor by ' + round(data.adjustment, 3));
    $("#ratio").html("GPS to FootPod Ratio: " + totalgps + ' / ' + totalpod + ' = '  + totalratio);

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
   
    var tree = $('#tree').jstree({
        json_data: {
            data: treeData
        }
        , plugins: [ 'json_data', 'themes', 'ui' ]
    }).bind("select_node.jstree", function (e, treeD) {
        var lap = treeD.rslt.obj.data("lap");
        if (typeof lap === 'undefined') {
            // selected total
            adjGraph({ data: data.lapscale, title: 'Adjustment By Lap', x: 'Lap' }, data); 
            distGraph({ data: [ data.lapdata.gpsdistance, data.lapdata.footpoddistance ], title: 'GPS & Footpod Distance', x: 'Time' }); 
        } else {
            var firstIndex = data.lapdata.lapindex[lap]
                , lastIndex = data.lapdata.lapindex[lap + 1]
            ;

            if (!lastIndex) {
                lastIndex = data.lapdata.scale.length;
            }

            adjGraph({ 
                data: data.lapdata.scale.slice(firstIndex, lastIndex)
                , title: 'Adjustment By Lap ' + (lap + 1)
                , x: 'Seconds'
            }, data); 
            
            distGraph({ 
                data: [ data.lapdata.gpsdistance.slice(firstIndex, lastIndex),
                            data.lapdata.footpoddistance.slice(firstIndex, lastIndex),
                        ]
                , title: 'Distance By Lap ' + (lap + 1)
                , x: 'Seconds'
            }); 
        }   
    });

    adjGraph({ data: data.lapscale, title: 'Adjustment By Lap', x: 'Lap' }, data); 
    distGraph({ data: [ data.lapdata.gpsdistance, data.lapdata.footpoddistance ], title: 'GPS & Footpod Distance', x: 'Time' }); 

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
