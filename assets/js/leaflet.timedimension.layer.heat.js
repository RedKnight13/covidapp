/*
 * L.TimeDimension.Layer.Heat:
 */

L.TimeDimension.Layer.Heat = L.TimeDimension.Layer.extend({
    initialize: function(layer, options) {
        L.TimeDimension.Layer.prototype.initialize.call(this, layer, options);

        this._updateTimeDimension = this.options.updateTimeDimension || false;
        this._updateTimeDimensionMode = this.options.updateTimeDimensionMode || 'extremes'; // 'union', 'replace' or extremes
        this._duration = this.options.duration || null;
        this._addlastPoint = this.options.addlastPoint || false;
        this._waitForReady = this.options.waitForReady || false;
        this._updateCurrentTime = this.options.updateCurrentTime || this._updateTimeDimension;        
        this._availableTimes = [];
        this._loaded = false;
        this._cData = this.options.cData || false;

        if (this._baseLayer.length == 0) {
            if (this._waitForReady){
                this._baseLayer.on("ready", this._onReadyBaseLayer, this);
            }else{
                this._loaded = true;
            }
        } else {
            this._loaded = true;
        }
        // reload available times if data is added to the base layer
    },
    /*
    _onNewTimeLoading: function(){
        
    },
*/
    _update: function(){

        if (!this._map)
            return;
        if (!this._loaded) {
            return;
        }

        
        var time = this._timeDimension.getCurrentTime();

        var maxTime = this._timeDimension.getCurrentTime(),
            minTime = 0;

        if (this._duration) {
            var date = new Date(maxTime);
            L.TimeDimension.Util.subtractTimeDuration(date, this._duration, true);
            minTime = date.getTime();
        }
        
        var layer = L.heatLayer([], this._baseLayer.options);
        var baseLayer = this._baseLayer;
        var plotCoordinates = this._getPlotCoordinatesBetweenDates(baseLayer.cData, minTime, maxTime);
        if (plotCoordinates) {
            plotCoordinates.forEach(function(j){layer._latlngs.push(j);});
        }
    

        if (this._currentLayer) {
            this._map.removeLayer(this._currentLayer);
        }
        if (layer) {
            layer.cData=baseLayer.cData;
            layer.addTo(this._map);
            this._currentLayer = layer;
            heat = layer;
        }

    },

    _getPlotCoordinatesBetweenDates: function(cData, minTime, maxTime){

        // cData has two objects: cCoordinates (storing the coordinates of patients) and coordinates (stroing the users locations)
        // TODO: Implement actual functionality instead of dummy function.

        var temp = [];
        coordinates.forEach(function(i){temp.push([i[0],i[1]])});

        return temp;
        

    },

    _isReady: function(time){
        return this._loaded;
    },
    
    _onReadyBaseLayer: function() {
        this._loaded = true;
        this._update();
    },

});
