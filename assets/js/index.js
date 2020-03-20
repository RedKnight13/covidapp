//( function ( $, L ) {
	var map, heat,draw=false, toggleEdit = false, latlngs1, latlngs2, tempLatLng=[], arrayLatLng = [],
		heatOptions = {
			tileOpacity: 1,
			heatOpacity: 1,
			radius: 20,
			blur: 15
		};

	toastr.options = {
		timeOut: 0,
		extendedTimeOut: 0,
		allowHtml: true,
		tapToDismiss: false
	};


	function clearMap(){
		for(i in map._layers) {
			if(map._layers[i].valueOf() != undefined) {
				try {
					map.removeLayer(map._layers[i]);
				}
				catch(e) {
					console.log("problem with " + e + map._layers[i]);
				}
			}
		}
	}

	function reloadMap(){
		/*clearMap();
		L.tileLayer( 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: 'Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors.',
			maxZoom: 18,
			minZoom: 2
		} ).addTo( map );
		*/if(heat != null)
			map.removeLayer(heat);
		if(latlngs2.length==0 && arrayLatLng.length==0 && tempLatLng.length==0)
			return;

		heat = L.heatLayer( [], heatOptions ).addTo( map );
		latlngs2.forEach(function(keyval3){heat._latlngs.push(keyval3);});
		heat.redraw();
		if(arrayLatLng.length!=0){
			arrayLatLng.forEach(function(keyval){ keyval.forEach(function(keyval2){heat._latlngs.push(keyval2);})});		
			heat.redraw();
		}
		if(tempLatLng.length!=0){
			tempLatLng.forEach(function(keyval1){heat._latlngs.push(keyval1);});
			heat.redraw();
		}

	}

	function undoRecord(){
		if(arrayLatLng.length!=0){
			if(tempLatLng.length==0)
				arrayLatLng.pop();
			else
				tempLatLng=[]
		}else if(tempLatLng.length!=0)
			tempLatLng=[]

		reloadMap();
	}
	
	function delayed1(){
			map.on("click",function(event2){
				if(toggleEdit){
					map.off(event2);
					toggleEdit = false;
					$(".pauseRecord").addClass("hidden");
					$(".unpauseRecord").removeClass("hidden");
				}
			});
	}

	function unPause(){
		if(tempLatLng.length)
			arrayLatLng.push(tempLatLng);
		tempLatLng=[]
		$(".pauseRecord").removeClass("hidden");
		$(this).addClass("hidden");
		map.on("click", function(event1){
			if(!toggleEdit)
			{
				map.off(event1);
				toggleEdit = true;
				draw = true;
				setTimeout(delayed1(), 12000);
			}
		});
	}

	
	stageOne();

	map.on({
		movestart: function () { if (toggleEdit) draw = false;},
		moveend:   function () { if (toggleEdit) draw = true;},
		mousemove: function (e) {
			if (draw && toggleEdit) {
				heat.addLatLng(e.latlng);
				tempLatLng.push(e.latlng);
			}
		}
	})

	function stageOne () {

		// Initialize the map
		map = L.map( 'map' ).setView([10.4399233,76.445535], 8 );
		L.tileLayer( 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: 'Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors.',
			maxZoom: 18,
			minZoom: 2
		} ).addTo( map );
		stageTwo();
	}

	function stageTwo () {

		heat = L.heatLayer( [], heatOptions ).addTo( map );
		latlngs1 = [];
		latlngs2 = [];
		$.getJSON('/getData',function(data){
			Object.keys(data).forEach(function(key){
				var routes = data[key];
				latlngs1.push(L.latLng(routes[0],routes[1]));
				latlngs2.push(L.latLng(routes[0],routes[1]));
			});
		});

			heat._latlngs = latlngs1;

			heat.redraw();
	

          $( 'body' ).addClass( 'map-active' );
          activateControls();
        
    } 

	function activateControls () {

		$( '.control' ).on("click", function () {
			switch ( this.id ) {
				case 'makeRecording':
					$('body').removeClass('map-active');
					$('#popupbox').removeClass("hidden");
					$("#intro").removeClass("hidden");
					$(this).parent().addClass("hidden");
					$("#submitRecording").parent().removeClass("hidden");
					break;
				case 'submitRecording':
						$('body').removeClass('map-active');
						$('#popupbox').removeClass("hidden");
						$("#submit").removeClass("hidden");
						$(this).parent().addClass("hidden");
						toastr.clear();
					break;
				default:
					
					break;
			}
		} );
	}
	
	$("#startRecordBtn").on("click",function(){
		$('#popupbox').addClass("hidden");
		$('body').addClass('map-active');
		$("#intro").addClass("hidden");
		toastr.info("Recording Controls <br /> <button class='btn btn-danger pauseRecord hidden'>Pause</button> <br /> <button class='btn btn-success unpauseRecord'>Unpause</button> <br /> <button class='btn btn-success undoRecord' onClick='undoRecord()'>Undo</button>");
		
		
		$(".pauseRecord").on("click",function(){
			$(".unpauseRecord").removeClass("hidden");
			$(this).addClass("hidden");
			toggleEdit = false;
		});
	
	
		$(".unpauseRecord").on("click",unPause);
	});
	
	
	$("#submitRecordBtn").on("click",function(e){
		e.preventDefault();

		var minified = [];
		var selectedPoints = [];
		var recorder = $("#recorderName").val();
		var patientId = $("#patientId").val();
		var patientStart = $("#patientStartDate").val() +" "+ $("#patientStartTime").val();
		var patientEnd = $("#patientEndDate").val() +" "+ $("#patientEndTime").val();
		if(arrayLatLng.length!=0){
			arrayLatLng.forEach(function(i){i.forEach(function(j){selectedPoints.push(j);})});
			console.log(selectedPoints);
		}
		if(tempLatLng.length!=0){
			tempLatLng.forEach(function(i){selectedPoints.push(i)});
			console.log(selectedPoints);
		}
		for(var i=0; i < selectedPoints.length; i++){
			minified.push([selectedPoints[i].lat,selectedPoints[i].lng]);
		}
		console.log(minified);
		console.log(recorder);
		console.log(patientId);
		console.log(patientStart);
		console.log(patientEnd);

		$("#submit").addClass("hidden")
		$("#working").removeClass("hidden");

		$.post("/saveData",{"heatmap":JSON.stringify(minified), "recorder": recorder, "patientId": patientId, "patientStart": patientStart, "patientEnd": patientEnd}, function(data){
			console.log(data);
			try{
				data=JSON.parse(data);	
			}
			catch(err){
				data=data;
			}
			$(".patientCnf").html(data["patientId"]);
			$("#recorderCnf").html(data["recorder"]);
			$("#recordCnfId").html(data["id"]);
			$("#working").addClass("hidden");
			$("#done").removeClass("hidden");
		});

		
		return false;
	});

	$("#closeRecordBtn").on("click",function(){
		$("#makeRecording").parent().removeClass("hidden");
		$('#popupbox').addClass("hidden");
		$('body').addClass('map-active');
		$("#done").addClass("hidden");
		location.reload();
	});
	
	
//}( jQuery, L ));
