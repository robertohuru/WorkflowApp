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
        type: 'hbox',
        pack: 'start',
        align: 'stretch'
    },
    items: [
        {
            xtype: 'panel',
            width: 300,
            margin: '0 3 3 0',
            layout: {
                type: 'vbox',
                pack: 'start',
                align: 'stretch'
            },
            autoScroll: 'true',
            overflowY: 'auto',
            border: false,
            id: 'navigation_panel',
            header: {
                title: 'Web Services',
                id: 'mainheader',
                iconCls: 'x-fa fa-list',
                height: 100,
                listeners: {
                    click: function () {
                        if (Ext.getCmp("navigation_panel").getWidth() == 300) {
                            Ext.getCmp("navigation_panel").setWidth(50);
                            this.setTitle("");
                        } else {
                            Ext.getCmp("navigation_panel").setWidth(300);
                            this.setTitle("Web Services");
                        }

                    }
                }
            },
            items: [
                {
                    xtype: 'panel',
                    header: {
                        title: 'Processing Services',
                        margin: '0px',
                        padding: '3px 15px',
                        iconCls: 'x-fa fa-cog',
                    },
                    flex: 0.5,
                    margin: '0 0 3 0',
                    autoScroll: 'true',
                    overflowY: 'auto',
                    overflowX: 'auto',
                    layout: {
                        type: 'vbox',
                        pack: 'start',
                        align: 'stretch'
                    },
                    id: 'processes_Panel',
                    border: false

                },
                {
                    xtype: 'panel',
                    header: {
                        title: 'Data Services',
                        margin: '0px',
                        padding: '3px 15px',
                        iconCls: 'x-fa fa-database',
                    },
                    flex: 0.5,
                    margin: '0',
                    autoScroll: 'true',
                    overflowY: 'auto',
                    overflowX: 'auto',
                    border: false,
                    layout: {
                        type: 'vbox',
                        pack: 'start',
                        align: 'stretch'
                    },
                    id: 'data_Panel'

                }
            ]
        },
        {
            xtype: 'panel',
            flex: 1,
            layout: 'border',
            border: false,
            items: [
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
                            listeners: {
                                resize: function () {
                                    if (Ext.getCmp('config_panel')) {
                                        Ext.getCmp('config_panel').setX(Ext.getCmp("workflow_view").getX() + Ext.getCmp("workflow_view").getWidth() - Ext.getCmp('config_panel').getWidth() - 2);
                                        Ext.getCmp('config_panel').setY(Ext.getCmp("workflow_view").getY() + 2);
                                    }
                                }
                            }
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
                    collapseMode: 'header',
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
                            layout: 'fit'
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
                            if (WorkflowApp.app.wkfCtrl.map !== null) {
                                WorkflowApp.app.wkfCtrl.map.updateSize();
                            }

                        }
                    }
                }
            ]
        },
    ],
    listeners: {
        resize: function () {
            if (Ext.getCmp("config_form")) {
                Ext.getCmp("config_form").center();
            }
        }
    }
});

