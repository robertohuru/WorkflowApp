"use strict";
Ext.define('WorkflowApp.view.home.HomeView', {
    extend: 'Ext.container.Viewport',
    xtype: 'homeview',
    requires: [
        'WorkflowApp.view.home.HomeController',
        'WorkflowApp.view.workflow.WorkflowView',
        'WorkflowApp.view.workflow.ConfigForm'
    ],
    controller: 'home-main',
    itemId: 'home_view',
    id: 'home_view',
    padding: 2,
    layout: {
        type: 'vbox',
        pack: 'start',
        align: 'stretch'
    },
    items: [
        {
            xtype: 'panel',
            flex: 0.07,
            margin: 3,
            layout: {
                type: 'hbox',
                pack: 'end'
            },
            items: [
                {
                    xtype: 'button',
                    text: 'Configuration',
                    margin: 10,
                    id: 'btnConfig'
                }
            ]
        },
        {
            xtype: 'panel',
            flex: 0.93,
            layout: 'border',
            border: false,
            items: [
                {
                    xtype: 'panel',
                    flex: 0.25,
                    margin: '0 3 3 0',
                    region: 'west',
                    collapsible: true,
                    split: true,
                    layout: {
                        type: 'vbox',
                        pack: 'start',
                        align: 'stretch'
                    },
                    autoScroll: 'true',
                    overflowY: 'auto',
                    border: false,
                    title: 'Processes',
                    items: [
                        {
                            xtype: 'panel',
                            flex: 0.5,
                            margin: '0 0 3 0',
                            autoScroll: 'true',
                            overflowY: 'auto',
                            layout: {
                                type: 'vbox',
                                pack: 'start',
                                align: 'stretch'
                            },
                            id: 'processes_Panel',

                        },
                        {
                            xtype: 'panel',
                            flex: 0.5,
                            title: 'Data',
                            margin: '0',
                            autoScroll: 'true',
                            overflowY: 'auto',
                            layout: {
                                type: 'vbox',
                                pack: 'start',
                                align: 'stretch'
                            },
                            id: 'data_Panel',

                        }
                    ]
                },
                {
                    xtype: 'panel',
                    flex: 0.75,
                    region: 'center',
                    margin: '0 3 3 0',
                    border: false,
                    layout: {
                        type: 'vbox',
                        pack: 'start',
                        align: 'stretch'
                    },
                    items: [
                        {
                            xtype: 'workflowview',
                            flex: 0.9,
                            border: false,
                        }
                    ]
                },
                {
                    xtype: 'panel',
                    border: true,
                    flex: 0.25,
                    title: 'Result',
                    region: 'east',
                    split: true,
                    collapsible: true,
                    margin: '0 3 3 0',
                    layout: {
                        type: 'vbox',
                        pack: 'position',
                        align: 'stretch'
                    },
                    items: [
                        {
                            xtype: 'panel',
                            id: 'result_map',
                            flex: 0.6,
                            anchor: '100%',
                        },
                        {
                            xtype: 'tabpanel',
                            flex: 0.4,
                            id: 'result-tab-id',
                            tabBar: {
                                height: 25,
                                padding: '1 5 1 5',
                                defaults: {
                                    height: 25,
                                    padding: '1 5 1 5',
                                },
                            },
                            items: [
                                {
                                    title: 'Layers',
                                    xtype: 'panel',
                                    tabConfig: {
                                        style: {                                            
                                            margin: '0px'
                                        }
                                    },
                                    flex: 0.4,
                                    id: 'layers_control_panel',
                                    layout: {
                                        type: 'vbox',
                                        pack: 'position',
                                        align: 'stretch'
                                    },
                                    bodyPadding: '10',
                                    autoScroll: 'true',
                                    overflowY: 'auto',
                                    items: [

                                    ]
                                },
                                {
                                    title: 'Results',
                                    xtype: 'panel',
                                    flex: 0.4,
                                    id: 'result_control_panel',
                                    layout: {
                                        type: 'vbox',
                                        pack: 'position',
                                        align: 'stretch'
                                    },
                                    bodyPadding: '10',
                                    autoScroll: 'true',
                                    overflowY: 'auto',
                                    items: [

                                    ]
                                }
                            ]
                        }
                    ],
                    listeners: {
                        resize: function () {
                            WorkflowApp.app.wkfCtrl.map.invalidateSize();
                        }
                    }
                }
            ]
        }
    ],
    listeners: {
        resize: function () {
            if (Ext.getCmp("config_form")) {
                Ext.getCmp("config_form").center();
            }
        }
    }
});
