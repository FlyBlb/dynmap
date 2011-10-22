
var dynmapmarkersets = {};

componentconstructors['markers'] = function(dynmap, configuration) {
	var me = this;

	function removeAllMarkers() {
		$.each(dynmapmarkersets, function(setname, set) {
			$.each(set.markers, function(mname, marker) {
				set.layergroup.removeLayer(marker.our_marker);
			});
			set.markers = {};
		});
	}
			
	function loadmarkers(world) {
		removeAllMarkers();
		$.getJSON(dynmap.options.tileUrl+'_markers_/marker_'+world+'.json', function(data) {
			var ts = data.timestamp;
			$.each(data.sets, function(name, markerset) {
				var ms = dynmapmarkersets[name];
				if(!ms) {
					ms = { id: name, label: markerset.label, hide: markerset.hide, layerprio: markerset.layerprio, markers: {} } ;
					createMarkerSet(ms, ts);
				}
				else {
					if(ms.label != markerset.label) {
						ms.label = markerset.label;
						//dynmap.layercontrol.removeLayer(ms.layergroup);
						//dynmap.layercontrol.addOverlay(ms.layergroup, ms.label);
						dynmap.addToLayerSelector(ms.layergroup, ms.label, ms.layerprio || 0);
					}
					ms.markers = {};
					ms.hide = markerset.hide;
					ms.timestamp = ts;
				}
				dynmapmarkersets[name] = ms;
				$.each(markerset.markers, function(mname, marker) {
					ms.markers[mname] = { label: marker.label, markup: marker.markup, x: marker.x, y: marker.y, z:marker.z,
						icon: marker.icon, desc: marker.desc };
					createMarker(ms, ms.markers[mname], ts);
				});
			});
		});
	}
	
	function getPosition(marker) {
		return dynmap.getProjection().fromLocationToLatLng({ x: marker.x, y: marker.y, z: marker.z });
	}
	
	function createMarker(set, marker, ts) {
		var markerPosition = getPosition(marker);
		marker.our_marker = new L.CustomMarker(markerPosition, { elementCreator: function() {
			var div = document.createElement('div');

			var markerPosition = getPosition(marker);
			marker.our_marker.setLatLng(markerPosition);
						
			$(div)
				.addClass('Marker')
				.addClass('mapMarker')
				.append($('<img/>').addClass('markerIcon16x16').attr({ src: dynmap.options.tileUrl+'_markers_/'+marker.icon+'.png' }));
			if(marker.markup) {
				$(div).append($('<span/>')
					.addClass(configuration.showlabel?'markerName-show':'markerName')
					.addClass('markerName_' + set.id)
					.append(marker.label));
			}
			else
				$(div).append($('<span/>')
					.addClass(configuration.showlabel?'markerName-show':'markerName')
					.addClass('markerName_' + set.id)
					.text(marker.label));
			return div;
		}});
		marker.timestamp = ts;
		if(marker.desc) {
			var popup = document.createElement('div');
			$(popup).addClass('MarkerPopup').append(marker.desc);
			marker.our_marker.bindPopup(popup, {});
		}
		set.layergroup.addLayer(marker.our_marker);
	}
	
	function createMarkerSet(set, ts) {
		set.layergroup = new L.LayerGroup();
		set.timestamp = ts;
		if(!set.hide)
			dynmap.map.addLayer(set.layergroup);
//		dynmap.layercontrol.addOverlay(set.layergroup, set.label);
		dynmap.addToLayerSelector(set.layergroup, set.label, set.layerprio || 0);

	}

	// Helper functions
	latlng = function(x, y, z) {
		return dynmap.getProjection().fromLocationToLatLng(new Location(undefined, x,y,z));
	}
	
	function create3DBoxLayer(maxx, minx, maxy, miny, maxz, minz, style) {
		return new L.MultiPolygon([
			[
				latlng(minx,miny,minz),
				latlng(maxx,miny,minz),
				latlng(maxx,miny,maxz),
				latlng(minx,miny,maxz)
			],[
				latlng(minx,maxy,minz),
				latlng(maxx,maxy,minz),
				latlng(maxx,maxy,maxz),
				latlng(minx,maxy,maxz)
			],[
				latlng(minx,miny,minz),
				latlng(minx,maxy,minz),
				latlng(maxx,maxy,minz),
				latlng(maxx,miny,minz)
			],[
				latlng(maxx,miny,minz),
				latlng(maxx,maxy,minz),
				latlng(maxx,maxy,maxz),
				latlng(maxx,miny,maxz)
			],[
				latlng(minx,miny,maxz),
				latlng(minx,maxy,maxz),
				latlng(maxx,maxy,maxz),
				latlng(maxx,miny,maxz)
			],[
				latlng(minx,miny,minz),
				latlng(minx,maxy,minz),
				latlng(minx,maxy,maxz),
				latlng(minx,miny,maxz)
			]], style);
	}
	
	function create2DBoxLayer(maxx, minx, maxy, miny, maxz, minz, style) {
		return new L.Polygon([
				latlng(minx,64,minz),
				latlng(maxx,64,minz),
				latlng(maxx,64,maxz),
				latlng(minx,64,maxz)
				], style);
	}

	function create3DOutlineLayer(xarray, maxy, miny, zarray, style) {
		var toplist = [];
		var botlist = [];
		var i;
		var polylist = [];
		for(i = 0; i < xarray.length; i++) {
			toplist[i] = latlng(xarray[i], maxy, zarray[i]);
			botlist[i] = latlng(xarray[i], miny, zarray[i]);
		}
		for(i = 0; i < xarray.length; i++) {
			var sidelist = [];
			sidelist[0] = toplist[i];
			sidelist[1] = botlist[i];
			sidelist[2] = botlist[(i+1)%xarray.length];
			sidelist[3] = toplist[(i+1)%xarray.length];
			polylist[i] = sidelist;
		}
		polylist[xarray.length] = botlist;
		polylist[xarray.length+1] = toplist;
		
		return new L.MultiPolygon(polylist, style);
	}

	function create2DOutlineLayer(xarray, maxy, miny, zarray, style) {
		var llist = [];
		var i;
		for(i = 0; i < xarray.length; i++) {
			llist[i] = latlng(xarray[i], 64, zarray[i]);
		}
		return new L.Polygon(llist, style);
	}
	
	$(dynmap).bind('component.markers', function(event, msg) {
		if(msg.msg == 'markerupdated') {
			var marker = dynmapmarkersets[msg.set].markers[msg.id];
			if(marker && marker.our_marker) {
				dynmapmarkersets[msg.set].layergroup.removeLayer(marker.our_marker);
				delete marker.our_marker;
			}
			marker = { x: msg.x, y: msg.y, z: msg.z, icon: msg.icon, label: msg.label, markup: msg.markup, desc: msg.desc };
			dynmapmarkersets[msg.set].markers[msg.id] = marker;
			createMarker(dynmapmarkersets[msg.set], marker);
		}
		else if(msg.msg == 'markerdeleted') {
			var marker = dynmapmarkersets[msg.set].markers[msg.id];
			if(marker && marker.our_marker) {
				dynmapmarkersets[msg.set].layergroup.removeLayer(marker.our_marker);
			}
			delete dynmapmarkersets[msg.set].markers[msg.id];
		}
		else if(msg.msg == 'setupdated') {
			if(!dynmapmarkersets[msg.id]) {
				dynmapmarkersets[msg.id] = { id: msg.id, label: msg.label, layerprio: msg.layerprio, markers:{} };
				createMarkerSet(dynmapmarkersets[msg.id]);
			}
			else {
				if(dynmapmarkersets[msg.id].label != msg.label) {
					dynmapmarkersets[msg.id].label = msg.label;
					//dynmap.layercontrol.removeLayer(dynmapmarkersets[msg.id].layergroup);
					//dynmap.layercontrol.addOverlay(dynmapmarkersets[msg.id].layergroup, dynmapmarkersets[msg.id].label);
					dynmap.addToLayerSelector(dynmapmarkersets[msg.id].layergroup, dynmapmarkersets[msg.id].label, 
						dynmapmarkersets[msg.id].layerprio || 0);
					
				}
			}
		}
		else if(msg.msg == 'setdeleted') {
			if(dynmapmarkersets[msg.id]) {
				//dynmap.layercontrol.removeLayer(dynmapmarkersets[msg.id].layergroup);
				dynmap.removeFromLayerSelector(dynmapmarkersets[msg.id].layergroup);
				delete dynmapmarkersets[msg.id].layergroup;
				delete dynmapmarkersets[msg.id];
			}
		}		
	});
	
    // Remove marker on start of map change
	$(dynmap).bind('mapchanging', function(event) {
		$.each(dynmapmarkersets, function(setname, set) {
			$.each(set.markers, function(mname, marker) {
				set.layergroup.removeLayer(marker.our_marker);
			});
		});
	});
    // Remove marker on map change - let update place it again
	$(dynmap).bind('mapchanged', function(event) {
		$.each(dynmapmarkersets, function(setname, set) {
			$.each(set.markers, function(mname, marker) {
				var marker = set.markers[mname];
				var markerPosition = getPosition(marker);
				marker.our_marker.setLatLng(markerPosition);
				if(dynmap.map.hasLayer(marker.our_marker) == false)
					set.layergroup.addLayer(marker.our_marker);
			});
		});
	});
	// Load markers for new world
	$(dynmap).bind('worldchanged', function(event) {
		loadmarkers(this.world.name);
	});
	
	loadmarkers(dynmap.world.name);

};