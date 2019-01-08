"use strict";
Ext.define('WorkflowApp.view.workflow.WorkflowController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.workflow-main',
    requires: [
        'WorkflowApp.view.workflow.OperationForm',
        'WorkflowApp.view.workflow.WorkflowTreeView',
        'WorkflowApp.model.ProcessServer',
        'WorkflowApp.view.workflow.ResultWindow'
    ],
    workflows: {
        "workflows": [
            {
                id: 1,
                metadata: {
                    longname: "Subworkflow"
                },
                operations: [],
                connections: []
            }
        ]
    },
    map: null,
    layers: {},
    layerCtrl: null,
    wpsServers: [
        {"name": "REST services", 'type': 'REST', url: "http://130.89.221.193:75/rest"},
        {"name": "ILWIS4 Operations", type: 'ILWIS', "url": "http://130.89.221.193:75/ilwisoperations"},
        {"name": "ILWIS3 Server(WPS)", type: 'WPS', "url": "http://130.89.221.193:8085/ilwis_server?"},
        {"name": "Default server(WPS)", type: 'WPS', "url": "http://130.89.221.193:85/geoserver/ows?"},
        {"name": "52North Server(WPS)", 'type': 'WPS', url: "http://geoprocessing.demo.52north.org:8080/latest-wps/WebProcessingService?version=1.0.0&"},
    ],
    wfsServers: [
        {"name": "Default server(WFS)", "url": "http://130.89.221.193:85/geoserver/maris_mamase/ows?"}
    ],
    wcsServers: [
        {"name": "Default server(WCS)", "url": "http://130.89.221.193:85/geoserver/maris_mamase/ows?"}
    ],
    init: function () {
        WorkflowApp.app.wkfCtrl = this;
        this.control({
            'workflowview': {
                'boxready': 'initializeView',
            }
        });
    },
    initializeView: function () {
        WorkflowApp.app.wkfCtrl = this;
        WorkflowApp.app.wkfCtrl.map = WorkflowApp.app.homeCtrl.createMap('result_map');
        WorkflowApp.app.wkfCtrl.map.getView().setCenter(WorkflowApp.app.mapCenter);
        d3.select("#WorkflowPanel-innerCt").append("svg")
                .attr("width", Ext.getCmp("WorkflowPanel").getWidth() * 1.5)
                .attr("height", Ext.getCmp("WorkflowPanel").getHeight() * 1.5);
        Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</span></pre>");

        Ext.getStore('operations').load({
            params: {
                url: "http://130.89.8.26/ilwisoperations",
                name: "ILWIS"
            },
            callback: function (records) {
                WorkflowApp.app.wkfCtrl.addWPSprocess(records, 'ILWIS 4 Operations');
                Ext.getStore('operations').load({
                    params: {
                        url: "http://130.89.221.193:8085/ilwis_server?",
                        name: "WPS"
                    },
                    callback: function (records) {
                        WorkflowApp.app.wkfCtrl.addWPSprocess(records, "ILWIS3 Server(WPS)");
                        Ext.getStore('operations').load({
                            params: {
                                url: "http://130.89.221.193:85/geoserver/ows?",
                                name: "WPS"
                            },
                            callback: function (records) {
                                WorkflowApp.app.wkfCtrl.addWPSprocess(records, 'Default Server(WPS)');
                                Ext.getStore('operations').load({
                                    params: {
                                        url: "http://geoprocessing.demo.52north.org:8080/latest-wps/WebProcessingService?version=1.0.0&",
                                        name: "WPS"
                                    },
                                    callback: function (records) {
                                        WorkflowApp.app.wkfCtrl.addWPSprocess(records, '52North Server(WPS)');
                                    }
                                });
                            }
                        });
                    }
                });

            }
        });

        Ext.getStore('features').load({
            params: {
                url: "http://130.89.8.26:85/geoserver/maris_mamase/ows?"
            },
            callback: function (records) {
                WorkflowApp.app.wkfCtrl.addWFSfeatures(records, 'Default Server(WFS)');
            }
        });
        Ext.getStore('coverages').load({
            params: {
                url: "http://130.89.8.26:85/geoserver/maris_mamase/ows?"
            },
            callback: function (records) {
                WorkflowApp.app.wkfCtrl.addWFSfeatures(records, 'Default Server(WCS)');
            }
        });
        this.initializeRESTprocess();
        Ext.create({
            xtype: 'configform',
            id: 'config_panel',
            itemId: 'config_panel',
            height: 40,
            width: 150,
            draggable: false,
            minHeight: 30,
            padding: 0,
            border: false,
            closable: false,
            resizable: false,
            iconCls: 'yyy-box',
            header: false,
            items: [
                {
                    xtype: 'button',
                    text: 'Configuration',
                    height: 38,
                    margin: 0,
                    id: 'btnConfig',
                    iconCls: 'x-fa fa-cog',
                }
            ],
            listeners: {
                show: function () {
                    Ext.getCmp('config_panel').setX(Ext.getCmp("workflow_view").getX() + Ext.getCmp("workflow_view").getWidth() - Ext.getCmp('config_panel').getWidth() - 2);
                    Ext.getCmp('config_panel').setY(Ext.getCmp("workflow_view").getY() + 2);
                }
            }
        }).show();
        Ext.getCmp("btnConfig").on("click", function () {
            Ext.create({
                xtype: 'configform',
                id: 'config_form',
                title: 'Configuration',
                height: 600,
                width: 600,
                modal: true,
                autoScroll: 'true',
                overflowY: 'auto',
                layout: {
                    type: 'vbox',
                    pack: 'position',
                    align: 'stretch'
                },
                items: [
                    {
                        xtype: 'panel',
                        border: false,
                        flex: 0.5,
                        layout: {
                            type: 'vbox',
                            pack: 'position',
                            align: 'stretch'
                        },
                        margin: 5,
                        items: [
                            {
                                xtype: 'label',
                                flex: 0.1,
                                html: '<span>Processing services</span>'
                            },
                            {
                                xtype: 'grid',
                                border: false,
                                flex: 0.9,
                                id: 'gridWPS',
                                store: Ext.create('Ext.data.Store', {
                                    fields: ['name', 'url'],
                                    data: WorkflowApp.app.wkfCtrl.wpsServers,
                                }),
                                columns: [
                                    {
                                        sortable: false,
                                        hideable: false,
                                        header: 'Name',
                                        flex: 0.3,
                                        renderer: function (value, metaData, record, rowIdx, colIdx, store, view) {
                                            var html = record.get('name');
                                            return html;
                                        }
                                    },
                                    {
                                        flex: 0.7,
                                        sortable: false,
                                        hideable: false,
                                        header: 'Url',
                                        renderer: function (value, metaData, record, rowIdx, colIdx, store, view) {
                                            var html = record.get('url');
                                            return html;
                                        }
                                    }
                                ],
                                dockedItems: [
                                    {
                                        dock: "bottom",
                                        xtype: "toolbar",
                                        items: [
                                            {
                                                xtype: 'button',
                                                text: 'Add',
                                                id: "btnAddWPS",
                                                handler: function () {
                                                    Ext.create({
                                                        xtype: 'configform',
                                                        id: 'wps_form',
                                                        title: 'Processing Service',
                                                        height: 350,
                                                        width: 500,
                                                        modal: true,
                                                        layout: {
                                                            type: 'vbox',
                                                            pack: 'position',
                                                            align: 'stretch'
                                                        },
                                                        autoScroll: 'true',
                                                        overflowY: 'auto',
                                                        items: [
                                                            {
                                                                xtype: 'label',
                                                                html: 'Resource' + '<span style="color: red; font-size: 12px">*</span>',
                                                                margin: '10 10 0 10'
                                                            },
                                                            {
                                                                xtype: 'combobox',
                                                                anchor: '100%',
                                                                id: 'resource',
                                                                multiSelect: false,
                                                                inputWrapCls: '',
                                                                style: {
                                                                    border: 'solid 0.5px #cccccc'
                                                                },
                                                                store: Ext.create('Ext.data.Store', {
                                                                    fields: ['id', 'type'],
                                                                    data: [{id: 'WPS', type: "WPS"}, {id: 'REST', type: "REST"}],
                                                                }),
                                                                emptyText: 'Select resource...',
                                                                queryMode: 'local',
                                                                displayField: 'type',
                                                                valueField: 'type',
                                                                margin: '10 10 0 10',
                                                                listeners: {
                                                                    select: function (a, b, c) {
                                                                        if (b.data.type == "REST") {
                                                                            Ext.getCmp("wps_form").setHeight(600);
                                                                            Ext.getCmp("more_inputs_panel").show();
                                                                            Ext.getCmp("wpsurl").setValue("http://130.89.221.193:75/binarymathraster");
                                                                        } else {
                                                                            Ext.getCmp("wps_form").setHeight(350);
                                                                            Ext.getCmp("more_inputs_panel").hide();
                                                                            Ext.getCmp("wpsurl").setValue("http://130.89.221.193:85/geoserver/ows?");
                                                                        }
                                                                    },
                                                                    afterrender: function () {
                                                                        var combo = Ext.getCmp("resource")
                                                                        combo.setValue(combo.store.getAt(0).get('id'));
                                                                    }
                                                                }
                                                            },
                                                            {
                                                                xtype: 'label',
                                                                html: 'Name' + '<span style="color: red; font-size: 12px">*</span>',
                                                                margin: '10 10 0 10'
                                                            },
                                                            {
                                                                xtype: 'textfield',
                                                                margin: '10 10 0 10',
                                                                emptyText: '',
                                                                id: 'wpsname',
                                                            },
                                                            {
                                                                xtype: 'label',
                                                                html: 'Enter URL' + '<span style="color: red; font-size: 12px">*</span>',
                                                                margin: '10 10 0 10'
                                                            },
                                                            {
                                                                xtype: 'textfield',
                                                                margin: '10 10 10 10',
                                                                emptyText: 'http://130.89.221.193:85/geoserver/ows?',
                                                                id: 'wpsurl',
                                                                value: "http://130.89.221.193:85/geoserver/ows?"
                                                            },
                                                            {
                                                                xtype: 'panel',
                                                                id: 'more_inputs_panel',
                                                                hidden: true,
                                                                border: false,
                                                                layout: {
                                                                    type: 'vbox',
                                                                    pack: 'position',
                                                                    align: 'stretch'
                                                                },
                                                                items: [
                                                                    {
                                                                        xtype: 'label',
                                                                        html: 'Description' + '<span style="color: red; font-size: 12px">*</span>',
                                                                        margin: '10 10 0 10'
                                                                    },
                                                                    {
                                                                        xtype: 'textarea',
                                                                        margin: '10 10 0 10',
                                                                        id: 'rest_description',
                                                                    },
                                                                    {
                                                                        xtype: 'label',
                                                                        html: 'Input Parameter Count',
                                                                        margin: '10 10 0 10'
                                                                    },
                                                                    {
                                                                        xtype: 'numberfield',
                                                                        margin: '10 10 0 10',
                                                                        emptyText: 'Local Geoserver',
                                                                        id: 'inputparameterCount',
                                                                        value: 1,
                                                                        maxValue: 5,
                                                                        minValue: 1,
                                                                        listeners: {
                                                                            change: function (a, b, c) {
                                                                                if (c > b) {
                                                                                    Ext.getCmp("input_panel_" + c).hide();
                                                                                }
                                                                                if (b > c) {
                                                                                    Ext.getCmp("input_panel_" + b).show();
                                                                                }
                                                                            }
                                                                        }
                                                                    }, {
                                                                        xtype: 'panel',
                                                                        id: 'inputs_panel',
                                                                        layout: {
                                                                            type: 'vbox',
                                                                            pack: 'start',
                                                                            align: 'stretch'
                                                                        },
                                                                        border: false,
                                                                        items: [
                                                                            {
                                                                                xtype: 'panel',
                                                                                border: false,
                                                                                id: 'input_panel_1',
                                                                                layout: {
                                                                                    type: 'hbox',
                                                                                    pack: 'start',
                                                                                    align: 'stretch'
                                                                                },
                                                                                items: [
                                                                                    {
                                                                                        xtype: 'label',
                                                                                        html: 'Input 1' + '<span style="color: red; font-size: 12px">*</span>',
                                                                                        margin: '15 0 0 20'
                                                                                    },
                                                                                    {
                                                                                        xtype: 'textfield',
                                                                                        margin: '5 10 0 10',
                                                                                        emptyText: 'Name',
                                                                                        id: 'input_value_1',
                                                                                        flex: 0.5,
                                                                                    },
                                                                                    {
                                                                                        xtype: 'combobox',
                                                                                        anchor: '100%',
                                                                                        id: 'input_datatype_1',
                                                                                        multiSelect: false,
                                                                                        flex: 0.5,
                                                                                        inputWrapCls: '',
                                                                                        style: {
                                                                                            border: 'solid 0.5px #cccccc'
                                                                                        },
                                                                                        store: Ext.create('Ext.data.Store', {
                                                                                            fields: ['name', 'type'],
                                                                                            data: [{'name': 'geom', type: "Geometry"}, {'name': 'coverage', type: "Coverage"}, {'name': 'numeric', 'name': "Numeric"}, {'name': 'text', type: "Text"}, {'name': 'boolean', type: "Boolean"}, {'name': 'other', type: "Other"}],
                                                                                        }),
                                                                                        emptyText: 'Select data type...',
                                                                                        queryMode: 'local',
                                                                                        displayField: 'type',
                                                                                        valueField: 'name',
                                                                                        margin: '5 10 0 10',
                                                                                    },
                                                                                ]
                                                                            },
                                                                            {
                                                                                xtype: 'panel',
                                                                                border: false,
                                                                                hidden: true,
                                                                                id: 'input_panel_2',
                                                                                layout: {
                                                                                    type: 'hbox',
                                                                                    pack: 'start',
                                                                                    align: 'stretch'
                                                                                },
                                                                                items: [
                                                                                    {
                                                                                        xtype: 'label',
                                                                                        html: 'Input 2',
                                                                                        margin: '15 5 0 20'
                                                                                    },
                                                                                    {
                                                                                        xtype: 'textfield',
                                                                                        margin: '5 10 0 10',
                                                                                        emptyText: 'Name',
                                                                                        id: 'input_value_2',
                                                                                        flex: 0.5,
                                                                                    },
                                                                                    {
                                                                                        xtype: 'combobox',
                                                                                        anchor: '100%',
                                                                                        id: 'input_datatype_2',
                                                                                        multiSelect: false,
                                                                                        flex: 0.5,
                                                                                        inputWrapCls: '',
                                                                                        style: {
                                                                                            border: 'solid 0.5px #cccccc'
                                                                                        },
                                                                                        store: Ext.create('Ext.data.Store', {
                                                                                            fields: ['name', 'type'],
                                                                                            data: [{'name': 'geom', type: "Geometry"}, {'name': 'coverage', type: "Coverage"}, {'name': 'numeric', 'name': "Numeric"}, {'name': 'text', type: "Text"}, {'name': 'boolean', type: "Boolean"}, {'name': 'other', type: "Other"}],
                                                                                        }),
                                                                                        emptyText: 'Select data type...',
                                                                                        queryMode: 'local',
                                                                                        displayField: 'type',
                                                                                        valueField: 'name',
                                                                                        margin: '5 10 0 10',
                                                                                    },
                                                                                ]
                                                                            },
                                                                            {
                                                                                xtype: 'panel',
                                                                                border: false,
                                                                                hidden: true,
                                                                                id: 'input_panel_3',
                                                                                layout: {
                                                                                    type: 'hbox',
                                                                                    pack: 'start',
                                                                                    align: 'stretch'
                                                                                },
                                                                                items: [
                                                                                    {
                                                                                        xtype: 'label',
                                                                                        html: 'Input 3',
                                                                                        margin: '15 5 0 20'
                                                                                    },
                                                                                    {
                                                                                        xtype: 'textfield',
                                                                                        margin: '5 10 0 10',
                                                                                        emptyText: 'Name',
                                                                                        id: 'input_value_3',
                                                                                        flex: 0.5,
                                                                                    },
                                                                                    {
                                                                                        xtype: 'combobox',
                                                                                        anchor: '100%',
                                                                                        id: 'input_datatype_3',
                                                                                        multiSelect: false,
                                                                                        flex: 0.5,
                                                                                        inputWrapCls: '',
                                                                                        style: {
                                                                                            border: 'solid 0.5px #cccccc'
                                                                                        },
                                                                                        store: Ext.create('Ext.data.Store', {
                                                                                            fields: ['name', 'type'],
                                                                                            data: [{'name': 'geom', type: "Geometry"}, {'name': 'coverage', type: "Coverage"}, {'name': 'numeric', 'name': "Numeric"}, {'name': 'text', type: "Text"}, {'name': 'boolean', type: "Boolean"}, {'name': 'other', type: "Other"}],
                                                                                        }),
                                                                                        emptyText: 'Select data type...',
                                                                                        queryMode: 'local',
                                                                                        displayField: 'type',
                                                                                        valueField: 'name',
                                                                                        margin: '5 10 0 10',
                                                                                    },
                                                                                ]
                                                                            },
                                                                            {
                                                                                xtype: 'panel',
                                                                                border: false,
                                                                                hidden: true,
                                                                                id: 'input_panel_4',
                                                                                layout: {
                                                                                    type: 'hbox',
                                                                                    pack: 'start',
                                                                                    align: 'stretch'
                                                                                },
                                                                                items: [
                                                                                    {
                                                                                        xtype: 'label',
                                                                                        html: 'Input 4',
                                                                                        margin: '15 5 0 20'
                                                                                    },
                                                                                    {
                                                                                        xtype: 'textfield',
                                                                                        margin: '5 10 0 10',
                                                                                        emptyText: 'Name',
                                                                                        id: 'input_value_4',
                                                                                        flex: 0.5,
                                                                                    },
                                                                                    {
                                                                                        xtype: 'combobox',
                                                                                        anchor: '100%',
                                                                                        id: 'input_datatype_4',
                                                                                        multiSelect: false,
                                                                                        flex: 0.5,
                                                                                        inputWrapCls: '',
                                                                                        style: {
                                                                                            border: 'solid 0.5px #cccccc'
                                                                                        },
                                                                                        store: Ext.create('Ext.data.Store', {
                                                                                            fields: ['name', 'type'],
                                                                                            data: [{'name': 'geom', type: "Geometry"}, {'name': 'coverage', type: "Coverage"}, {'name': 'numeric', 'name': "Numeric"}, {'name': 'text', type: "Text"}, {'name': 'boolean', type: "Boolean"}, {'name': 'other', type: "Other"}],
                                                                                        }),
                                                                                        emptyText: 'Select data type...',
                                                                                        queryMode: 'local',
                                                                                        displayField: 'type',
                                                                                        valueField: 'name',
                                                                                        margin: '5 10 0 10',
                                                                                    },
                                                                                ]
                                                                            },
                                                                            {
                                                                                xtype: 'panel',
                                                                                border: false,
                                                                                hidden: true,
                                                                                id: 'input_panel_5',
                                                                                layout: {
                                                                                    type: 'hbox',
                                                                                    pack: 'start',
                                                                                    align: 'stretch'
                                                                                },
                                                                                items: [
                                                                                    {
                                                                                        xtype: 'label',
                                                                                        html: 'Input 5',
                                                                                        margin: '15 5 0 20'
                                                                                    },
                                                                                    {
                                                                                        xtype: 'textfield',
                                                                                        margin: '5 10 0 10',
                                                                                        emptyText: 'Name',
                                                                                        id: 'input_value_5',
                                                                                        flex: 0.5,
                                                                                    },
                                                                                    {
                                                                                        xtype: 'combobox',
                                                                                        anchor: '100%',
                                                                                        id: 'inpput_datatype_5',
                                                                                        multiSelect: false,
                                                                                        flex: 0.5,
                                                                                        inputWrapCls: '',
                                                                                        style: {
                                                                                            border: 'solid 0.5px #cccccc'
                                                                                        },
                                                                                        store: Ext.create('Ext.data.Store', {
                                                                                            fields: ['name', 'type'],
                                                                                            data: [{'name': 'geom', type: "Geometry"}, {'name': 'coverage', type: "Coverage"}, {'name': 'numeric', 'name': "Numeric"}, {'name': 'text', type: "Text"}, {'name': 'boolean', type: "Boolean"}, {'name': 'other', type: "Other"}],
                                                                                        }),
                                                                                        emptyText: 'Select data type...',
                                                                                        queryMode: 'local',
                                                                                        displayField: 'type',
                                                                                        valueField: 'name',
                                                                                        margin: '5 10 0 10',
                                                                                    },
                                                                                ]
                                                                            }
                                                                        ]
                                                                    },
                                                                    {
                                                                        xtype: 'label',
                                                                        html: 'Output Parameter Count',
                                                                        margin: '10 10 0 10'
                                                                    },
                                                                    {
                                                                        xtype: 'numberfield',
                                                                        margin: '10 10 0 10',
                                                                        emptyText: '',
                                                                        id: 'outputparameterCount',
                                                                        value: 1,
                                                                        maxValue: 3,
                                                                        minValue: 1,
                                                                        listeners: {
                                                                            change: function (a, b, c) {
                                                                                if (c > b) {
                                                                                    Ext.getCmp("output_panel_" + c).hide();
                                                                                }
                                                                                if (b > c) {
                                                                                    Ext.getCmp("output_panel_" + b).show();
                                                                                }
                                                                            }
                                                                        }
                                                                    },
                                                                    {
                                                                        xtype: 'panel',
                                                                        id: 'outputs_panel',
                                                                        layout: {
                                                                            type: 'vbox',
                                                                            pack: 'start',
                                                                            align: 'stretch'
                                                                        },
                                                                        border: false,
                                                                        bodyPadding: '0 0 10 0',
                                                                        items: [
                                                                            {
                                                                                xtype: 'panel',
                                                                                border: false,
                                                                                id: 'output_panel_1',
                                                                                layout: {
                                                                                    type: 'hbox',
                                                                                    pack: 'start',
                                                                                    align: 'stretch'
                                                                                },
                                                                                items: [
                                                                                    {
                                                                                        xtype: 'label',
                                                                                        html: 'Output 1' + '<span style="color: red; font-size: 12px">*</span>',
                                                                                        margin: '15 0 0 20'
                                                                                    },
                                                                                    {
                                                                                        xtype: 'textfield',
                                                                                        margin: '5 10 0 10',
                                                                                        emptyText: 'Name',
                                                                                        id: 'output_value_1',
                                                                                        flex: 0.5,
                                                                                    },
                                                                                    {
                                                                                        xtype: 'combobox',
                                                                                        anchor: '100%',
                                                                                        id: 'output_datatype_1',
                                                                                        multiSelect: false,
                                                                                        flex: 0.5,
                                                                                        inputWrapCls: '',
                                                                                        style: {
                                                                                            border: 'solid 0.5px #cccccc'
                                                                                        },
                                                                                        store: Ext.create('Ext.data.Store', {
                                                                                            fields: ['name', 'type'],
                                                                                            data: [{'name': 'geom', type: "Geometry"}, {'name': 'coverage', type: "Coverage"}, {'name': 'numeric', 'name': "Numeric"}, {'name': 'text', type: "Text"}, {'name': 'boolean', type: "Boolean"}, {'name': 'other', type: "Other"}],
                                                                                        }),
                                                                                        emptyText: 'Select data type...',
                                                                                        queryMode: 'local',
                                                                                        displayField: 'type',
                                                                                        valueField: 'name',
                                                                                        margin: '5 10 0 10',
                                                                                    },
                                                                                ]
                                                                            },
                                                                            {
                                                                                xtype: 'panel',
                                                                                border: false,
                                                                                hidden: true,
                                                                                id: 'output_panel_2',
                                                                                layout: {
                                                                                    type: 'hbox',
                                                                                    pack: 'start',
                                                                                    align: 'stretch'
                                                                                },
                                                                                items: [
                                                                                    {
                                                                                        xtype: 'label',
                                                                                        html: 'Output 2',
                                                                                        margin: '15 5 0 20'
                                                                                    },
                                                                                    {
                                                                                        xtype: 'textfield',
                                                                                        margin: '5 10 0 10',
                                                                                        emptyText: 'Name',
                                                                                        id: 'output_value_2',
                                                                                        flex: 0.5,
                                                                                    },
                                                                                    {
                                                                                        xtype: 'combobox',
                                                                                        anchor: '100%',
                                                                                        id: 'output_datatype_2',
                                                                                        multiSelect: false,
                                                                                        flex: 0.5,
                                                                                        inputWrapCls: '',
                                                                                        style: {
                                                                                            border: 'solid 0.5px #cccccc'
                                                                                        },
                                                                                        store: Ext.create('Ext.data.Store', {
                                                                                            fields: ['name', 'type'],
                                                                                            data: [{'name': 'geom', type: "Geometry"}, {'name': 'coverage', type: "Coverage"}, {'name': 'numeric', 'name': "Numeric"}, {'name': 'text', type: "Text"}, {'name': 'boolean', type: "Boolean"}, {'name': 'other', type: "Other"}],
                                                                                        }),
                                                                                        emptyText: 'Select data type...',
                                                                                        queryMode: 'local',
                                                                                        displayField: 'type',
                                                                                        valueField: 'name',
                                                                                        margin: '5 10 0 10',
                                                                                    },
                                                                                ]
                                                                            },
                                                                            {
                                                                                xtype: 'panel',
                                                                                border: false,
                                                                                hidden: true,
                                                                                id: 'output_panel_3',
                                                                                layout: {
                                                                                    type: 'hbox',
                                                                                    pack: 'start',
                                                                                    align: 'stretch'
                                                                                },
                                                                                items: [
                                                                                    {
                                                                                        xtype: 'label',
                                                                                        html: 'Output 3',
                                                                                        margin: '15 5 0 20'
                                                                                    },
                                                                                    {
                                                                                        xtype: 'textfield',
                                                                                        margin: '5 10 10 10',
                                                                                        emptyText: 'Name',
                                                                                        id: 'output_value_3',
                                                                                        flex: 0.5,
                                                                                    },
                                                                                    {
                                                                                        xtype: 'combobox',
                                                                                        anchor: '100%',
                                                                                        id: 'output_datatype_3',
                                                                                        multiSelect: false,
                                                                                        flex: 0.5,
                                                                                        inputWrapCls: '',
                                                                                        style: {
                                                                                            border: 'solid 0.5px #cccccc'
                                                                                        },
                                                                                        store: Ext.create('Ext.data.Store', {
                                                                                            fields: ['name', 'type'],
                                                                                            data: [{'name': 'geom', type: "Geometry"}, {'name': 'coverage', type: "Coverage"}, {'name': 'numeric', 'name': "Numeric"}, {'name': 'text', type: "Text"}, {'name': 'boolean', type: "Boolean"}, {'name': 'other', type: "Other"}],
                                                                                        }),
                                                                                        emptyText: 'Select data type...',
                                                                                        queryMode: 'local',
                                                                                        displayField: 'type',
                                                                                        valueField: 'name',
                                                                                        margin: '5 10 10 10',
                                                                                    },
                                                                                ]
                                                                            },
                                                                        ]
                                                                    }
                                                                ]

                                                            }
                                                        ],
                                                        dockedItems: [
                                                            {
                                                                dock: "bottom",
                                                                xtype: "toolbar",
                                                                items: [
                                                                    {
                                                                        xtype: 'button',
                                                                        text: 'Save',
                                                                        handler: function () {
                                                                            if (Ext.getCmp("resource").getValue() == "WPS") {
                                                                                var allTrue = true;
                                                                                if (Ext.getCmp("wpsname").getValue() == "" || Ext.getCmp("wpsurl").getValue() == "") {
                                                                                    allTrue = false;
                                                                                }
                                                                                if (allTrue == true) {
                                                                                    Ext.getStore('operations').load({
                                                                                        params: {
                                                                                            url: Ext.getCmp("wpsurl").getValue(),
                                                                                            name: Ext.getCmp("wpsname").getValue()
                                                                                        },
                                                                                        callback: function (records) {
                                                                                            WorkflowApp.app.wkfCtrl.addWPSprocess(records, Ext.getCmp("wpsname").getValue());
                                                                                            WorkflowApp.app.wkfCtrl.wpsServers.push({
                                                                                                type: 'WPS',
                                                                                                url: Ext.getCmp("wpsurl").getValue(),
                                                                                                name: Ext.getCmp("wpsname").getValue()
                                                                                            });
                                                                                            Ext.getCmp("gridWPS").store.loadRawData(WorkflowApp.app.wkfCtrl.wpsServers, false);
                                                                                            Ext.getCmp("wps_form").hide();
                                                                                            Ext.getCmp("wps_form").destroy();
                                                                                            Ext.Msg.alert('Success', 'WPS processes added to your process list!', Ext.emptyFn);
                                                                                        }
                                                                                    });
                                                                                } else {
                                                                                    Ext.Msg.alert('Error', 'Ensure all marked fields are filled!', Ext.emptyFn);
                                                                                }

                                                                            } else {
                                                                                var inputs = [];
                                                                                var allTrue = true;
                                                                                for (var i = 0; i < parseInt(Ext.getCmp("inputparameterCount").getValue()); i++) {
                                                                                    inputs.push({
                                                                                        id: i,
                                                                                        identifier: Ext.getCmp("input_value_" + (i + 1)).getValue(),
                                                                                        name: Ext.getCmp("input_value_" + (i + 1)).getValue(),
                                                                                        type: Ext.getCmp("input_datatype_" + (i + 1)).getValue(),
                                                                                        description: "Input parameter",
                                                                                        optional: false,
                                                                                        url: "",
                                                                                        value: ""
                                                                                    });
                                                                                    if (Ext.getCmp("input_datatype_" + (i + 1)).getValue() == "" || Ext.getCmp("input_value_" + (i + 1)).getValue() == "") {
                                                                                        allTrue = false;
                                                                                    }
                                                                                }
                                                                                var outputs = [];
                                                                                for (var i = 0; i < parseInt(Ext.getCmp("outputparameterCount").getValue()); i++) {
                                                                                    outputs.push({
                                                                                        id: i,
                                                                                        identifier: Ext.getCmp("output_value_" + (i + 1)).getValue(),
                                                                                        name: Ext.getCmp("output_value_" + (i + 1)).getValue(),
                                                                                        value: "",
                                                                                        type: Ext.getCmp("output_datatype_" + (i + 1)).getValue(),
                                                                                        description: Ext.getCmp("output_value_" + (i + 1)).getValue(),
                                                                                    });
                                                                                    if (Ext.getCmp("output_datatype_" + (i + 1)).getValue() == "" || Ext.getCmp("output_value_" + (i + 1)).getValue() == "") {
                                                                                        allTrue = false;
                                                                                    }
                                                                                }
                                                                                if (Ext.getCmp("wpsname").getValue() == "" || Ext.getCmp("wpsurl").getValue() == "" || Ext.getCmp("rest_description").getValue() == "") {
                                                                                    allTrue = false;
                                                                                }
                                                                                if (allTrue == true) {
                                                                                    var operations = {
                                                                                        name: Ext.getCmp("wpsname").getValue(),
                                                                                        operation: [
                                                                                            {
                                                                                                id: 0,
                                                                                                metadata: {
                                                                                                    longname: Ext.getCmp("wpsname").getValue(),
                                                                                                    label: Ext.getCmp("wpsname").getValue(),
                                                                                                    url: Ext.getCmp("wpsurl").getValue(),
                                                                                                    resource: Ext.getCmp("rosource").getValue(),
                                                                                                    description: Ext.getCmp("rest_description").getValue(),
                                                                                                    inputparametercount: Ext.getCmp("inputparameterCount").getValue(),
                                                                                                    outputparametercount: Ext.getCmp("outputparameterCount").getValue(),
                                                                                                    position: []
                                                                                                },
                                                                                                inputs: inputs,
                                                                                                outputs: outputs
                                                                                            }
                                                                                        ],
                                                                                        leaf: true
                                                                                    };
                                                                                    WorkflowApp.app.wkfCtrl.addRESTprocesses(operations);
                                                                                    WorkflowApp.app.wkfCtrl.wpsServers.push({
                                                                                        type: 'REST',
                                                                                        url: Ext.getCmp("wpsurl").getValue(),
                                                                                        name: Ext.getCmp("wpsname").getValue()
                                                                                    });
                                                                                    Ext.getCmp("gridWPS").store.loadRawData(WorkflowApp.app.wkfCtrl.wpsServers, false);
                                                                                    Ext.getCmp("wps_form").hide();
                                                                                    Ext.getCmp("wps_form").destroy();
                                                                                    Ext.Msg.alert('Success', 'REST process added to your process list!', Ext.emptyFn);
                                                                                } else {
                                                                                    Ext.Msg.alert('Error', 'Ensure all marked fields are filled!', Ext.emptyFn);
                                                                                }

                                                                            }
                                                                        }
                                                                    }
                                                                ]
                                                            }
                                                        ],
                                                        listeners: {
                                                            restore: function (win) {
                                                                win.center();
                                                            },
                                                            resize: function (win) {
                                                                win.center();
                                                            }
                                                        }
                                                    }).show()
                                                }
                                            }
                                        ]
                                    }
                                ],
                                listeners: {
                                    itemcontextmenu: function (a, b, c, d, e) {
                                        e.stopEvent();
                                        var xy = e.getXY();
                                        new Ext.menu.Menu({
                                            items: [
                                                {
                                                    text: 'Remove',
                                                    handler: function () {

                                                    }
                                                }
                                            ]
                                        }).showAt(xy)
                                    }
                                }
                            }
                        ]
                    },
                    {
                        xtype: 'panel',
                        border: false,
                        margin: 5,
                        flex: 0.5,
                        layout: {
                            type: 'vbox',
                            pack: 'position',
                            align: 'stretch'
                        },
                        items: [
                            {
                                xtype: 'label',
                                flex: 0.1,
                                html: '<span>Data services</span>'
                            },
                            {
                                xtype: 'grid',
                                border: false,
                                flex: 0.9,
                                id: 'gridWFS',
                                store: Ext.create('Ext.data.Store', {
                                    fields: ['name', 'url'],
                                    data: WorkflowApp.app.wkfCtrl.wfsServers,
                                }),
                                columns: [
                                    {
                                        sortable: false,
                                        hideable: false,
                                        header: 'Name',
                                        flex: 0.3,
                                        renderer: function (value, metaData, record, rowIdx, colIdx, store, view) {
                                            var html = record.get('name');
                                            return html;
                                        }
                                    },
                                    {
                                        flex: 0.7,
                                        sortable: false,
                                        hideable: false,
                                        header: 'Url',
                                        renderer: function (value, metaData, record, rowIdx, colIdx, store, view) {
                                            var html = record.get('url');
                                            return html;
                                        }
                                    }
                                ],
                                dockedItems: [
                                    {
                                        dock: "bottom",
                                        xtype: "toolbar",
                                        items: [
                                            {
                                                xtype: 'button',
                                                text: 'Add',
                                                id: "btnAddWFS",
                                                handler: function () {
                                                    Ext.create({
                                                        xtype: 'configform',
                                                        id: 'wfs_form',
                                                        title: 'Data Service',
                                                        height: 350,
                                                        width: 400,
                                                        modal: true,
                                                        layout: {
                                                            type: 'vbox',
                                                            pack: 'position',
                                                            align: 'stretch'
                                                        },
                                                        bodyPadding: '0 0 10 0',
                                                        items: [
                                                            {
                                                                xtype: 'label',
                                                                html: 'Name',
                                                                margin: '10 10 0 10'
                                                            },
                                                            {
                                                                xtype: 'combobox',
                                                                anchor: '100%',
                                                                id: 'wcs_wfs',
                                                                multiSelect: false,
                                                                inputWrapCls: '',
                                                                style: {
                                                                    border: 'solid 0.5px #cccccc'
                                                                },
                                                                store: Ext.create('Ext.data.Store', {
                                                                    fields: ['id', 'type'],
                                                                    data: [{id: 'WFS', type: "WFS"}, {id: 'WCS', type: "WCS"}],
                                                                }),
                                                                queryMode: 'local',
                                                                displayField: 'type',
                                                                valueField: 'type',
                                                                margin: '10 10 0 10',
                                                                listeners: {
                                                                    afterrender: function () {
                                                                        this.setValue(this.store.getAt(0).get('id'));
                                                                    }
                                                                }
                                                            },
                                                            {
                                                                xtype: 'label',
                                                                html: 'Name',
                                                                margin: '10 10 0 10'
                                                            },
                                                            {
                                                                xtype: 'textfield',
                                                                margin: '10 10 0 10',
                                                                emptyText: 'Local Geoserver',
                                                                id: 'wfsname',
                                                            },
                                                            {
                                                                xtype: 'label',
                                                                html: 'Enter URL',
                                                                margin: '10 10 0 10'
                                                            },
                                                            {
                                                                xtype: 'textfield',
                                                                margin: '10 10 10 10',
                                                                emptyText: 'http://130.89.221.193:85/geoserver/ows?',
                                                                id: 'wfsurl',
                                                                value: "http://130.89.221.193:85/geoserver/ows?"
                                                            }
                                                        ],
                                                        dockedItems: [
                                                            {
                                                                dock: "bottom",
                                                                xtype: "toolbar",
                                                                items: [
                                                                    {
                                                                        xtype: 'button',
                                                                        text: 'Save',
                                                                        handler: function () {
                                                                            if (Ext.getCmp("wcs_wfs").getValue() == "WFS") {
                                                                                Ext.getStore('features').load({
                                                                                    params: {
                                                                                        url: Ext.getCmp("wfsurl").getValue(),
                                                                                        name: Ext.getCmp("wfsname").getValue()
                                                                                    },
                                                                                    callback: function (records) {
                                                                                        WorkflowApp.app.wkfCtrl.addWFSfeatures(records, Ext.getCmp("wfsname").getValue() + '(WFS)');
                                                                                        WorkflowApp.app.wkfCtrl.wfsServers.push({
                                                                                            url: Ext.getCmp("wfsurl").getValue(),
                                                                                            name: Ext.getCmp("wfsname").getValue()
                                                                                        });
                                                                                        Ext.getCmp("gridWFS").store.loadRawData(WorkflowApp.app.wkfCtrl.wfsServers, false);
                                                                                        Ext.getCmp("wfs_form").hide();
                                                                                        Ext.getCmp("wfs_form").destroy();
                                                                                        Ext.Msg.alert('Success', 'New features added to your WFS list!', Ext.emptyFn);
                                                                                    }
                                                                                });
                                                                            } else {
                                                                                Ext.getStore('coverages').load({
                                                                                    params: {
                                                                                        url: Ext.getCmp("wfsurl").getValue(),
                                                                                        name: Ext.getCmp("wfsname").getValue()
                                                                                    },
                                                                                    callback: function (records) {
                                                                                        WorkflowApp.app.wkfCtrl.addWFSfeatures(records, Ext.getCmp("wfsname").getValue() + '(WCS)');
                                                                                        WorkflowApp.app.wkfCtrl.wfsServers.push({
                                                                                            url: Ext.getCmp("wfsurl").getValue(),
                                                                                            name: Ext.getCmp("wfsname").getValue()
                                                                                        });
                                                                                        Ext.getCmp("gridWFS").store.loadRawData(WorkflowApp.app.wkfCtrl.wfsServers, false);
                                                                                        Ext.getCmp("wfs_form").hide();
                                                                                        Ext.getCmp("wfs_form").destroy();
                                                                                        Ext.Msg.alert('Success', 'New coverafes added to your WCS list!', Ext.emptyFn);
                                                                                    }
                                                                                });
                                                                            }

                                                                        }
                                                                    }
                                                                ]
                                                            }
                                                        ],
                                                        listeners: {

                                                        }
                                                    }).show()
                                                }
                                            }
                                        ]
                                    }
                                ],
                            }
                        ]
                    }
                ],
                listeners: {
                    restore: function (win) {
                        win.center();
                    }
                }
            }).show();
        });
        Ext.Ajax.request({
            url: 'app/api/test.json',
            method: 'post',
            success: function (response) {
                var result = JSON.parse(response.responseText);
                WorkflowApp.app.wkfCtrl.importFromJSON(response.responseText);
            }
        });
    },
    importFromJSON: function (response) {
        var json = JSON.parse(response)["workflows"];
        var operations = json[0].operations;
        var connections = json[0].connections;
        var svg = d3.selectAll("#WorkflowPanel-innerCt svg");
        // Handle the ID of operations during import to ensure operations dont share IDs
        // In case the workflow window is not empty, then assign news ID to the imported operations
        var newOperIDS = {};
        if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length > 0) {
            var operIDs = [];
            for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; i++) {
                operIDs.push(parseInt(WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].id));
            }
            var id = 0;
            if (operIDs.length > 0) {
                id = this.getArrayMax(operIDs) + 1;
            }
            for (var i = 0; i < operations.length; i++) {
                newOperIDS[operations[i].id] = id;
                operations[i].id = id;
                id = id + 1;
            }
        }
        // In case operation does not have a coordinate, give it random position
        for (var i = 0; i < operations.length; i++) {
            if (!operations[i].metadata.hasOwnProperty('position')) {
                operations[i].metadata.position = [
                    i * 50, i * 100
                ];
            }
        }
		
		if (Ext.getCmp("workflow_name")) {
			Ext.getCmp("workflow_name").setValue(json[0]["metadata"]["longname"]);
		}
		if (Ext.getCmp("workflow_name2")) {
			Ext.getCmp("workflow_name2").setValue(json[0]["metadata"]["longname"]);
		}
        // Draw the connection lines
        for (var j = 0; j < connections.length; j++) {
            svg.append("svg:defs").append("svg:marker")
                    .attr("id", "triangle")
                    .attr("viewBox", "0 0 10 10")
                    .attr("refX", 0)
                    .attr("refY", 5)
                    .attr("markerWidth", 5)
                    .attr("markerHeight", 4)
                    .attr("orient", "auto")
                    .append("path")
                    .attr("d", "M 0 0 L 10 5 L 0 10 z")
                    .style("fill", "blue");
            var lineID = "p" + connections[j].fromOperationID + "_" + connections[j].toOperationID;
            if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length > 0) {
                lineID = "p" + newOperIDS[connections[j].fromOperationID] + "_" + newOperIDS[connections[j].toOperationID];
                connections[j].fromOperationID = newOperIDS[connections[j].fromOperationID];
                connections[j].toOperationID = newOperIDS[connections[j].toOperationID];
            }
            var line = svg.append("line").attr("id", lineID).attr("stroke-width", 1).attr("stroke", "blue").on("click", function () {
                d3.select(this).transition().style("stroke-width", 3);
            });
            line.attr("marker-end", "url(#triangle)");
            for (var i = 0; i < operations.length; i++) {
                var boxW = 250;
                var boxH = 150;
                if (operations[i].inputs.length > 4) {
                    boxH = 200;
                }
                if (operations[i].inputs.length < 3) {
                    boxH = 120;
                }
                if (operations[i].id == connections[j].fromOperationID) {
                    line.attr("x1", parseInt(operations[i].metadata.position[0]) + boxW / 2);
                    line.attr("y1", parseInt(operations[i].metadata.position[1]) + boxH);
                }
            }
            for (var i = 0; i < operations.length; i++) {
                var boxW = 250;
                if (operations[i].id == connections[j].toOperationID) {
                    line.attr("x2", parseInt(operations[i].metadata.position[0]) + boxW / 2);
                    line.attr("y2", parseInt(operations[i].metadata.position[1]));
                }
            }
            WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections.push(connections[j]);
        }
        // Draw the operation boxes
        for (var i = 0; i < operations.length; i++) {
            var text = operations[i].metadata.longname;
            WorkflowApp.app.wkfCtrl.createOperation(operations[i], parseInt(operations[i].metadata.position[0]), parseInt(operations[i].metadata.position[1]));
        }
        // Change the color of input parameters with connections
        for (var i = 0; i < operations.length; i++) {
            for (var j = 0; j < operations[i].inputs.length; j++) {
                if (operations[i].inputs[j].value == "") {
                    d3.select("#input_" + i + "_" + j).style("color", "#00000");
                } else {
                    d3.select("#input_" + i + "_" + j).style("color", "#006600");
                }
            }
        }

        for (var j = 0; j < connections.length; j++) {
            for (var i = 0; i < operations.length; i++) {
                if (operations[i].id == connections[j].toOperationID) {
                    d3.select("#input_" + parseInt(operations[i].id) + "_" + connections[j].toParameterID).style("color", "#006600");
                }
            }
        }
        WorkflowApp.app.wkfCtrl.workflows["workflows"][0]["metadata"]["longname"] = json[0]["metadata"]["longname"];
		Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</pre></span>");
		
    },
    createOperation: function (operation, x, y) {
        var id = 0;
        var operIDs = [];
        for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; i++) {
            operIDs.push(parseInt(WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].id));
        }

        if (operIDs.length > 0) {
            id = this.getArrayMax(operIDs) + 1;
        }
        var text = id + " : " + operation.metadata.longname;
        var data = [[x, y]];
        var svg = d3.selectAll("#WorkflowPanel-innerCt svg").append('g');
        WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.push({
            id: id,
            metadata: {
                longname: operation.metadata.longname,
                label: operation.metadata.label,
                url: operation.metadata.url,
                resource: operation.metadata.resource,
                description: operation.metadata.description,
                inputparametercount: operation.metadata.inputparametercount,
                outputparametercount: operation.metadata.outputparametercount,
                position: []
            },
            inputs: operation.inputs,
            outputs: operation.outputs
        });
        var boxW = 250;
        var boxH = 150;
        if (operation.inputs.length > 4) {
            boxH = 200;
        }
        if (operation.inputs.length < 3) {
            boxH = 120;
        }

        var indexLastOperation = WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length - 1;
        WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[indexLastOperation].metadata.position = [x, y];
        var datetime = id;
        var drag = d3.behavior.drag()
                .origin(function (d) {
                    return {x: d[0], y: d[1]};
                })
                .on("drag", function (d, i) {
                    d[0] = d3.event.x, d[1] = d3.event.y;
                    d3.select("#rect_" + id).attr("transform", "translate(" + d + ")");
                    d3.select("#tooltip" + id).style("left", (d[0] + boxW + 10) + "px");
                    d3.select("#tooltip" + id).style("top", (d[1] + 5) + "px");
                    d3.select("#concircle" + id).attr("transform", "translate(" + [d[0] + boxW / 2, d[1] + boxH] + ")");
                    d3.select("#tocircle" + id).attr("transform", "translate(" + [d[0] + boxW / 2, d[1]] + ")");
                    d3.select("#text" + id).attr("transform", "translate(" + [d[0] + 10, d[1] + 18] + ")");
                    d3.select("#text_inputs" + id).style("left", (d[0] + 10) + "px");
                    d3.select("#text_inputs" + id).style("top", (d[1] + 25) + "px");
                    d3.select("#operation_title" + id).attr("d", function (d) {
                        return rounded_rect(d[0], d[1], boxW, 25, 6, true, true, false, false)
                    });
                    /*d3.select("#operation_output" + id).attr("d", function (d) {
                     return rounded_rect(d[0], d[1] + boxH - 30, boxW, 30, 6, false, false, true, true)
                     });*/

                    for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections.length; i++) {
                        if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[i].toOperationID == id) {
                            d3.select("#p" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[i].fromOperationID + "_" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[i].toOperationID).attr("x2", d[0] + boxW / 2);
                            d3.select("#p" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[i].fromOperationID + "_" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[i].toOperationID).attr("y2", d[1]);
                        }
                        if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[i].fromOperationID == id) {
                            d3.select("#p" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[i].fromOperationID + "_" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[i].toOperationID).attr("x1", d[0] + boxW / 2);
                            d3.select("#p" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[i].fromOperationID + "_" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[i].toOperationID).attr("y1", d[1] + boxH);
                        }
                    }
                    for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; i++) {
                        if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].id == id) {
                            WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].metadata.position = [d[0] + boxW / 2, d[1]];
                            break;
                        }
                    }
                    indexLastOperation = WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length - 1;
                    Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</pre></span>");
                });
        var j = 0;
        var connection = {
            fromOperationID: null,
            toOperationID: null,
            fromParameterID: null,
            toParameterID: null
        };
        // Drag event for the connecting line
        var connect = d3.behavior.drag()
                .origin(function (d) {
                    return {x: d[0], y: d[1]};
                })
                .on("dragstart", function (d, i, e) {})
                .on("drag", function (d, i, e) {
                    j = j + 1;
                    if (j == 1) {
                        svg.append("svg:defs").append("svg:marker")
                                .attr("id", "triangle")
                                .attr("viewBox", "0 0 10 10")
                                .attr("refX", 0)
                                .attr("refY", 5)
                                .attr("markerWidth", 5)
                                .attr("markerHeight", 4)
                                .attr("orient", "auto")
                                .append("path")
                                .attr("d", "M 0 0 L 10 5 L 0 10 z")
                                .style("fill", "blue");
                        var line = svg.append("line").attr("id", "toline_" + datetime).attr("stroke-width", 1).attr("stroke", "blue").on("click", function () {
                            d3.select(this).transition().style("stroke-width", 3);
                        });
                        line.attr("marker-end", "url(#triangle)");
                        line.attr("x1", d3.event.x + boxW / 2);
                        line.attr("y1", d3.event.y + boxH);
                        line.attr("x2", d3.event.x + boxW / 2);
                        line.attr("y2", d3.event.y + boxH);
                        var circle = document.getElementById("toline_" + datetime),
                                cx = circle.getAttribute('x1'),
                                cy = circle.getAttribute('y1');
                    } else {
                        d3.select("#toline_" + datetime).attr("x2", d3.event.x + (boxW / 2));
                        d3.select("#toline_" + datetime).attr("y2", d3.event.y + boxH);
                        var elem = document.elementFromPoint(event.pageX, event.pageY);
                        if (elem.getAttribute('id') !== null && elem.getAttribute('id').indexOf("tocircle") >= 0) {
                            d3.select("#" + elem.getAttribute('id')).transition().style("stroke", "red").style("stroke-width", 1).style("fill-opacity", 0.5).transition(200).style("stroke", "black").style("stroke-width", 0.5).style("fill-opacity", 1);
                        }
                    }
                })
                .on("dragend", function (a, b) {
                    var circle = document.getElementById("toline_" + datetime),
                            cx = parseInt(circle.getAttribute('x2')) + parseInt(Ext.getCmp("WorkflowPanel").getX()),
                            cy = parseInt(circle.getAttribute('y2')) + parseInt(Ext.getCmp("WorkflowPanel").getY());
                    var elem = document.elementFromPoint(event.pageX, event.pageY);
                    if (elem.getAttribute('id') !== null && elem.getAttribute('id').indexOf("tocircle") >= 0) {
                        connection.fromOperationID = id;
                        connection.toOperationID = parseInt(elem.getAttribute('id').match(/[0-9]+/g)[0]);
                        //connection.id = "p" + id + "_" + elem.getAttribute('id').match(/[0-9]+/g)[0];
                        Ext.fly(document.body).on("click", function (e) {
                            if (!Ext.fly(e.getTarget()).findParent("div#WorkflowPanel-innerCt svg line")) {
                                d3.select("#" + "p" + id + "_" + elem.getAttribute('id').match(/[0-9]+/g)[0]).transition().style("stroke-width", 1);
                            } else {
                                if (Ext.fly(e.getTarget()).dom.getAttribute('id') !== "p" + id + "_" + elem.getAttribute('id').match(/[0-9]+/g)[0]) {
                                    d3.select("#" + "p" + id + "_" + elem.getAttribute('id').match(/[0-9]+/g)[0]).transition().style("stroke-width", 1);
                                }
                            }
                        });
                        var fromData = [];
                        for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; i++) {
                            if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].id == id) {
                                fromData = WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].outputs;
                                break;
                            }
                        }
                        var toData = [];
                        for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; i++) {
                            if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].id == parseInt(elem.getAttribute('id').match(/[0-9]+/g)[0])) {
                                toData = WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].inputs;
                                break;
                            }
                        }
                        Ext.create({
                            xtype: 'operationform',
                            id: 'change_inputs',
                            renderTo: 'WorkflowPanel',
                            title: "",
                            closable: false,
                            height: 220,
                            width: 300,
                            layout: {
                                type: 'vbox',
                                pack: 'position',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'label',
                                    html: 'Outgoing Parameter',
                                    margin: '5 5',
                                },
                                {
                                    xtype: 'combobox',
                                    anchor: '100%',
                                    id: 'from_ParameterID',
                                    multiSelect: false,
                                    inputWrapCls: '',
                                    style: {
                                        border: 'solid 0.5px #cccccc'
                                    },
                                    store: Ext.create('Ext.data.Store', {
                                        fields: ['id', 'type'],
                                        data: fromData,
                                    }),
                                    emptyText: 'Select output parameter...',
                                    queryMode: 'local',
                                    displayField: 'type',
                                    valueField: 'id',
                                    margin: '0 5',
                                    listeners: {
                                        afterrender: function () {
                                            var combo = Ext.getCmp("from_ParameterID")
                                            combo.setValue(combo.store.getAt(0).get('id'));
                                        }
                                    }
                                },
                                {
                                    xtype: 'label',
                                    html: 'Incoming Parameter',
                                    margin: '5 5',
                                },
                                {
                                    xtype: 'combobox',
                                    anchor: '100%',
                                    id: 'to_ParameterID',
                                    multiSelect: false,
                                    inputWrapCls: '',
                                    style: {
                                        border: 'solid 0.5px #cccccc'
                                    },
                                    store: Ext.create('Ext.data.Store', {
                                        fields: ['id', 'type'],
                                        data: toData,
                                    }),
                                    emptyText: 'Select input parameter...',
                                    queryMode: 'local',
                                    displayField: 'type',
                                    valueField: 'id',
                                    margin: '0 5',
                                    listeners: {
                                        afterrender: function () {
                                            var combo = Ext.getCmp("to_ParameterID")
                                            combo.setValue(combo.store.getAt(0).get('id'));
                                        }
                                    }
                                }
                            ],
                            dockedItems: [{
                                    dock: "bottom",
                                    xtype: "toolbar",
                                    items: [
                                        {
                                            xtype: 'button',
                                            text: 'Apply',
                                            handler: function () {
                                                if (Ext.getCmp("to_ParameterID").getValue() + "" == "") {
                                                    Ext.Msg.alert('Error', 'Select input and output parameters.', Ext.emptyFn);
                                                } else {
                                                    var recordTo = Ext.getCmp("to_ParameterID").findRecord(Ext.getCmp("to_ParameterID").valueField, Ext.getCmp("to_ParameterID").getValue());
                                                    var recordFrom = Ext.getCmp("from_ParameterID").findRecord(Ext.getCmp("from_ParameterID").valueField, Ext.getCmp("from_ParameterID").getValue());
                                                    if (recordTo.data.type == recordFrom.data.type) {
                                                        document.getElementById("toline_" + datetime).id = "p" + id + "_" + elem.getAttribute('id').match(/[0-9]+/g)[0];
                                                        var index = Ext.getCmp("from_ParameterID").getValue();
                                                        connection.fromParameterID = index;
                                                        var index = Ext.getCmp("to_ParameterID").getValue();
                                                        connection.toParameterID = index;
                                                        for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; i++) {
                                                            if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].id == parseInt(elem.getAttribute('id').match(/[0-9]+/g)[0])) {
                                                                WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].inputs[index].value = id + "_to_" + index;
                                                            }
                                                        }

                                                        Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</pre></span>");
                                                        d3.select("#input_" + parseInt(elem.getAttribute('id').match(/[0-9]+/g)[0]) + "_" + index).style("color", "#006600");
                                                        Ext.getCmp("change_inputs").hide();
                                                        Ext.getCmp('change_inputs').destroy();
                                                        WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections.push(connection);
                                                        connection = {
                                                            fromOperationID: null,
                                                            toOperationID: null,
                                                            fromParameterID: null,
                                                            toParameterID: null
                                                        };
                                                    } else {
                                                        Ext.Msg.alert('Error', 'Incorrect mapping of output and input parameters.', Ext.emptyFn);
                                                    }
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'button',
                                            text: 'Cancel',
                                            handler: function () {
                                                d3.select("#toline_" + datetime).remove();
                                                Ext.getCmp("change_inputs").hide();
                                                Ext.getCmp('change_inputs').destroy();
                                            }
                                        }
                                    ]
                                }
                            ]
                        }).show();
                    } else {
                        d3.select("#toline_" + datetime).remove();
                    }
                    j = 0;
                    Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</pre></span>");
                });
        d3.select("#WorkflowPanel-innerCt").append("div").attr("class", "tooltips").attr("id", "tooltip" + id).style("position", "absolute").style("z-index", "10").transition().style("opacity", 0);
        var inputs = operation.inputs;
        var inputsHtml = "<p><b>Inputs</b></p>";
        for (var i = 0; i < inputs.length; i++) {
            inputsHtml += "<p id='input_" + id + "_" + i + "'>" + (i) + ". " + inputs[i].name + "(" + inputs[i].type + ")</p>";
        }
        inputsHtml += "<p><b>Outputs</b></p>";
        for (var i = 0; i < operation.outputs.length; i++) {
            inputsHtml += "<p id='output_" + id + "_" + i + "'>" + (i) + ". " + operation.outputs[i].type + "</p>";
        }

        d3.select("#WorkflowPanel-innerCt")
                .append("div")
                .attr("class", "text_inputs")
                .style("width", (boxW - 13) + "px")
                .style("height", (boxH - 32) + "px")
                .style("overflow", "auto")
                .attr("id", "text_inputs" + id)
                .style("position", "absolute")
                .transition().duration(200).style("opacity", 1);
        d3.select("#text_inputs" + id)
                .html(inputsHtml)
                .style("left", (data[0][0] + 10) + "px")
                .style("top", (data[0][1] + 25) + "px");
        var rect = svg.selectAll("rect")
                .data(data)
                .enter();
        rect.append("path")
                .attr("class", "xxx-box")
                .attr("id", "operation_title" + id)
                .attr("d", function (d) {
                    return rounded_rect(d[0], d[1], boxW, 25, 6, true, true, false, false)
                })
                .style("fill", "ffff99")
                .style("fill-opacity", 1)
                .style("stroke", "blue")
                .style("stroke-width", 0.5)
                .on("click", function clicked(d, i) {
                    if (d3.event.defaultPrevented)
                        return; // dragged
                    onClicked(d);
                })
                .call(drag);
        var texts = svg.selectAll("text")
                .data(data)
                .enter();
        texts.append("text")
                .attr("id", "text" + id)
                .attr("class", "operation_name")
                .attr("transform", function (d) {
                    return "translate(" + [d[0] + 10, d[1] + 18] + ")";
                })
                .text(text);
        //rect.append("path").attr("id", "operation_output" + id).attr("d", function (d) {return rounded_rect(d[0], d[1] + boxH - 30, boxW, 30, 6, false, false, true, true)}).style("fill", "ffff99").style("fill-opacity", 1).style("stroke", "blue").style("stroke-width", 0.5).on("click", function clicked(d, i) {});

        Ext.get(document.body).on("click", function (e) {
            if (!Ext.get(e.getTarget()).findParent("div#WorkflowPanel-innerCt svg rect")) {
                d3.select("#tooltip" + id).transition().duration(200).style("opacity", 0);
                d3.select("#rect_" + id).transition().style("stroke-width", 0.5);
            } else {
                if (Ext.get(e.getTarget()).dom.getAttribute('id') !== "rect_" + id) {
                    d3.select("#tooltip" + id).transition().duration(200).style("opacity", 0);
                    d3.select("#rect_" + id).transition().style("stroke-width", 0.5);
                }
            }
        });
        rect.append("rect")
                .attr("id", "rect_" + id)
                .attr("class", "xxx-box")
                .attr("transform", function (d) {
                    return "translate(" + d + ")";
                })
                .attr("width", boxW)
                .attr("height", boxH)
                .style("fill", "#ffff99")
                .style("fill-opacity", 0.3)
                .attr("rx", 6)
                .attr("ry", 6)
                .style("stroke", "blue")
                .style("stroke-width", 0.5)
                .on("click", function clicked(d, i) {
                    if (d3.event.defaultPrevented)
                        return; // dragged
                    onClicked(d);
                }).call(drag);
        var circle = svg.selectAll("circle")
                .data(data)
                .enter();
        circle.append("circle")
                .attr("id", "concircle" + id)
                .attr("class", "connectCircle")
                .attr("transform", function (d) {
                    return "translate(" + [d[0] + boxW / 2, d[1] + boxH] + ")";
                })
                .attr("r", 10)
                .style("fill", "blue")
                .style("fill-opacity", 1)
                .style("stroke", "#000")
                .style("stroke-width", 0.5)
                .on("click", function clicked(d, i) {
                }).call(connect);
        circle.append("circle")
                .attr("id", "tocircle" + id)
                .attr("transform", function (d) {
                    return "translate(" + [d[0] + boxW / 2, d[1]] + ")";
                })
                .attr("r", 10)
                .attr("inwards", [])
                .style("fill", "white")
                .style("fill-opacity", 1)
                .style("stroke", "#000")
                .style("stroke-width", 1)
                .on("click", function clicked(d, i) {
                });
        //x: x-coordinate; y: y-coordinate; w: width; h: height; r: corner radius; tl: top_left rounded?; tr: top_right rounded?; bl: bottom_left rounded?;br: bottom_right rounded?
        function rounded_rect(x, y, w, h, r, tl, tr, bl, br) {
            var retval;
            retval = "M" + (x + r) + "," + y;
            retval += "h" + (w - 2 * r);
            if (tr) {
                retval += "a" + r + "," + r + " 0 0 1 " + r + "," + r;
            } else {
                retval += "h" + r;
                retval += "v" + r;
            }
            retval += "v" + (h - 2 * r);
            if (br) {
                retval += "a" + r + "," + r + " 0 0 1 " + -r + "," + r;
            } else {
                retval += "v" + r;
                retval += "h" + -r;
            }
            retval += "h" + (2 * r - w);
            if (bl) {
                retval += "a" + r + "," + r + " 0 0 1 " + -r + "," + -r;
            } else {
                retval += "h" + -r;
                retval += "v" + -r;
            }
            retval += "v" + (2 * r - h);
            if (tl) {
                retval += "a" + r + "," + r + " 0 0 1 " + r + "," + -r;
            } else {
                retval += "v" + -r;
                retval += "h" + r;
            }
            retval += "z";
            return retval;
        }

        // Handle event when an operation box is clicked
        function onClicked(d) {
            d3.select("#rect_" + id).transition().style("stroke-width", 2);
            d3.select("#concircle" + id).transition().style("stroke", "blue").style("stroke-width", 1).transition().style("stroke", "#000").style("stroke-width", 0.5);
            d3.select("#tocircle" + id).transition().style("stroke", "blue").style("stroke-width", 1).transition().style("stroke", "#000").style("stroke-width", 0.5);
            d3.select("#tooltip" + id).transition().duration(200).style("opacity", 1.9);
            d3.select("#tooltip" + id).html(
                    "<input id=" + "trash-button" + id + " type=" + "image" + " title=" + "Delete" + " src=" + "img/trash-icon.png" + " alt=" + "trash" + " style=" + "width:25px;" + " >" + "<br>"
                    + "<input id=" + "property-button" + id + " type=" + "image" + " title=" + "Property" + " src=" + "img/settingsicon.png" + " alt=" + "trash" + " style=" + "width:25px;" + " >" + "&nbsp")
                    .style("left", (d[0] + boxW + 10) + "px")
                    .style("top", (d[1] + 5) + "px");
            // Event when the delete icon is clicked
            d3.select("input#trash-button" + id).on("click", function () {
                if (d3.event.defaultPrevented)
                    return; // dragged
                d3.select("#tooltip" + id).transition().duration(200).style("opacity", 0);
                d3.select("#rect_" + id).transition().style("stroke-width", 0.5);
                d3.selectAll("#rect_" + id).remove();
                d3.selectAll("#tooltip" + id).remove();
                d3.selectAll("#tooltip" + id).remove();
                d3.selectAll("#concircle" + id).remove();
                d3.selectAll("#tocircle" + id).remove();
                d3.selectAll("#text" + id).remove();
                d3.selectAll("#text_inputs" + id).remove();
                d3.selectAll("#operation_title" + id).remove();
                d3.selectAll("#operation_output" + id).remove();
                for (var m = 0; m < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; m++) {
                    if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[m].id == id) {
                        WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.splice(m, 1);
                    }
                }
                var conns = [];
                for (var m = 0; m < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections.length; m++) {
                    if (id == WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[m].toOperationID) {
                        d3.selectAll("#p" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[m].fromOperationID + "_" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[m].toOperationID).remove();
                    } else if (id == WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[m].fromOperationID) {
                        d3.selectAll("#p" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[m].fromOperationID + "_" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[m].toOperationID).remove();
                        // Empty the value field of the operation where the deleted operation was connecting to
                        for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; i++) {
                            if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].id == WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[m].toOperationID) {
                                WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].inputs[WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[m].toParameterID].value = "";
                                d3.select("#input_" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[m].toOperationID + "_" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[m].toParameterID).style("color", "#000000");
                            }
                        }
                        WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[m];
                    } else {
                        conns.push(WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections[m]);
                    }
                }
                WorkflowApp.app.wkfCtrl.workflows["workflows"][0].connections = conns;
                Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</pre></span>");
            });
            // Event when the property icon of the operation box is clicked
            d3.select("input#property-button" + id).on("click", function () {
                // Window for Operation property
                var index = 0;
                for (var j = 0; j < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; j++) {
                    if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].id == id) {
                        index = j;
                        break;
                    }
                }
                Ext.create({
                    xtype: 'operationform',
                    id: 'operation_form_' + id,
                    title: operation.metadata.label,
                    height: 600,
                    width: 500,
                    closable: false,
                    modal: true,
                    layout: {
                        type: 'vbox',
                        pack: 'position',
                        align: 'stretch'
                    },
                    bodyPadding: '0 0 10 0',
                    autoScroll: 'true',
                    overflowY: 'auto',
                    items: [
                        {
                            xtype: 'label',
                            html: '<span>Endpoint</span>',
                            margin: '10 10 0 10',
                        },
                        {
                            xtype: 'combobox',
                            store: Ext.create('Ext.data.Store', {
                                fields: ['name', 'url'],
                                data: WorkflowApp.app.wkfCtrl.wpsServers,
                            }), anchor: '100%',
                            id: "url_" + id,
                            multiSelect: false,
                            inputWrapCls: '',
                            style: {
                                border: 'solid 0.5px #cccccc'
                            },
                            queryMode: 'local',
                            displayField: 'url',
                            valueField: 'url',
                            margin: '10 10 0 10',
                            listeners: {
                                select: function (a, b, c) {
                                    WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].metadata.resource = b.data.type;
                                    Ext.getStore('operations').load({
                                        params: {
                                            name: b.data.type,
                                            url: this.getValue()
                                        },
                                        callback: function (records) {

                                        }
                                    });
                                },
                                afterrender: function () {
                                    this.setValue(WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].metadata.url);
                                    Ext.getStore('operations').load({
                                        params: {
                                            name: WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].metadata.resource,
                                            url: this.getValue()
                                        },
                                        callback: function (records) {

                                        }
                                    });
                                }
                            }
                        },
                        {
                            xtype: 'combobox',
                            store: 'operations',
                            multiSelect: false,
                            inputWrapCls: '',
                            style: {
                                border: 'solid 0.5px #cccccc'
                            },
                            queryMode: 'local',
                            displayField: 'id',
                            valueField: 'id',
                            margin: '10 10 0 10',
                            listeners: {
                                select: function (a, b) {
                                    Ext.getCmp('operation_form_' + id).setTitle(this.getValue());
                                    WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].metadata.label = this.getValue();
                                    WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].metadata.description = b.data.metadata.description;
                                    WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].metadata.longname = b.data.metadata.label;
                                    d3.select("#text" + id).text(index + " : " + b.data.metadata.label);
                                    /*
                                     * Ensure that the new operation has the same input and output counts
                                     * @type WorkflowApp.app.wkfCtrlworkflows.workflows.operations.inputs.length
                                     */
                                    var inputs = b.data.inputs;
                                    var inputCount = WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].inputs.length;
                                    var operInputs = [];
                                    for (var i = 0; i < inputs.length; i++) {
                                        d3.select("#input_" + id + "_" + i).text(inputs[i].name + "(" + inputs[i].type + ")");
                                        operInputs.push({
                                            "id": i,
                                            "name": inputs[i].name,
                                            "value": WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].inputs[i].value,
                                            "url": WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].inputs[i].url,
                                            "description": WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].inputs[i].description,
                                            "type": inputs[i].type,
                                            "identifier": inputs[i].identifier,
                                            "optional": inputs[i].optional
                                        });
                                        if (i == (inputCount - 1)) {
                                            break;
                                        }
                                    }
                                    for (var i = inputs.length; i < inputCount; i++) {
                                        d3.select("#input_" + id + "_" + i).remove();
                                    }
                                    WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].inputs = operInputs;
                                    var outputs = b.data.outputs;
                                    var outputCount = WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].outputs.length;
                                    for (var i = 0; i < outputs.length; i++) {
                                        d3.select("#output_" + id + "_" + i).text(outputs[i].name + "(" + outputs[i].type + ")");
                                        WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].outputs[i].name = outputs[i].name;
                                        WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].outputs[i].identifier = outputs[i].identifier;
                                        WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].outputs[i].type = outputs[i].type;
                                        WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].outputs[i].value = "";
                                        if (i == (outputCount - 1)) {
                                            break;
                                        }
                                    }
                                }
                            },
                            afterrender: function () {
                                //this.setValue(WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[index].metadata.label);
                            }

                        }
                    ],
                    dockedItems: [{
                            dock: "bottom",
                            xtype: "toolbar",
                            items: [
                                {
                                    xtype: 'button',
                                    text: 'Save',
                                    handler: function () {
                                        var countRequiredEmpties = 0;
                                        for (var j = 0; j < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; j++) {
                                            if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].id == id) {
                                                WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].metadata.url = Ext.getCmp("url_" + id).getValue();
                                                for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs.length; i++) {
                                                    if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].optional == false && Ext.getCmp("input_parameter_" + id + "_" + i).getValue() == "") {
                                                        countRequiredEmpties = countRequiredEmpties + 1;
                                                    }
                                                    if (Ext.getCmp("input_parameter_" + id + "_" + i).getValue() == "") {
                                                        d3.select("#input_" + id + "_" + i).style("color", "#000000");
                                                        WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].value = "";
                                                    } else {
                                                        WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].value = Ext.getCmp("input_parameter_" + id + "_" + i).getValue();
                                                        //WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].url = Ext.getCmp("input_parameter_" + id + "_" + i).getValue();
                                                        d3.select("#input_" + id + "_" + i).style("color", "#006600");
                                                    }
                                                }
                                                break;
                                            }
                                        }
                                        if (countRequiredEmpties > 0) {
                                            Ext.Msg.alert('Error', 'Please ensure required inputs are filled!', Ext.emptyFn);
                                        } else {
                                            Ext.getCmp("operation_form_" + id).hide();
                                            Ext.getCmp('operation_form_' + id).destroy();
                                        }
                                        Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</pre></span>");
                                    }
                                },
                                {
                                    xtype: 'button',
                                    text: 'Cancel',
                                    handler: function () {
                                        Ext.getCmp("operation_form_" + id).hide();
                                        Ext.getCmp('operation_form_' + id).destroy();
                                    }
                                }
                            ]
                        }
                    ]
                });
                for (var j = 0; j < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; j++) {
                    if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].id == id) {
                        Ext.getCmp("operation_form_" + id).show();
                        for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs.length; i++) {
                            Ext.getCmp("operation_form_" + id).add(
                                    {
                                        xtype: 'label',
                                        html: '<span>Input ' + i + " : " + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].name + ' ' + (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].optional === false ? '</span><span style="color: red;">(required)</span>' : '(optional)</span>'),
                                        margin: '10 10 0 10',
                                    }
                            );
                            var editable = true;
                            if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].value !== null) {
                                editable = WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].value.toString().indexOf("_to_") >= 0 ? false : true
                            }
                            if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].type == 'date') {
                                Ext.getCmp("operation_form_" + id).add(
                                        {
                                            xtype: 'datefield',
                                            margin: '10 10 0 10',
                                            anchor: '100%',
                                            id: "input_parameter_" + id + "_" + i,
                                            style: {
                                                border: 'solid 0.5px #cccccc'
                                            },
                                            value: WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].value == "" ? new Date() : new Date(WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].value),
                                            maxValue: new Date(),
                                            allowBlank: false,
                                            editable: editable,
                                            format: 'Y-m-d',
                                            submitFormat: 'Y-m-d',
                                        }
                                );
                            } else {
                                Ext.getCmp("operation_form_" + id).add(
                                        {
                                            xtype: WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].type == 'geom' || WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].type == 'coverage' ? 'textarea' : 'textfield',
                                            margin: '10 10 0 10',
                                            anchor: '100%',
                                            id: "input_parameter_" + id + "_" + i,
                                            //inputWrapCls: '',
                                            style: {
                                                border: 'solid 0.5px #cccccc'
                                            },
                                            value: WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].value,
                                            emptyText: WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].type,
                                            allowBlank: WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].optional,
                                            editable: editable
                                        }
                                );
                            }

                        }
                        break;
                    }
                }



            });
        }
    },
    getArrayMax: function (arr) {
        var max = arr[0];
        for (var k = 1; k < arr.length; k++) {
            if (arr[k] > max) {
                max = arr[k];
            }
        }
        return max
    },
    executeWorkflow: function () {
        // Window for Workflow execution
        Ext.create({
            xtype: 'operationform',
            id: 'workflow_execute_form',
            title: "Execute Workflow",
            height: 200,
            width: 500,
            autoScroll: 'true',
            overflowY: 'auto',
            closable: false,
            bodyPadding: '0 0 20 0',
            modal: true,
            layout: {
                type: 'vbox',
                pack: 'position',
                align: 'stretch'
            },
            items: [
            ],
            dockedItems: [{
                    dock: "bottom",
                    xtype: "toolbar",
                    items: [
                        {
                            xtype: 'button',
                            text: 'Run',
                            handler: function () {
                                var countRequiredEmpties = 0;
                                for (var j = 0; j < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; j++) {
                                    for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs.length; i++) {
                                        if (Ext.getCmp("input_parameter_" + j + "_" + i)) {
                                            if (Ext.getCmp("input_parameter_" + j + "_" + i).getValue() == "") {
                                                countRequiredEmpties = countRequiredEmpties + 1;
                                                d3.select("#input_" + j + "_" + i).style("color", "#000000");
                                            } else {
                                                WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].inputs[i].value = Ext.getCmp("input_parameter_" + j + "_" + i).getValue();
                                                d3.select("#input_" + j + "_" + i).style("color", "#006600");
                                            }
                                        }
                                    }
                                }
                                if (countRequiredEmpties > 0) {
                                    Ext.Msg.alert('Error', 'Please ensure all inputs are filled!', Ext.emptyFn);
                                } else {
                                    Ext.getCmp("workflow_execute_form").hide();
                                    Ext.getCmp("workflow_execute_form").destroy();
                                    Ext.MessageBox.show({
                                        title: 'Please wait',
                                        msg: 'Workflow execution in progress...',
                                        progressText: 'running...',
                                        width: 300,
                                        wait: true,
                                        waitConfig: {interval: 200},
                                        progress: true,
                                        closable: false
                                    });
                                    Ext.Ajax.request({
                                        type: 'ajax',
                                        url: 'http://130.89.221.193:75/workflow/execute',
                                        method: "post",
                                        contentType: 'text/plain',
                                        timeout: 600000,
                                        responseType: 'application/json',
                                        params: JSON.stringify(WorkflowApp.app.wkfCtrl.workflows),
                                        success: function (response) {
                                            Ext.MessageBox.hide();
                                            var result = JSON.parse(response.responseText);
                                            console.log(result);
                                            var data = {};
                                            WorkflowApp.app.wkfCtrl.map.getLayers().forEach(function (lyr) {
                                                if (lyr.class == "ProcessLayers") {
                                                    WorkflowApp.app.wkfCtrl.map.removeLayer(lyr);
                                                }
                                            });
                                            Ext.getCmp("result_control_panel").removeAll();
                                            var format = new ol.format.GeoJSON();
                                            for (var i = 0; i < result.length; i++) {
                                                data['Process_' + result[i].id] = result[i]["data"];
                                                if (result[i]['type'] == "geom") {
                                                    var layer = new ol.layer.Vector({
                                                        source: new ol.source.Vector({
                                                            features: format.readFeatures(result[i]["result"], {featureProjection: "EPSG:3857"})
                                                        }),
                                                        id: 'Process_' + result[i].id,
                                                        name: 'Process_' + result[i].id,
                                                        class: "ProcessLayers",
                                                        visible: true,
                                                        style: function (feature) {
                                                            if (feature.getGeometry().getType() == "Point") {
                                                                return new ol.style.Style({
                                                                    image: new ol.style.Circle({
                                                                        radius: 1,
                                                                        stroke: new ol.style.Stroke({
                                                                            color: 'rgba(0,0,255,1)',
                                                                            width: 1
                                                                        }),
                                                                        fill: new ol.style.Fill({
                                                                            color: 'rgba(0,0,255,1)'
                                                                        })
                                                                    })
                                                                })
                                                            } else {
                                                                return new ol.style.Style({
                                                                    stroke: new ol.style.Stroke({
                                                                        color: 'rgba(255,0,0)',
                                                                        width: 2
                                                                    }),
                                                                    fill: new ol.style.Fill({
                                                                        color: 'rgba(0, 112, 219, 0.2)'
                                                                    })
                                                                })
                                                            }
                                                        }
                                                    });
                                                    var extent = layer.getSource().getExtent();
                                                    WorkflowApp.app.wkfCtrl.map.getView().fit(extent, {size: WorkflowApp.app.wkfCtrl.map.getSize(), maxZoom: 16})
                                                    WorkflowApp.app.wkfCtrl.map.addLayer(layer);
                                                    Ext.getCmp("result_control_panel").add(
                                                            {
                                                                xtype: 'panel',
                                                                layout: {
                                                                    type: 'hbox',
                                                                    pack: 'position',
                                                                    align: 'stretch'
                                                                },
                                                                border: false,
                                                                items: [
                                                                    {
                                                                        xtype: 'checkboxfield',
                                                                        name: 'Process_' + result[i].id,
                                                                        fieldLabel: 'Process_' + result[i].id,
                                                                        value: 'Process_' + result[i].id,
                                                                        checked: true,
                                                                        listeners: {
                                                                            change: function (event, b) {
                                                                                var name = this.getName();
                                                                                WorkflowApp.app.wkfCtrl.map.getLayers().forEach(function (layer) {
                                                                                    if (layer.get("id") == name) {
                                                                                        layer.setVisible(b);
                                                                                    }
                                                                                });
                                                                            },
                                                                            afterrender: function () {
                                                                                this.setValue(true);
                                                                            }
                                                                        },
                                                                        flex: 0.5
                                                                    },
                                                                    {
                                                                        xtype: 'combobox',
                                                                        anchor: '100%',
                                                                        multiSelect: false,
                                                                        id: 'Process_' + result[i].id,
                                                                        inputWrapCls: '',
                                                                        style: {
                                                                            border: 'solid 0.5px #cccccc'
                                                                        },
                                                                        store: Ext.create('Ext.data.Store', {
                                                                            fields: ['id', 'type'],
                                                                            data: [{id: 'Shapefile', type: "Shapefile"}, {id: 'GeoJSON', type: "GeoJSON"}],
                                                                        }),
                                                                        queryMode: 'local',
                                                                        displayField: 'type',
                                                                        valueField: 'id',
                                                                        margin: '0 10 2 0',
                                                                        flex: 0.4,
                                                                        listeners: {
                                                                            afterrender: function () {
                                                                                this.setValue(this.store.getAt(0).get('id'));
                                                                            }
                                                                        }
                                                                    },
                                                                    {
                                                                        xtype: 'label',
                                                                        style: {
                                                                            cursor: 'pointer',
                                                                            //border: 'solid 0.5px rgb(95, 162, 221)',
                                                                            padding: '1px',
                                                                            margin: '0px 4px 2px 0px'
                                                                        },
                                                                        html: "<img src='img/download-icon.png' width='25px' height='25px' >",
                                                                        tip: 'Download',
                                                                        name: 'Process_' + result[i].id,
                                                                        listeners: {
                                                                            render: function (c) {
                                                                                var name = this.name;
                                                                                Ext.create('Ext.tip.ToolTip', {
                                                                                    target: c.getEl(),
                                                                                    html: c.tip,
                                                                                    tooltipType: 'title',
                                                                                });
                                                                                c.getEl().on("click", function () {
                                                                                    if (Ext.getCmp(name).getValue() == "GeoJSON") {
                                                                                        var textToWrite = data[name];
                                                                                        var textFileAsBlob = new Blob([textToWrite], {type: 'application/json'});
                                                                                        var fileNameToSaveAs = "Result.geojson";
                                                                                        var downloadLink = document.createElement("a");
                                                                                        downloadLink.download = fileNameToSaveAs;
                                                                                        downloadLink.innerHTML = "Download File";
                                                                                        if (window.webkitURL != null)
                                                                                        {
                                                                                            downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
                                                                                        } else
                                                                                        {
                                                                                            downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
                                                                                            downloadLink.style.display = "none";
                                                                                            document.body.appendChild(downloadLink);
                                                                                        }
                                                                                        downloadLink.click();
                                                                                    }
                                                                                });
                                                                            }
                                                                        },
                                                                        flex: 0.1
                                                                    },
                                                                ]
                                                            }
                                                    );
                                                } else if (result[i]['type'] == "coverage") {
                                                    Ext.getCmp("result_control_panel").add(
                                                            {
                                                                xtype: 'panel',
                                                                layout: {
                                                                    type: 'hbox',
                                                                    pack: 'position',
                                                                    align: 'stretch'
                                                                },
                                                                border: false,
                                                                items: [
                                                                    {
                                                                        xtype: 'checkboxfield',
                                                                        name: 'Process_' + result[i].id,
                                                                        fieldLabel: 'Process_' + result[i].id,
                                                                        value: 'Process_' + result[i].id,
                                                                        checked: true,
                                                                        listeners: {
                                                                            afterrender: function () {
                                                                                this.setValue(true);
                                                                                this.disable();
                                                                            }
                                                                        },
                                                                        flex: 0.5
                                                                    },
                                                                    {
                                                                        xtype: 'panel',
                                                                        flex: 0.4,
                                                                        border: false,
                                                                        margin: '0 10 2 0',
                                                                    },
                                                                    {
                                                                        xtype: 'label',
                                                                        style: {
                                                                            cursor: 'pointer',
                                                                            //border: 'solid 0.5px rgb(95, 162, 221)',
                                                                            padding: '1px',
                                                                            margin: '0px 4px 2px 0px'
                                                                        },
                                                                        html: "<img src='img/download-icon.png' width='25px' height='25px' >",
                                                                        tip: 'Download',
                                                                        name: 'Process_' + result[i].id,
                                                                        listeners: {
                                                                            render: function (c) {
                                                                                var name = this.name;
                                                                                Ext.create('Ext.tip.ToolTip', {
                                                                                    target: c.getEl(),
                                                                                    html: c.tip,
                                                                                    tooltipType: 'title',
                                                                                });
                                                                                c.getEl().on("click", function () {
                                                                                    var link = document.createElement('a');
                                                                                    link.download = 'Result.tif'
                                                                                    link.href = data[name];
                                                                                    link.innerHTML = "Download File";
                                                                                    var clickEvent = document.createEvent("MouseEvent");
                                                                                    clickEvent.initEvent("click", true, true);
                                                                                    link.dispatchEvent(clickEvent);
                                                                                });
                                                                            }
                                                                        },
                                                                        flex: 0.1
                                                                    }

                                                                ]
                                                            }
                                                    );
                                                } else if (result[i]['type'] == "geoserver")
                                                {
                                                    var host = "";
                                                    for (var j = 0; j < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; j++) {
                                                        if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].id === parseInt(result[i]['id'])) {
                                                            host = WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j]["inputs"][1].value;
                                                        }
                                                    }
                                                    var layer = new ol.layer.Tile({
                                                        source: new ol.source.TileWMS({
                                                            url: host + '/wms',
                                                            params: {"LAYERS": result[i]['result']['layer'], "TILED": true},
                                                            id: 'Process_' + result[i].id,
                                                            name: 'Process_' + result[i].id,
                                                            class: "ProcessLayers"
                                                        }),
                                                        id: 'Process_' + result[i].id,
                                                        name: 'Process_' + result[i].id,
                                                        class: "ProcessLayers"
                                                    });
                                                    WorkflowApp.app.wkfCtrl.map.addLayer(layer);
                                                    var extent = [result[i]['result']['extent']["southwest"][0], result[i]['result']['extent']["southwest"][1], result[i]['result']['extent']["northeast"][0], result[i]['result']['extent']["northeast"][1]];
                                                    extent = ol.extent.applyTransform(extent, ol.proj.getTransform("EPSG:4326", "EPSG:3857"));

                                                    WorkflowApp.app.wkfCtrl.map.getView().fit(extent, {size: WorkflowApp.app.wkfCtrl.map.getSize(), maxZoom: 16})
                                                    WorkflowApp.app.wkfCtrl.layers['Process_' + result[i].id] = layer;
                                                    Ext.getCmp("result_control_panel").add(
                                                            {
                                                                xtype: 'panel',
                                                                layout: {
                                                                    type: 'hbox',
                                                                    pack: 'position',
                                                                    align: 'stretch'
                                                                },
                                                                border: false,
                                                                items: [
                                                                    {
                                                                        xtype: 'checkboxfield',
                                                                        name: 'Process_' + result[i].id,
                                                                        fieldLabel: 'Process_' + result[i].id,
                                                                        value: 'Process_' + result[i].id,
                                                                        checked: true,
                                                                        listeners: {
                                                                            change: function (event, b) {
                                                                                var name = this.getName();
                                                                                WorkflowApp.app.wkfCtrl.map.getLayers().forEach(function (layer) {
                                                                                    if (layer.get("id") == name) {
                                                                                        layer.setVisible(b);
                                                                                    }
                                                                                });
                                                                            },
                                                                            afterrender: function () {
                                                                                this.setValue(true);
                                                                            }
                                                                        },
                                                                        flex: 0.5
                                                                    },
                                                                    {
                                                                        xtype: 'panel',
                                                                        flex: 0.4,
                                                                        border: false,
                                                                        margin: '0 10 2 0',
                                                                    },
                                                                ]
                                                            }
                                                    );
                                                } else {
                                                    Ext.getCmp("result_control_panel").add(
                                                            {
                                                                xtype: 'panel',
                                                                layout: {
                                                                    type: 'hbox',
                                                                    pack: 'position',
                                                                    align: 'stretch'
                                                                },
                                                                border: false,
                                                                items: [
                                                                    {
                                                                        xtype: 'checkboxfield',
                                                                        name: 'Process_' + result[i].id,
                                                                        fieldLabel: 'Process_' + result[i].id,
                                                                        value: 'Process_' + result[i].id,
                                                                        checked: true,
                                                                        listeners: {
                                                                            afterrender: function () {
                                                                                this.setValue(true);
                                                                                this.disable();
                                                                            }
                                                                        },
                                                                        flex: 0.5
                                                                    },
                                                                    {
                                                                        xtype: 'textfield',
                                                                        name: 'Process_' + result[i].id,
                                                                        value: data['Process_' + result[i].id],
                                                                        flex: 0.4,
                                                                        margin: '0 14 2 0',
                                                                    },
                                                                    {
                                                                        xtype: 'panel',
                                                                        flex: 0.1,
                                                                        border: false
                                                                    }
                                                                ]
                                                            }
                                                    );
                                                }
                                            }
                                            var i = result.length - 1;
                                            result = result[i];
                                            d3.select("#rect_" + result['id']).transition().duration(1000).style("stroke", "green").style("stroke-width", 2).transition().duration(0).style("stroke", "blue").style("stroke-width", 1);
                                            Ext.Msg.alert('Success', 'Workflow execution was successful!', Ext.emptyFn);
                                            Ext.getCmp("result-tab-id").setActiveTab(1);
                                        }
                                    });
                                }
                                Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</pre></span>");
                            }
                        },
                        {
                            xtype: 'button',
                            text: 'Cancel',
                            handler: function () {
                                Ext.getCmp("workflow_execute_form").hide();
                                Ext.getCmp("workflow_execute_form").destroy();
                            }
                        }
                    ]
                }
            ],
            listeners: {
                show: function () {
                    this.setX(Ext.getCmp('WorkflowPanel').getX());
                    this.setY(Ext.getCmp('WorkflowPanel').getY());
                }
            }
        });
        var wkflCount = WorkflowApp.app.wkfCtrl.workflows["workflows"].length;
        if (wkflCount > 0) {
            var operations = WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations;
            if (operations.length > 0) {
                Ext.getCmp("workflow_execute_form").show();
                var countRequiredEmpties = 0;
                for (var i = 0; i < operations.length; i++) {
                    var inputs = operations[i].inputs;
                    var counts = 0;
                    for (var j = 0; j < inputs.length; j++) {
                        if (inputs[j].optional == false && inputs[j].value == "") {
                            countRequiredEmpties += 1;
                            counts += 1;
                        }
                    }
                    if (counts > 0) {
                        Ext.getCmp("workflow_execute_form").add({
                            xtype: 'label',
                            html: '<span>' + operations[i].id + " : " + operations[i].metadata.longname + "</span>",
                            margin: '10 10 0 10',
                        });
                    }

                    for (var j = 0; j < inputs.length; j++) {
                        if (inputs[j].optional == false && inputs[j].value == "") {
                            Ext.getCmp("workflow_execute_form").add({
                                xtype: 'label',
                                html: '<span>' + inputs[j].id + " : " + inputs[j].name + "</span>",
                                margin: '10 10 0 35',
                            });
                            Ext.getCmp("workflow_execute_form").add({
                                xtype: 'textfield',
                                margin: '10 10 0 35',
                                anchor: '100%',
                                id: "input_parameter_" + i + "_" + j,
                                inputWrapCls: '',
                                style: {
                                    border: 'solid 0.5px #cccccc'
                                },
                                value: WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].inputs[j].value,
                                emptyText: WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].inputs[j].type,
                                allowBlank: WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].inputs[j].optional,
                                editable: WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].inputs[j].value.indexOf("_to_") >= 0 ? false : true
                            });
                        }
                    }
                }
                if (countRequiredEmpties == 0) {
                    Ext.getCmp("workflow_execute_form").hide();
                    Ext.getCmp("workflow_execute_form").destroy();
                    Ext.MessageBox.show({
                        title: 'Please wait',
                        msg: 'Workflow execution in progress...',
                        progressText: 'running...',
                        width: 300,
                        wait: true,
                        waitConfig: {interval: 200},
                        progress: true,
                        closable: false
                    });
                    Ext.Ajax.request({
                        type: 'ajax',
                        url: 'http://130.89.221.193:75/workflow/execute',
                        method: "post",
                        timeout: 600000,
                        contentType: 'text/plain',
                        responseType: 'application/json',
                        params: JSON.stringify(WorkflowApp.app.wkfCtrl.workflows),
                        success: function (response) {
                            Ext.MessageBox.hide();
                            var result = JSON.parse(response.responseText);
                            console.log(result);
                            var data = {};
                            WorkflowApp.app.wkfCtrl.map.getLayers().forEach(function (lyr) {
                                if (lyr.class == "ProcessLayers") {
                                    WorkflowApp.app.wkfCtrl.map.removeLayer(lyr);
                                }
                            });
                            Ext.getCmp("result_control_panel").removeAll();
                            var format = new ol.format.GeoJSON();
                            for (var i = 0; i < result.length; i++) {
                                data['Process_' + result[i].id] = result[i]["result"];
                                if (result[i]['type'] == "geom") {
                                    /*Ext.Ajax.request({
                                     type: 'ajax',
                                     url: 'http://130.89.221.193:75/workflow/transformcoords',
                                     method: "post",
                                     contentType: 'text/plain',
                                     responseType: 'application/json',
                                     params: JSON.stringify(WorkflowApp.app.wkfCtrl.workflows),
                                     success: function (response) {}
                                     });*/

                                    var layer = new ol.layer.Vector({
                                        source: new ol.source.Vector({
                                            features: format.readFeatures(result[i]["result"], {featureProjection: "EPSG:3857"})
                                        }),
                                        id: 'Process_' + result[i].id,
                                        name: 'Process_' + result[i].id,
                                        class: "ProcessLayers",
                                        visible: true,
                                        style: function (feature) {
                                            if (feature.getGeometry().getType() == "Point") {
                                                return new ol.style.Style({
                                                    image: new ol.style.Circle({
                                                        radius: 1,
                                                        stroke: new ol.style.Stroke({
                                                            color: 'rgba(0,0,255,1)',
                                                            width: 1
                                                        }),
                                                        fill: new ol.style.Fill({
                                                            color: 'rgba(0,0,255,1)'
                                                        })
                                                    })
                                                })
                                            } else {
                                                return new ol.style.Style({
                                                    stroke: new ol.style.Stroke({
                                                        color: 'rgba(255,0,0)',
                                                        width: 2
                                                    }),
                                                    fill: new ol.style.Fill({
                                                        color: 'rgba(0, 112, 219, 0.2)'
                                                    })
                                                })
                                            }
                                        }
                                    });
                                    WorkflowApp.app.wkfCtrl.layers['Process_' + result[i].id] = layer;
                                    WorkflowApp.app.wkfCtrl.map.addLayer(layer);
                                    var extent = layer.getSource().getExtent();
                                    WorkflowApp.app.wkfCtrl.map.getView().fit(extent, {size: WorkflowApp.app.wkfCtrl.map.getSize(), maxZoom: 16})
                                    Ext.getCmp("result_control_panel").add(
                                            {
                                                xtype: 'panel',
                                                layout: {
                                                    type: 'hbox',
                                                    pack: 'position',
                                                    align: 'stretch'
                                                },
                                                border: false,
                                                items: [
                                                    {
                                                        xtype: 'checkboxfield',
                                                        name: 'Process_' + result[i].id,
                                                        fieldLabel: 'Process_' + result[i].id,
                                                        value: 'Process_' + result[i].id,
                                                        checked: true,
                                                        listeners: {
                                                            change: function (event, b) {
                                                                var name = this.getName();
                                                                WorkflowApp.app.wkfCtrl.map.getLayers().forEach(function (lyr) {
                                                                    if (lyr.get("id") === name) {
                                                                        lyr.setVisible(b);
                                                                    }
                                                                });
                                                            },
                                                            afterrender: function () {
                                                                this.setValue(true);
                                                            }
                                                        },
                                                        flex: 0.5
                                                    },
                                                    {
                                                        xtype: 'combobox',
                                                        anchor: '100%',
                                                        multiSelect: false,
                                                        id: 'Process_' + result[i].id,
                                                        inputWrapCls: '',
                                                        style: {
                                                            border: 'solid 0.5px #cccccc'
                                                        },
                                                        store: Ext.create('Ext.data.Store', {
                                                            fields: ['id', 'type'],
                                                            data: [{id: 'Shapefile', type: "Shapefile"}, {id: 'GeoJSON', type: "GeoJSON"}],
                                                        }),
                                                        queryMode: 'local',
                                                        displayField: 'type',
                                                        valueField: 'id',
                                                        margin: '0 10 2 0',
                                                        flex: 0.4,
                                                        listeners: {
                                                            afterrender: function () {
                                                                this.setValue(this.store.getAt(0).get('id'));
                                                            }
                                                        }
                                                    },
                                                    {
                                                        xtype: 'label',
                                                        style: {
                                                            cursor: 'pointer',
                                                            //border: 'solid 0.5px rgb(95, 162, 221)',
                                                            padding: '1px',
                                                            margin: '0px 4px 2px 0px'
                                                        },
                                                        html: "<img src='img/download-icon.png' width='25px' height='25px' >",
                                                        tip: 'Download',
                                                        name: 'Process_' + result[i].id,
                                                        listeners: {
                                                            render: function (c) {
                                                                var name = this.name;
                                                                Ext.create('Ext.tip.ToolTip', {
                                                                    target: c.getEl(),
                                                                    html: c.tip,
                                                                    tooltipType: 'title',
                                                                });
                                                                c.getEl().on("click", function () {
                                                                    if (Ext.getCmp(name).getValue() == "GeoJSON") {
                                                                        var textToWrite = JSON.stringify(data[name]);
                                                                        var textFileAsBlob = new Blob([textToWrite], {type: 'application/json'});
                                                                        var fileNameToSaveAs = "Result.geojson";
                                                                        var downloadLink = document.createElement("a");
                                                                        downloadLink.download = fileNameToSaveAs;
                                                                        downloadLink.innerHTML = "Download File";
                                                                        if (window.webkitURL != null)
                                                                        {
                                                                            downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
                                                                        } else
                                                                        {
                                                                            downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
                                                                            downloadLink.style.display = "none";
                                                                            document.body.appendChild(downloadLink);
                                                                        }
                                                                        downloadLink.click();
                                                                    }
                                                                });
                                                            }
                                                        },
                                                        flex: 0.1
                                                    },
                                                ]
                                            }
                                    );
                                } else if (result[i]['type'] == "coverage") {
                                    Ext.getCmp("result_control_panel").add(
                                            {
                                                xtype: 'panel',
                                                layout: {
                                                    type: 'hbox',
                                                    pack: 'position',
                                                    align: 'stretch'
                                                },
                                                border: false,
                                                items: [
                                                    {
                                                        xtype: 'checkboxfield',
                                                        name: 'Process_' + result[i].id,
                                                        fieldLabel: 'Process_' + result[i].id,
                                                        value: 'Process_' + result[i].id,
                                                        checked: true,
                                                        listeners: {
                                                            afterrender: function () {
                                                                this.setValue(true);
                                                                this.disable();
                                                            }
                                                        },
                                                        flex: 0.5
                                                    },
                                                    {
                                                        xtype: 'panel',
                                                        flex: 0.4,
                                                        border: false,
                                                        margin: '0 10 2 0',
                                                    },
                                                    {
                                                        xtype: 'label',
                                                        style: {
                                                            cursor: 'pointer',
                                                            //border: 'solid 0.5px rgb(95, 162, 221)',
                                                            padding: '1px',
                                                            margin: '0px 4px 2px 0px'
                                                        },
                                                        html: "<img src='img/download-icon.png' width='25px' height='25px' >",
                                                        tip: 'Download',
                                                        name: 'Process_' + result[i].id,
                                                        listeners: {
                                                            render: function (c) {
                                                                var name = this.name;
                                                                Ext.create('Ext.tip.ToolTip', {
                                                                    target: c.getEl(),
                                                                    html: c.tip,
                                                                    tooltipType: 'title',
                                                                });
                                                                c.getEl().on("click", function () {
                                                                    var link = document.createElement('a');
                                                                    link.download = 'Result.tif'
                                                                    link.href = data[name];
                                                                    link.innerHTML = "Download File";
                                                                    var clickEvent = document.createEvent("MouseEvent");
                                                                    clickEvent.initEvent("click", true, true);
                                                                    link.dispatchEvent(clickEvent);
                                                                });
                                                            }
                                                        },
                                                        flex: 0.1
                                                    }

                                                ]
                                            }
                                    );
                                } else if (result[i]['type'] == "geoserver") {
                                    var host = "";
                                    for (var j = 0; j < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; j++) {
                                        if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j].id === parseInt(result[i]['id'])) {
                                            host = WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[j]["inputs"][1].value;
                                        }
                                    }
                                    var layer = new ol.layer.Tile({
                                        source: new ol.source.TileWMS({
                                            url: host + '/wms',
                                            params: {"LAYERS": result[i]['result']['layer'], "TILED": true},
                                            id: 'Process_' + result[i].id,
                                            name: 'Process_' + result[i].id,
                                            class: "ProcessLayers"
                                        }),
                                        id: 'Process_' + result[i].id,
                                        name: 'Process_' + result[i].id,
                                        class: "ProcessLayers"
                                    });
                                    WorkflowApp.app.wkfCtrl.map.addLayer(layer);
                                    var extent = [result[i]['result']['extent']["southwest"][0], result[i]['result']['extent']["southwest"][1], result[i]['result']['extent']["northeast"][0], result[i]['result']['extent']["northeast"][1]];
                                    extent = ol.extent.applyTransform(extent, ol.proj.getTransform("EPSG:4326", "EPSG:3857"));

                                    WorkflowApp.app.wkfCtrl.map.getView().fit(extent, {size: WorkflowApp.app.wkfCtrl.map.getSize(), maxZoom: 16})
                                    WorkflowApp.app.wkfCtrl.layers['Process_' + result[i].id] = layer;
                                    Ext.getCmp("result_control_panel").add(
                                            {
                                                xtype: 'panel',
                                                layout: {
                                                    type: 'hbox',
                                                    pack: 'position',
                                                    align: 'stretch'
                                                },
                                                border: false,
                                                items: [
                                                    {
                                                        xtype: 'checkboxfield',
                                                        name: 'Process_' + result[i].id,
                                                        fieldLabel: 'Process_' + result[i].id,
                                                        value: 'Process_' + result[i].id,
                                                        checked: true,
                                                        listeners: {
                                                            change: function (event, b) {
                                                                var name = this.getName();
                                                                WorkflowApp.app.wkfCtrl.map.getLayers().forEach(function (layer) {
                                                                    if (layer.get("id") == name) {
                                                                        layer.setVisible(b);
                                                                    }
                                                                });
                                                            },
                                                            afterrender: function () {
                                                                this.setValue(true);
                                                            }
                                                        },
                                                        flex: 0.5
                                                    },
                                                    {
                                                        xtype: 'panel',
                                                        flex: 0.4,
                                                        border: false,
                                                        margin: '0 10 2 0',
                                                    },
                                                ]
                                            }
                                    );
                                } else {
                                    Ext.getCmp("result_control_panel").add(
                                            {
                                                xtype: 'panel',
                                                layout: {
                                                    type: 'hbox',
                                                    pack: 'position',
                                                    align: 'stretch'
                                                },
                                                border: false,
                                                items: [
                                                    {
                                                        xtype: 'checkboxfield',
                                                        name: 'Process_' + result[i].id,
                                                        fieldLabel: 'Process_' + result[i].id,
                                                        value: 'Process_' + result[i].id,
                                                        checked: true,
                                                        listeners: {
                                                            afterrender: function () {
                                                                this.setValue(true);
                                                                this.disable();
                                                            }
                                                        },
                                                        flex: 0.5
                                                    },
                                                    {
                                                        xtype: 'textfield',
                                                        name: 'Process_' + result[i].id,
                                                        value: data['Process_' + result[i].id],
                                                        flex: 0.4,
                                                        margin: '0 14 2 0',
                                                    },
                                                    {
                                                        xtype: 'panel',
                                                        flex: 0.1,
                                                        border: false
                                                    }
                                                ]
                                            }
                                    );
                                }
                            }
                            var i = result.length - 1;
                            result = result[i];
                            d3.select("#rect_" + result['id']).transition().duration(1000).style("stroke", "green").style("stroke-width", 2).transition().duration(0).style("stroke", "blue").style("stroke-width", 1);
                            Ext.Msg.alert('Success', 'Workflow execution was successful!', Ext.emptyFn);
                            Ext.getCmp("result-tab-id").setActiveTab(1);
                        }
                    });
                } else {
                    if (countRequiredEmpties > 5) {
                        Ext.getCmp("workflow_execute_form").setHeight(550);
                    } else {
                        Ext.getCmp("workflow_execute_form").setHeight(200 + (70 * countRequiredEmpties));
                    }
                }

            } else {
                Ext.Msg.alert('Error', 'Cannot execute a workflow with no operation!', Ext.emptyFn);
            }
        }

    },
    addWPSprocess: function (records, title) {
        var operations = [];
        records.forEach(function (record) {
            operations.push({
                name: record.data.metadata.longname,
                operation: record.data,
                leaf: true,
                iconCls: 'x-fa fa-cog',
            });
        });
        Ext.getCmp("processes_Panel").add({
            xtype: 'workflowtreeview',
            margin: '5',
            store: {
                xtype: 'Ext.data.TreeStore',
                expanded: true,
                model: 'WorkflowApp.model.ProcessServer',
                rootProperty: 'children',
                proxy: {
                    type: 'memory',
                    data: [
                        {
                            name: title,
                            children: operations,
                            expanded: false,
                            iconCls: 'ico-test'
                        }
                    ],
                    reader: {
                        type: 'json'
                    }
                }
            },
            border: false,
            listeners: {
                itemcontextmenu: function (a, b, c, d, e) {
                    if (b.data.parentId !== "root") {
                        e.stopEvent();
                        var xy = e.getXY();
                        new Ext.menu.Menu({
                            items: [
                                {
                                    text: 'Add to Workflow',
                                    handler: function () {
                                        var operation = {
                                            id: b.data.operation.id,
                                            metadata: b.data.operation.metadata,
                                            inputs: [],
                                            outputs: b.data.operation.outputs
                                        };
                                        for (var i = 0; i < b.data.operation.inputs.length; i++) {
                                            operation.inputs.push({
                                                id: b.data.operation.inputs[i].id,
                                                identifier: b.data.operation.inputs[i].identifier,
                                                name: b.data.operation.inputs[i].name,
                                                type: b.data.operation.inputs[i].type,
                                                description: b.data.operation.inputs[i].description,
                                                optional: b.data.operation.inputs[i].optional,
                                                url: b.data.operation.inputs[i].url,
                                                value: ""
                                            });
                                        }

                                        WorkflowApp.app.wkfCtrl.createOperation(operation, Ext.getCmp("workflow_view").getX() + 10, Ext.getCmp("workflow_view").getY() + 10);
                                        Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</pre></span>");
                                    }
                                },
                                {
                                    text: 'Metadata',
                                    handler: function () {

                                    }
                                }
                            ]
                        }).showAt(xy)
                    }

                },
                render: function (c) {
                    c.getEl().on('mousedown', function (event, x, y) {
                        document.getElementById(event.target.id).setAttribute("draggable", "true");
                        d3.select("#" + event.target.id).on("drag", function (event) {
                        });
                        d3.select("#" + event.target.id).on("dragend", function (a, b) {
                            var data = null;
                            c.store.getRootNode().eachChild(function (child) {
                                child.getData().children.forEach(function (child) {
                                    if (child.name == document.getElementById(event.target.id).innerHTML) {
                                        data = child;
                                        var elem = document.elementFromPoint(d3.event.x, d3.event.y);
                                        if (elem.tagName == "svg") {
                                            var operation = {
                                                id: data.operation.id,
                                                metadata: data.operation.metadata,
                                                inputs: [],
                                                outputs: data.operation.outputs
                                            };
                                            for (var i = 0; i < data.operation.inputs.length; i++) {
                                                operation.inputs.push({
                                                    id: data.operation.inputs[i].id,
                                                    identifier: data.operation.inputs[i].identifier,
                                                    name: data.operation.inputs[i].name,
                                                    type: data.operation.inputs[i].type,
                                                    description: data.operation.inputs[i].description,
                                                    optional: data.operation.inputs[i].optional,
                                                    url: data.operation.inputs[i].url,
                                                    value: ""
                                                });
                                            }
                                            WorkflowApp.app.wkfCtrl.createOperation(operation, d3.event.x - Ext.getCmp("WorkflowPanel").getX(), d3.event.y - Ext.getCmp("WorkflowPanel").getY());
                                            Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</pre></span>");
                                        }
                                    }
                                });
                            });
                        });
                    })
                }
            }
        });
    },
    addWFSfeatures: function (records, title) {
        var features = [];
        records.forEach(function (record) {
            features.push({
                name: record.data.name,
                feature: record.data,
                leaf: true,
                iconCls: 'x-fa fa-database',
            });
        });
        Ext.getCmp("data_Panel").add({
            xtype: 'workflowtreeview',
            margin: '5',
            store: {
                xtype: 'Ext.data.TreeStore',
                expanded: true,
                model: 'WorkflowApp.model.ProcessServer',
                rootProperty: 'children',
                proxy: {
                    type: 'memory',
                    data: [
                        {
                            name: title,
                            children: features,
                            expanded: false,
                            iconCls: 'ico-test'
                        }
                    ],
                    reader: {
                        type: 'json'
                    }
                }
            },
            border: false,
            listeners: {
                render: function (c) {
                    c.getEl().on('mousedown', function (event, x, y) {
                        document.getElementById(event.target.id).setAttribute("draggable", "true");
                        d3.select("#" + event.target.id).on("drag", function (event) {
                        });
                        d3.select("#" + event.target.id).on("dragend", function (a, b) {
                            var data = null;
                            event.stopPropagation();
                            c.store.getRootNode().eachChild(function (child) {
                                child.getData().children.forEach(function (child) {
                                    if (child.name == document.getElementById(event.target.id).innerHTML) {
                                        data = child;
                                        var elem = document.elementFromPoint(d3.event.x, d3.event.y);
                                        if (elem.getAttribute('id') !== null && (elem.getAttribute('id').indexOf("rect_") >= 0 || elem.getAttribute('id').indexOf("input_") >= 0)) {
                                            var id = elem.getAttribute('id').match(/[0-9]+/g)[0];
                                            var toData = [];
                                            for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; i++) {
                                                if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].id === parseInt(id)) {
                                                    for (var j = 0; j < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].inputs.length; j++) {
                                                        if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].inputs[j].type == "geom") {
                                                            toData.push(WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].inputs[j]);
                                                        }
                                                        if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].inputs[j].type == "coverage") {
                                                            toData.push(WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].inputs[j]);
                                                        }
                                                    }
                                                    break;
                                                }
                                            }

                                            Ext.create({
                                                xtype: 'operationform',
                                                id: 'change_inputs',
                                                renderTo: 'WorkflowPanel',
                                                title: "",
                                                closable: false,
                                                height: 170,
                                                width: 300,
                                                layout: {
                                                    type: 'vbox',
                                                    pack: 'position',
                                                    align: 'stretch'
                                                },
                                                items: [
                                                    {
                                                        xtype: 'label',
                                                        html: 'Map to Parameter',
                                                        margin: '5 5',
                                                    },
                                                    {
                                                        xtype: 'combobox',
                                                        anchor: '100%',
                                                        id: 'to_ParameterID',
                                                        multiSelect: false,
                                                        inputWrapCls: '',
                                                        style: {
                                                            border: 'solid 0.5px #cccccc'
                                                        },
                                                        store: Ext.create('Ext.data.Store', {
                                                            fields: ['id', 'type'],
                                                            data: toData,
                                                        }),
                                                        //emptyText: 'Select input parameter...',
                                                        queryMode: 'local',
                                                        displayField: 'type',
                                                        valueField: 'id',
                                                        margin: '0 5',
                                                        listeners: {
                                                            afterrender: function () {
                                                                var combo = Ext.getCmp("to_ParameterID")
                                                                combo.setValue(combo.store.getAt(0).get('id'));
                                                            }
                                                        }
                                                    }
                                                ],
                                                dockedItems: [{
                                                        dock: "bottom",
                                                        xtype: "toolbar",
                                                        items: [
                                                            {
                                                                xtype: 'button',
                                                                text: 'Apply',
                                                                handler: function () {
                                                                    if (Ext.getCmp("to_ParameterID").getValue() + "" == "") {
                                                                        Ext.Msg.alert('Error', 'Select output parameter.', Ext.emptyFn);
                                                                    } else {
                                                                        var index = Ext.getCmp("to_ParameterID").getValue();
                                                                        var operIndex = 0;
                                                                        for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; i++) {
                                                                            if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].id == parseInt(elem.getAttribute('id').match(/[0-9]+/g)[0])) {
                                                                                operIndex = i;
                                                                            }
                                                                        }

                                                                        WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[operIndex].inputs[index].value = data.feature.url;
                                                                        WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[operIndex].inputs[index].url = data.feature.url;
                                                                        Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</pre></span>");
                                                                        d3.select("#input_" + parseInt(elem.getAttribute('id').match(/[0-9]+/g)[0]) + "_" + index).style("color", "#006600");
                                                                        Ext.getCmp("change_inputs").hide();
                                                                        Ext.getCmp('change_inputs').destroy();
                                                                    }
                                                                }
                                                            },
                                                            {
                                                                xtype: 'button',
                                                                text: 'Cancel',
                                                                handler: function () {
                                                                    Ext.getCmp("change_inputs").hide();
                                                                    Ext.getCmp('change_inputs').destroy();
                                                                }
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }).show();
                                        }
                                        if (elem.tagName !== null && elem.getAttribute('class') == "ol-unselectable") {
                                            if (data.feature.url.indexOf("GetCoverage") !== -1) {
                                                var layer = new ol.layer.Tile({
                                                    source: new ol.source.TileWMS({
                                                        url: data.feature.url.split("ows?")[0] + 'wms',
                                                        params: {"LAYERS": data.feature.name, "TILED": true},
                                                        id: data.feature.title
                                                    }),
                                                    id: data.feature.title
                                                });
                                                WorkflowApp.app.wkfCtrl.map.addLayer(layer);
                                                var min = ol.proj.transform([data.feature.properties.min[0], data.feature.properties.min[1]], 'EPSG:4326', 'EPSG:3857');
                                                var max = ol.proj.transform([data.feature.properties.max[0], data.feature.properties.max[1]], 'EPSG:4326', 'EPSG:3857');
                                                var extent = [min[0], min[1], max[0], max[1]];
                                                WorkflowApp.app.wkfCtrl.map.getView().fit(extent, {size: WorkflowApp.app.wkfCtrl.map.getSize(), maxZoom: 16})
                                                WorkflowApp.app.wkfCtrl.layers[data.feature.title] = layer;
                                                Ext.getCmp("layers_control_panel").add(
                                                        {
                                                            xtype: 'panel',
                                                            layout: 'fit',
                                                            border: false,
                                                            items: [
                                                                {
                                                                    xtype: 'checkboxfield',
                                                                    name: data.feature.title,
                                                                    fieldLabel: data.feature.title,
                                                                    labelWidth: 'auto',
                                                                    width: '100%',
                                                                    value: data.feature.title,
                                                                    checked: true,
                                                                    listeners: {
                                                                        change: function (event, b) {
                                                                            var name = this.getName();
                                                                            WorkflowApp.app.wkfCtrl.map.getLayers().forEach(function (layer) {
                                                                                if (layer.get("id") == name) {
                                                                                    layer.setVisible(b);
                                                                                }
                                                                            });
                                                                        },
                                                                        afterrender: function () {
                                                                            this.setValue(true);
                                                                        }
                                                                    },
                                                                    flex: 1
                                                                }
                                                            ]
                                                        }
                                                );
                                                Ext.Msg.alert('Success!', 'Layer added to the map!', Ext.emptyFn);
                                            } else {
                                                Ext.Ajax.request({
                                                    url: 'app/api/getgeojson.py',
                                                    method: 'post',
                                                    params: {
                                                        url: data.feature.url,
                                                        srid: 3857
                                                    },
                                                    success: function (response) {
                                                        var format = new ol.format.GeoJSON();
                                                        var layer = new ol.layer.Vector({
                                                            source: new ol.source.Vector({
                                                                features: format.readFeatures(JSON.parse(response.responseText), {featureProjection: "EPSG:3857"})
                                                            }),
                                                            id: data.feature.title,
                                                            visible: true,
                                                            style: function (feature) {
                                                                if (feature.getGeometry().getType() == "Point") {
                                                                    return new ol.style.Style({
                                                                        image: new ol.style.Circle({
                                                                            radius: 1,
                                                                            stroke: new ol.style.Stroke({
                                                                                color: 'rgba(0,0,255,1)',
                                                                                width: 1
                                                                            }),
                                                                            fill: new ol.style.Fill({
                                                                                color: 'rgba(0,0,255,1)'
                                                                            })
                                                                        })
                                                                    })
                                                                } else {
                                                                    return new ol.style.Style({
                                                                        stroke: new ol.style.Stroke({
                                                                            color: 'rgba(255,0,0)',
                                                                            width: 2
                                                                        }),
                                                                        fill: new ol.style.Fill({
                                                                            color: 'rgba(0, 112, 219, 0.2)'
                                                                        })
                                                                    })
                                                                }
                                                            }
                                                        });

                                                        var extent = layer.getSource().getExtent();
                                                        console.log(extent);
                                                        WorkflowApp.app.wkfCtrl.map.getView().fit(extent, {size: WorkflowApp.app.wkfCtrl.map.getSize(), maxZoom: 16})
                                                        WorkflowApp.app.wkfCtrl.layers[data.feature.title] = layer;
                                                        WorkflowApp.app.wkfCtrl.map.addLayer(layer);
                                                        Ext.getCmp("layers_control_panel").add(
                                                                {
                                                                    xtype: 'panel',
                                                                    layout: 'fit',
                                                                    border: false,
                                                                    items: [
                                                                        {
                                                                            xtype: 'checkboxfield',
                                                                            name: data.feature.title,
                                                                            fieldLabel: data.feature.title,
                                                                            labelWidth: 220,
                                                                            anchor: '100%',
                                                                            value: data.feature.title,
                                                                            checked: true,
                                                                            listeners: {
                                                                                change: function (event, b) {
                                                                                    var name = this.getName();
                                                                                    WorkflowApp.app.wkfCtrl.map.getLayers().forEach(function (layer) {
                                                                                        if (layer.get("id") == name) {
                                                                                            layer.setVisible(b);
                                                                                        }
                                                                                    });
                                                                                },
                                                                                afterrender: function () {
                                                                                    this.setValue(true);
                                                                                }
                                                                            },
                                                                            flex: 1
                                                                        }
                                                                    ]
                                                                }
                                                        );
                                                        Ext.Msg.alert('Success!', 'Layer added to the map!', Ext.emptyFn);
                                                    }
                                                });
                                            }

                                        }
                                    }
                                });
                            });
                        });
                    });
                }
            }
        });
    },
    initializeRESTprocess: function () {
        var operations = [
            {
                name: "PublishRaster",
                operation: [
                    {
                        id: 0,
                        metadata: {
                            longname: "PublishRaster",
                            label: "PublishRaster",
                            resource: 'GeoServer',
                            url: "http://130.89.221.193:75/publish/raster",
                            description: "This operation publishes a raster map to the specified geoserver. It returns the namespace of the published map",
                            inputparametercount: 5,
                            outputparametercount: 1,
                            position: []
                        },
                        inputs: [
                            {
                                id: 0,
                                identifier: "Input coverage",
                                name: "Input coverage",
                                type: "coverage",
                                description: "Input coverage",
                                optional: false,
                                url: "",
                                value: ""
                            },
                            {
                                id: 1,
                                identifier: "GeoServer Url",
                                name: "GeoServer Url",
                                type: "text",
                                description: "Url for the Geoserver",
                                optional: false,
                                url: "http://130.89.221.193:85/geoserver",
                                value: "http://130.89.221.193:85/geoserver"
                            },
                            {
                                id: 2,
                                identifier: "workspace",
                                name: "workspace",
                                type: "text",
                                description: "The geoserver workspace",
                                optional: true,
                                url: "",
                                value: "thesis_test"
                            },
                            {
                                id: 3,
                                identifier: "username",
                                name: "username",
                                type: "text",
                                description: "The geoserver admin username",
                                optional: false,
                                url: "",
                                value: ""
                            },
                            {
                                id: 4,
                                identifier: "password",
                                name: "password",
                                type: "text",
                                description: "The geoserver admin password",
                                optional: false,
                                url: "",
                                value: ""
                            }
                        ],
                        outputs: [
                            {
                                id: 0,
                                identifier: "result",
                                name: "result",
                                value: "",
                                type: "geoserver",
                                description: "result"
                            }
                        ]
                    }
                ],
                leaf: true,
                iconCls: 'x-fa fa-cog',
            },
            {
                name: "BinaryMathRaster",
                operation: [
                    {
                        id: 0,
                        metadata: {
                            longname: "BinaryMathRaster",
                            label: "BinaryMathRaster",
                            resource: 'REST',
                            url: "http://130.89.221.193:75/binarymathraster",
                            description: "Returns a raster generated by pixel-by-pixel addition of two source rasters.  Source rasters must have the same bounding box and resolution.",
                            inputparametercount: 3,
                            outputparametercount: 1,
                            position: []
                        },
                        inputs: [
                            {
                                id: 0,
                                identifier: "CoverageA",
                                name: "CoverageA",
                                type: "coverage",
                                description: "First input coverage",
                                optional: false,
                                url: "",
                                value: ""
                            },
                            {
                                id: 1,
                                identifier: "CoverageB",
                                name: "CoverageB",
                                type: "coverage",
                                description: "Second input coverage",
                                optional: false,
                                url: "",
                                value: ""
                            },
                            {
                                id: 2,
                                identifier: "operator",
                                name: "operator",
                                type: "text",
                                description: "Operator to be applied to rasters",
                                optional: false,
                                url: "",
                                value: "add"
                            }
                        ],
                        outputs: [
                            {
                                id: 0,
                                identifier: "result",
                                name: "result",
                                value: "",
                                type: "coverage",
                                description: "result"
                            }
                        ]
                    }
                ],
                leaf: true,
                iconCls: 'x-fa fa-cog',
            },
            {
                name: "AggregateRainfall",
                operation: [
                    {
                        id: 0,
                        metadata: {
                            longname: "AggregateRainfall",
                            label: "AggregateRainfall",
                            resource: 'REST',
                            url: "http://130.89.8.26/aggregaterainfall",
                            description: "Returns an aggregate of rainfall within the specified period.",
                            inputparametercount: 3,
                            outputparametercount: 1,
                            position: []
                        },
                        inputs: [
                            {
                                id: 0,
                                identifier: "Start date",
                                name: "Start date",
                                type: "date",
                                description: "The start date of the period",
                                optional: false,
                                url: "",
                                value: ""
                            },
                            {
                                id: 1,
                                identifier: "End date",
                                name: "End date",
                                type: "date",
                                description: "The end date of the period",
                                optional: false,
                                url: "",
                                value: ""
                            },
                            {
                                id: 2,
                                identifier: "operator(sum/average)",
                                name: "operator(sum/average)",
                                type: "text",
                                description: "Aggregation operator",
                                optional: false,
                                url: "",
                                value: "sum"
                            }
                        ],
                        outputs: [
                            {
                                id: 0,
                                identifier: "result",
                                name: "result",
                                value: "",
                                type: "coverage",
                                description: "result"
                            }
                        ]
                    }
                ],
                leaf: true,
                iconCls: 'x-fa fa-cog',
            },
            {
                name: "Demand",
                operation: [
                    {
                        id: 0,
                        metadata: {
                            longname: "Demand",
                            label: "Demand",
                            resource: 'REST',
                            url: "http://130.89.8.26/demand",
                            description: "Returns the biomass demand for the specified period.",
                            inputparametercount: 2,
                            outputparametercount: 1,
                            position: []
                        },
                        inputs: [
                            {
                                id: 0,
                                identifier: "Start date",
                                name: "Start date",
                                type: "date",
                                description: "The start date of the period",
                                optional: false,
                                url: "",
                                value: ""
                            },
                            {
                                id: 1,
                                identifier: "End date",
                                name: "End date",
                                type: "date",
                                description: "The end date of the period",
                                optional: false,
                                url: "",
                                value: ""
                            }
                        ],
                        outputs: [
                            {
                                id: 0,
                                identifier: "result",
                                name: "result",
                                value: "",
                                type: "coverage",
                                description: "result"
                            }
                        ]
                    }
                ],
                leaf: true,
                iconCls: 'x-fa fa-cog',
            }
        ];
        Ext.getCmp("processes_Panel").add({
            xtype: 'workflowtreeview',
            id: 'rest_treeview',
            margin: '5',
            store: {
                xtype: 'Ext.data.TreeStore',
                expanded: true,
                id: 'rest_store',
                model: 'WorkflowApp.model.ProcessServer',
                rootProperty: 'children',
                proxy: {
                    type: 'memory',
                    data: [
                        {
                            name: "REST services",
                            children: operations,
                            expanded: true,
                            iconCls: 'ico-test'
                        }
                    ],
                    reader: {
                        type: 'json'
                    }
                }
            },
            border: false,
            listeners: {
                itemcontextmenu: function (a, b, c, d, e) {
                    if (b.data.parentId !== "root") {
                        e.stopEvent();
                        var xy = e.getXY();
                        new Ext.menu.Menu({
                            items: [
                                {
                                    text: 'Add to Workflow',
                                    handler: function () {
                                        var operation = {
                                            id: b.data.operation[0].id,
                                            metadata: b.data.operation[0].metadata,
                                            inputs: [],
                                            outputs: b.data.operation[0].outputs
                                        };
                                        for (var i = 0; i < b.data.operation[0].inputs.length; i++) {
                                            operation.inputs.push({
                                                id: b.data.operation[0].inputs[i].id,
                                                identifier: b.data.operation[0].inputs[i].identifier,
                                                name: b.data.operation[0].inputs[i].name,
                                                type: b.data.operation[0].inputs[i].type,
                                                description: b.data.operation[0].inputs[i].description,
                                                optional: b.data.operation[0].inputs[i].optional,
                                                url: b.data.operation[0].inputs[i].url,
                                                value: ""
                                            });
                                        }
                                        WorkflowApp.app.wkfCtrl.createOperation(operation, Ext.getCmp("workflow_view").getX() + 10, Ext.getCmp("workflow_view").getY() + 10);
                                        Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</pre></span>");
                                    }
                                },
                                {
                                    text: 'Metadata',
                                    handler: function () {

                                    }
                                }
                            ]
                        }).showAt(xy)
                    }

                },
                render: function (c) {
                    c.getEl().on('mousedown', function (event, x, y) {
                        document.getElementById(event.target.id).setAttribute("draggable", "true");
                        d3.select("#" + event.target.id).on("drag", function (event) {
                        });
                        d3.select("#" + event.target.id).on("dragend", function (a, b) {
                            var data = null;
                            c.store.getRootNode().eachChild(function (child) {
                                child.getData().children.forEach(function (child) {
                                    if (child.name == document.getElementById(event.target.id).innerHTML) {
                                        data = child;
                                        var elem = document.elementFromPoint(d3.event.x, d3.event.y);
                                        if (elem.tagName == "svg") {
                                            var operation = {
                                                id: data.operation[0].id,
                                                metadata: data.operation[0].metadata,
                                                inputs: [],
                                                outputs: data.operation[0].outputs
                                            };
                                            for (var i = 0; i < data.operation[0].inputs.length; i++) {
                                                operation.inputs.push({
                                                    id: data.operation[0].inputs[i].id,
                                                    identifier: data.operation[0].inputs[i].identifier,
                                                    name: data.operation[0].inputs[i].name,
                                                    type: data.operation[0].inputs[i].type,
                                                    description: data.operation[0].inputs[i].description,
                                                    optional: data.operation[0].inputs[i].optional,
                                                    url: data.operation[0].inputs[i].url,
                                                    value: ""
                                                });
                                            }
                                            WorkflowApp.app.wkfCtrl.createOperation(operation, d3.event.x - Ext.getCmp("WorkflowPanel").getX(), d3.event.y - Ext.getCmp("WorkflowPanel").getY());
                                            Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</pre></span>");
                                        }
                                    }
                                });
                            });
                        });
                    })
                }
            }
        });
    },
    addRESTprocesses: function (operations) {
        var store = Ext.getCmp("rest_treeview").store.config.proxy.data;
        store[0].children.push(operations);
        var data = [];
        var children = [];
        for (var i = 0; i < store[0].children.length; i++) {
            children.push({
                name: store[0].children[i].name,
                operation: store[0].children[i].operation,
                leaf: true,
                iconCls: 'x-fa fa-cog',
            });
        }
        data.push({
            name: "REST services",
            children: children,
            expanded: false,
            iconCls: 'ico-test'
        });
        Ext.getStore("rest_store").loadRawData(data, false);
    }
});