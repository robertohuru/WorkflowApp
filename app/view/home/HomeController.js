/*--- Home controller ---*/

"use strict";

Ext.define('WorkflowApp.view.home.HomeController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.home-main',

    init: function () {
        WorkflowApp.app.homeCtrl = this;
        this.control({
            'homeview': {
                'boxready': 'initializeView',
            }
        });
    },
    initializeView: function () {

    },
    createMap: function (mapPanel) {
        var map = new ol.Map({
            target: Ext.getCmp(mapPanel).body.id,
            view: new ol.View({
                center: WorkflowApp.app.mapCenter,
                minZoom: 1,
                zoom: 3
            })
        });
        var osmLayer = new ol.layer.Tile({
            source: new ol.source.OSM(),
            class: "OSM"
        });
        map.addLayer(osmLayer);
        map.addControl(new ol.control.MousePosition({
            projection: 'EPSG:4326',
            coordinateFormat: ol.coordinate.createStringXY(2)}));
        return map;
    }
})


