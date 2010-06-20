/*
 PdMarker (cut down by me)

 Purpose: extends Google Map API GMap and GMarker (hover effects, image swapping, moving)
 Details: http://wwww.pixeldevelopment.com/pdmarker.asp
 Author:  Peter Jones
*/

function latLongToPixel(map,coord,zoom) {
	var topLeft = map.getCurrentMapType().getProjection().fromLatLngToPixel(map.fromDivPixelToLatLng(new GLatLng(0,0),true),map.getZoom());
	var point = map.getCurrentMapType().getProjection().fromLatLngToPixel(coord,map.getZoom());
	return new GPoint(point.x - topLeft.x, point.y - topLeft.y);
}

var pdMarkerExtList = [];
function PdMarkerAddToExtList(marker) {
	pdMarkerExtList.push(marker);
}
function PdMarkerRemoveFromExtList(id) {
	for (var i=0; i<pdMarkerExtList.length; i++)
		if (pdMarkerExtList[i].internalId == id)
			pdMarkerExtList.splice(i,1);
}
function PdMarkerClose(id) {
	for (var i=0; i<pdMarkerExtList.length; i++)
		if (pdMarkerExtList[i].internalId == id)
			{
				pdMarkerExtList[i].closeDetailWin();
				pdMarkerExtList.splice(i,1);
			}
}

