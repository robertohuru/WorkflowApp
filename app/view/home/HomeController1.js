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
        var map = L.map(Ext.getCmp(mapPanel).body.id).setView([0, 0], 2);
        var openstreetmap = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
            id: 'OpenStreetMap'
        });
        var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri WorldStreetMap Community'
        });
        var baseMaps = {
            "OpenStreetMap": openstreetmap,
            "ESRI WorldStreetMap": Esri_WorldImagery
        };
        baseMaps["OpenStreetMap"].addTo(map);
        L.control.scale().addTo(map);
        map.setMaxZoom(18);
        map.setMinZoom(2);
        return map;
    }
})


