( function ( $, L, prettySize ) {
	var map, heat,
		heatOptions = {
			tileOpacity: 1,
			heatOpacity: 1,
			radius: 25,
			blur: 15
		};
	zip.workerScriptsPath = "../../../assets/js/";
	/*zip.workerScripts = {
		deflater: ['lib/z-worker.js', 'lib/deflate.js'],
		inflater: ['lib/z-worker.js', 'lib/inflate.js']
	  };*/

	function status( message ) {
		$( '#currentStatus' ).text( message );
	}

	$("#takeoutLink").on("click",function(){
		window.open("https://takeout.google.com/settings/takeout/custom/location_history");
	});

	function unzipstatus( message ) {
		$( '#unzipStatus' ).text( message );
	}
	// Start at the beginning
	stageOne();

	function stageOne () {
		var dropzone;

		// Initialize the map
		map = L.map( 'map' ).setView( [10.4399233,76.445535], 8 );
		L.tileLayer( 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: 'Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors.',
			maxZoom: 18,
			minZoom: 2
		} ).addTo( map );

		// Initialize the dropzone
		dropzone = new Dropzone( document.body, {
			url: '/',
			previewsContainer: document.createElement( 'div' ), // >> /dev/null
			clickable: false,
			accept: function ( file, done ) {
				unzipTakeout(file);
				dropzone.disable(); // Your job is done, buddy
			}
		} );

		// For mobile browsers, allow direct file selection as well
		$( '#file' ).change( function () {
			unzipTakeout(this.files[0]);
			dropzone.disable();
		} );
	}

	function unzipTakeout( file ) {

		zip.createReader(new zip.BlobReader(file), function(reader) {

			// get all entries from the zip
			reader.getEntries(function(entries) {
			  if (entries.length) {

				
				// First, change tabs
				$( 'body' ).addClass( 'unzipping' );
				$( '#intro' ).addClass( 'hidden' );
				$( '#unzipping' ).removeClass( 'hidden' );

				entries.forEach(function(entry){
					if(entry.directory==false && entry.filename=="Takeout/Location History/Location History.json")
						//TJson = entry.getFileEntry;
						// get first entry content as text
						entry.getData(new zip.BlobWriter(), function(Tfile) {
						  // Tfile contains the location data as a Blob
						  Tfile.filename="Location History.json";
						  Tfile.type="application/json";
						  stageTwo(Tfile);
				  
						  // close the zip reader
						  reader.close(function() {
							// onclose callback
						  });
				  
						}, function(current, total) {
						  // onprogress callback
						  //console.log(current);
						  //console.log(total);
							var percentLoaded = ( 100 * current / total ).toFixed( 0 );
							unzipstatus( percentLoaded + '% uncompressed...' );
						});
				});
			  }
			});
		  }, function(error) {
			// onerror callback
			console.log(error);
		  });

	}

	function stageTwo ( file ) {

		heat = L.heatLayer( [], heatOptions ).addTo( map );

		var type;

		try {
			if ( /\.kml$/i.test( file.name ) ) {
				type = 'kml';
			} else {
				type = 'json';
			}
		} catch ( ex ) {
			status( 'Something went wrong generating your map. Ensure you\'re uploading a Google Takeout JSON file that contains location data and try again, or create an issue on GitHub if the problem persists. ( error: ' + ex.message + ' )' );
			return;
		}

		// First, change tabs
		$("body").removeClass('unzipping');
		$( 'body' ).addClass( 'working' );
		$( '#unzipping' ).addClass( 'hidden' );
		$( '#working' ).removeClass( 'hidden' );

		var SCALAR_E7 = 0.0000001; // Since Google Takeout stores latlngs as integers
		var latlngs = [];

		var os = new oboe();

		os.node( 'locations.*', function ( location ) {
			var latitude = location.latitudeE7 * SCALAR_E7,
				longitude = location.longitudeE7 * SCALAR_E7;

			// Handle negative latlngs due to google unsigned/signed integer bug.
			if ( latitude > 180 ) latitude = latitude - (2 ** 32) * SCALAR_E7;
			if ( longitude > 180 ) longitude = longitude - (2 ** 32) * SCALAR_E7;

			if ( type === 'json' ) latlngs.push( [ latitude, longitude ] );
			return oboe.drop;
		} ).done( function () {
			status( 'Generating map...' );
			heat._latlngs = latlngs;

			heat.redraw();
			stageThree(  );

		} );

		var fileSize = prettySize( file.size );

		status( 'Preparing to import file ( ' + fileSize + ' )...' );

		// Now start working!
		if ( type === 'json' ) parseJSONFile( file, os );
		if ( type === 'kml' ) parseKMLFile( file );
	}

	function stageThree ( ) {

		// Change tabs :D
		$( 'body' ).removeClass( 'working' );
		$( '#working' ).addClass( 'hidden' );
		$( 'body' ).addClass( 'map-active' );
		activateControls();

		function activateControls () {
			var $tileLayer = $( '.leaflet-tile-pane' ),
				$heatmapLayer = $( '.leaflet-heatmap-layer' ),
				originalHeatOptions = $.extend( {}, heatOptions ); // for reset

			// Update values of the dom elements
			function updateInputs () {
				var option;
				for ( option in heatOptions ) {
					if ( heatOptions.hasOwnProperty( option ) ) {
						document.getElementById( option ).value = heatOptions[option];
					}
				}
			}

			updateInputs();

			$( '.control' ).change( function () {
				switch ( this.id ) {
					case 'tileOpacity':
						$tileLayer.css( 'opacity', this.value );
						break;
					case 'heatOpacity':
						$heatmapLayer.css( 'opacity', this.value );
						break;
					default:
						heatOptions[ this.id ] = Number( this.value );
						heat.setOptions( heatOptions );
						break;
				}
			} );

			$( '#reset' ).click( function () {
				$.extend( heatOptions, originalHeatOptions );
				updateInputs();
				heat.setOptions( heatOptions );
				// Reset opacity too
				$heatmapLayer.css( 'opacity', originalHeatOptions.heatOpacity );
				$tileLayer.css( 'opacity', originalHeatOptions.tileOpacity );
			} );
		}
	}

	/*
	Break file into chunks and emit 'data' to oboe instance
	*/

	function parseJSONFile( file, oboeInstance ) {
		var fileSize = file.size;
		var prettyFileSize = prettySize(fileSize);
		var chunkSize = 512 * 1024; // bytes
		var offset = 0;
		var self = this; // we need a reference to the current object
		var chunkReaderBlock = null;
		var startTime = Date.now();
		var endTime = Date.now();
		var readEventHandler = function ( evt ) {
			if ( evt.target.error == null ) {
				offset += evt.target.result.length;
				var chunk = evt.target.result;
				var percentLoaded = ( 100 * offset / fileSize ).toFixed( 0 );
				status( percentLoaded + '% of ' + prettyFileSize + ' loaded...' );
				oboeInstance.emit( 'data', chunk ); // callback for handling read chunk
			} else {
				return;
			}
			if ( offset >= fileSize ) {
				oboeInstance.emit( 'done' );
				return;
			}

			// of to the next chunk
			chunkReaderBlock( offset, chunkSize, file );
		}

		chunkReaderBlock = function ( _offset, length, _file ) {
			var r = new FileReader();
			var blob = _file.slice( _offset, length + _offset );
			r.onload = readEventHandler;
			r.readAsText( blob );
		}

		// now let's start the read with the first block
		chunkReaderBlock( offset, chunkSize, file );
	}

	/*
        Default behavior for file upload (no chunking)	
	*/

	function parseKMLFile( file ) {
		var fileSize = prettySize( file.size );
		var reader = new FileReader();
		reader.onprogress = function ( e ) {
			var percentLoaded = Math.round( ( e.loaded / e.total ) * 100 );
			status( percentLoaded + '% of ' + fileSize + ' loaded...' );
		};

		reader.onload = function ( e ) {
			var latlngs;
			status( 'Generating map...' );
			latlngs = getLocationDataFromKml( e.target.result );
			heat._latlngs = latlngs;
			heat.redraw();
			stageThree( latlngs.length );
		}
		reader.onerror = function () {
			status( 'Something went wrong reading your JSON file. Ensure you\'re uploading a "direct-from-Google" JSON file and try again, or create an issue on GitHub if the problem persists. ( error: ' + reader.error + ' )' );
		}
		reader.readAsText( file );
	}

	function getLocationDataFromKml( data ) {
		var KML_DATA_REGEXP = /<when>( .*? )<\/when>\s*<gx:coord>( \S* )\s( \S* )\s( \S* )<\/gx:coord>/g,
			locations = [],
			match = KML_DATA_REGEXP.exec( data );

		// match
		//  [ 1 ] ISO 8601 timestamp
		//  [ 2 ] longitude
		//  [ 3 ] latitude
		//  [ 4 ] altitude ( not currently provided by Location History )
		while ( match !== null ) {
			locations.push( [ Number( match[ 3 ] ), Number( match[ 2 ] ) ] );
			match = KML_DATA_REGEXP.exec( data );
		}

		return locations;
	}

}( jQuery, L, prettySize ) );