function PdMarkerNamespace() {

var nextMarkerId = 10;

function PdMarker(a, b) {
	this.inheritFrom = GMarker;
	this.inheritFrom(a,b);
	this.internalId = nextMarkerId;
	nextMarkerId += 1;
	this.percentOpacity = 80;
	this.hidingEnabled = true;
	this.detailOpen = false;
}
PdMarker.prototype = new GMarker(new GLatLng(1, 1));

function addMarkerToMapList(map,marker) {
	try {
		if (map.pdMarkers.length) ;
	}
	catch(e) {
		map.pdMarkers = new Array();
	}
	// add to list
	map.pdMarkers.push(marker);
}

function removeMarkerFromMapList(map,marker) {
	var id = marker.internalId;
	for (var i=0; i<map.pdMarkers.length; i++)
		if (map.pdMarkers[i].internalId == id)
		{
			map.pdMarkers.splice(i,1);
			return;
		}
}

PdMarker.prototype.initialize = function(a) {
	addMarkerToMapList(a,this);
	try {
		GMarker.prototype.initialize.call(this, a);
		this.isMarker = true;
		this.map = a;
		GEvent.bindDom(this, "mouseover", this, this.onMouseOver);
		GEvent.bindDom(this, "mouseout",  this, this.onMouseOut);
		GEvent.bindDom(this, "click",  this, this.onClick);
		GEvent.bind(this.map, "zoomend", this, this.reZoom);
	}
	catch(e) {
		alert("PdMarker initialize error: " + e);
	}
}

PdMarker.prototype.reZoom = function(){
	var didSet = false;
	if (this.tooltipObject)
		if (this.tooltipObject.style.display == "block")
		{
			setTTPosition(this);
			didSet = true;
		}
	if (this.detailObject)
	{
		if (!didSet)
			setTTPosition(this);
		this.detailObject.style.top  = this.ttTop + "px";
		this.detailObject.style.left  = this.ttLeft + "px";
	}
}

PdMarker.prototype.getId = function() {
	return this.internalId;
}

PdMarker.prototype.onInfoWindowOpen = function() {
	this.hideTooltip();
	GMarker.prototype.onInfoWindowOpen.call(this);
}

var inMouseOver = false;
PdMarker.prototype.onMouseOver = function() {
	if (inMouseOver) return;
	inMouseOver = true;
	if (!this.detailOpen) this.showTooltip();
	inMouseOver = false;
}
PdMarker.prototype.onMouseOut = function() {
	if (!this.detailOpen) this.hideTooltip();
}

PdMarker.prototype.setTooltipHiding = function(a) {
	this.hidingEnabled = a;
}
PdMarker.prototype.getTooltipHiding = function() {
	return this.hidingEnabled;
}

PdMarker.prototype.getTooltip = function() {
	try {
		return this.tooltipRaw;
	}
	catch (e) {
		return "";
	}
}

PdMarker.prototype.setTooltip = function(a) {
	this.tooltipRaw = a;
	this.tooltipText = "<div class='markerTooltip'>" + a + "</div>";
	this.deleteObjects();
}

PdMarker.prototype.showTooltip = function() {
	if (this.tooltipText) {
		if (!this.tooltipObject) initTooltip(this);
		setTTPosition(this);
		this.tooltipObject.style.display = "block";
	}
}

PdMarker.prototype.hideTooltip = function() {
	if (this.tooltipObject)
		if (this.hidingEnabled)
			this.tooltipObject.style.display = "none";
}

PdMarker.prototype.onClick = function(a) {
	if (this.detailWinHTML) this.showDetailWin();
}

PdMarker.prototype.setDetailWinHTML = function(a) {
	this.detailWinHTML = a;
}

PdMarker.prototype.showDetailWin = function() {
	if (this.detailOpen) {
		this.closeDetailWin();
		return;
	}
	this.hideTooltip();

	var html = "<table><tr><td>" + this.detailWinHTML + "<\/td><td valign='top'><a class='markerDetailClose' href='javascript:PdMarkerClose(" + this.internalId + ")'><img src='http://www.google.com/mapfiles/close.gif' width='14' height='13'><\/a><\/td><\/tr><\/table>";
	html = "<div class='markerDetail'>" + html + "</div>";
	this.detailOpen = true;
	if (!this.tooltipText) {
		this.ttWidth = 150;
		this.ttHeight = 30;
		setTTPosition(this); // compute ttTop, ttLeft
	}
	initDetailWin(this, this.ttTop, this.ttLeft, html);
	PdMarkerAddToExtList(this);
}

PdMarker.prototype.closeDetailWin = function() {
	this.detailOpen = false;
	if (this.detailObject) {
		this.onMouseOut();
		this.map.getPane(G_MAP_FLOAT_PANE).removeChild(this.detailObject);
		this.detailObject = null;
	}
}

PdMarker.prototype.deleteObjects = function() {
	if (this.tooltipObject) {
	      this.map.getPane(G_MAP_FLOAT_PANE).removeChild(this.tooltipObject);
		this.tooltipObject = null;
	}
	if (this.detailObject) {
		this.map.getPane(G_MAP_FLOAT_PANE).removeChild(this.detailObject);
		this.detailObject = null;
	}
}

PdMarker.prototype.remove = function(a) {
	removeMarkerFromMapList(this.map, this);
	PdMarkerRemoveFromExtList(this.getId());
	GMarker.prototype.remove.call(this);
	this.deleteObjects();
}

PdMarker.prototype.setOpacity = function(b) {
	if (b < 0) b=0;
	if (b >= 100) b=100;
	var c = b / 100;
	this.percentOpacity = b;
	var d = document.getElementById(this.objId);
	if (d) {
		if(typeof(d.style.filter)=='string'){d.style.filter='alpha(opacity:'+b+')';}
		if(typeof(d.style.KHTMLOpacity)=='string'){d.style.KHTMLOpacity=c;}
		if(typeof(d.style.MozOpacity)=='string'){d.style.MozOpacity=c;}
		if(typeof(d.style.opacity)=='string'){d.style.opacity=c;}
	}
}

// ***** Private routines *****

function initTooltip(theObj) {
	theObj.objId = 'ttobj' + theObj.internalId;
	theObj.anchorLatLng = theObj.point;

	var b = document.createElement('span');
	theObj.tooltipObject = b;
	b.setAttribute('id',theObj.objId);
	b.innerHTML = theObj.tooltipText;

	// append to body for size calculations
	var c = document.body;
	var d = document.getElementById("pdmarkerwork");
	if (d)
		c = d;
	c.appendChild(b);
	b.style.position = "absolute";
	b.style.bottom = "5px";
	b.style.left = "5px";
	b.style.zIndex = 1;
	if (theObj.percentOpacity)
		theObj.setOpacity(theObj.percentOpacity);
	var tempObj = document.getElementById(theObj.objId);
	theObj.ttWidth  = tempObj.offsetWidth;
	theObj.ttHeight = tempObj.offsetHeight;
	c.removeChild(b);

	b.style.zIndex = 600000;
	b.style.bottom = "";
	b.style.left = "";
	// theObj.map.div.appendChild(b);
	theObj.map.getPane(G_MAP_FLOAT_PANE).appendChild(b);
}

function initDetailWin(theObj, top, left, html) {
	theObj.detailId = "detail" + theObj.internalId;
	var b = document.createElement('span');
	theObj.detailObject = b;
	b.setAttribute('id',theObj.detailId);
	b.innerHTML = html;
	b.style.display = "block";
	b.style.position = "absolute";
	b.style.top  = top + "px";
	b.style.left = left + "px";
	b.style.zIndex = 600001;
	map = theObj.map;
	map.getPane(G_MAP_FLOAT_PANE).appendChild(b);
}

function setTTPosition(theObj) {
	var gap = 5;
	var map = theObj.map;
	var pt  = theObj.getPoint();
	var ttPos = latLongToPixel(map, pt, map.getZoom());
	var theIcon = theObj.getIcon();
	ttPos.y -= Math.floor(theIcon.iconAnchor.y/2);
	var rightSide = true;
	var bounds = map.getBounds();
	var boundsSpan	= bounds.toSpan();
	var longSpan = boundsSpan.lng();
	var mapWidth = map.getSize().width;
	var tooltipWidthInDeg = (theObj.ttWidth + theIcon.iconSize.width + 6) / mapWidth * longSpan;
	if (pt.lng() + tooltipWidthInDeg > bounds.getNorthEast().lng())
		rightSide = false;
	if (rightSide) {
		ttPos.y -= Math.floor(theObj.ttHeight/2);
		ttPos.x += (theIcon.iconSize.width - theIcon.iconAnchor.x) + gap;
	} else {
		ttPos.y -= Math.floor(theObj.ttHeight/2);
		ttPos.x -= (theIcon.iconAnchor.x + theObj.ttWidth) + gap;
	}
	theObj.ttLeft = ttPos.x;
	theObj.ttTop  = ttPos.y;
	if (theObj.tooltipObject) {
		theObj.tooltipObject.style.left = ttPos.x + "px";
		theObj.tooltipObject.style.top  = ttPos.y + "px";
	}
}

function makeInterface(a) {
	var b = a || window;
	b.PdMarker = PdMarker;
}
makeInterface();
}

PdMarkerNamespace();
