
"use strict";
Ext.define('WorkflowApp.view.workflow.WorkflowView', {
    extend: 'Ext.tab.Panel',
    xtype: 'workflowview',
    controller: 'workflow-main',
    itemId: 'workflow_view',
    id: 'workflow_view',
    requires: [
        'WorkflowApp.view.workflow.WorkflowController'
    ],
    activeTab: 0,
    items: [
        {
            xtype: 'panel',
            title: 'Workflow',
            border: false,
            layout: {
                type: 'vbox',
                pack: 'start',
                align: 'stretch'
            },
            items: [
                {
                    xtype: 'panel',
                    height: 40,
                    layout: {
                        type: 'hbox',
                        pack: 'start',
                        align: ''
                    },
                    bodyPadding: '1 5 1 1',
                    items: [
                        {
                            xtype: 'combobox',
                            anchor: '100%',
                            id: 'packages',
                            width: '200px',
                            multiSelect: false,
                            inputWrapCls: '',
                            style: {
                                border: 'solid 0.5px #cccccc'
                            },
                            store: Ext.create('Ext.data.Store', {
                                fields: ['name', 'title'],
                                data: [{'name': 'Standard', title: 'Standard Format'},{'name': 'ILWIS', title: 'ILWIS Model Builder'}, {'name': 'QGIS', title: 'QGIS Processing Modeler'}, {'name': 'ERDAS Imagine', title: 'ERDAS Spatial Modeler'}, {'name': 'ArcGIS', title: 'ArcMap Modeler'}],
                            }),
                            queryMode: 'local',
                            displayField: 'title',
                            valueField: 'name',
                            margin: '0 2',
                            listeners: {
                                afterrender: function () {
                                    this.setValue(this.store.getAt(0).get('name'));
                                },
                                select: function () {
                                    Ext.getCmp("fileForUpload").fileInputEl.set({
                                        accept: this.getValue() === "QGIS" ? ".model" : ".json"
                                    })
                                }
                            }
                        },
                        {
                            xtype: 'filefield',
                            allowBlank: true,
                            buttonText: '',
                            buttonOnly: true,
                            hideLabel: true,
                            id: 'fileForUpload',
                            buttonConfig: {
                                xtype: 'filebutton',
                                ui: 'default-toolbar-small',
                                tooltip: 'Upload workflow',
                                tooltipType: 'title',
                                width: 25,
                                cls: 'upload-icon',
                                style: {
                                    border: 'solid 0px rgb(95, 162, 221);'
                                },
                                handler: function () {
                                    document.getElementById(this.getId()).style.background = 'url(img/upload-icon.png)';
                                    document.getElementById(this.getId()).style['background-repeat'] = 'no-repeat';
                                    document.getElementById(this.getId()).style['background-size'] = '20px 20px';
                                    document.getElementById(this.getId()).style['background-position'] = 'center';
                                }
                            },
                            style: {
                                border: 'solid 0.5px rgb(95, 162, 221);',
                                padding: '1px',
                                margin: '0px 4px 2px 4px'
                            },
                            listeners: {
                                afterrender: function (cmp) {
                                    cmp.fileInputEl.set({
                                        accept: ".json"
                                    });
                                    document.getElementById(cmp.getId() + '-button-fileInputEl').addEventListener('change', function (event) {
                                        var file = event.target.files[0];
                                        var reader = new FileReader();
                                        reader.readAsText(file, "UTF-8");
                                        reader.onload = function (event) {
                                            if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length > 0) {
                                                Ext.MessageBox.show({
                                                    title: 'Clear the current workflow?',
                                                    msg: 'This will delete the current processes and replace with the uploaded',
                                                    buttons: Ext.MessageBox.YESNO,
                                                    buttonText: {
                                                        yes: "Yes, Clear!",
                                                        no: "No, Retain!"
                                                    },
                                                    fn: function (btn) {
                                                        if (btn == "yes") {
                                                            for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; i++) {
                                                                d3.selectAll("#rect_" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].id).remove();
                                                            }
                                                            d3.selectAll("#WorkflowPanel-innerCt svg").remove();
                                                            d3.selectAll("line").remove();
                                                            d3.selectAll("rect.xxx-box").remove();
                                                            d3.selectAll("div.text_inputs").remove();
                                                            d3.select("#WorkflowPanel-innerCt").append("svg")
                                                                    .attr("width", Ext.getCmp("WorkflowPanel").getWidth() * 1.5)
                                                                    .attr("height", Ext.getCmp("WorkflowPanel").getHeight() * 1.5);
                                                            WorkflowApp.app.wkfCtrl.workflows = {
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
                                                            };
                                                            WorkflowApp.app.wkfCtrl.map.eachLayer(function (lyr) {
                                                                if (lyr.options.id == "ProcessLayers") {
                                                                    WorkflowApp.app.wkfCtrl.map.removeLayer(lyr);
                                                                }
                                                            });
                                                            WorkflowApp.app.wkfCtrl.layers = {};
                                                            Ext.getCmp("layers_control_panel").removeAll();
                                                            Ext.getCmp("result_control_panel").removeAll();
                                                            Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</span></pre>");
                                                        }
                                                        Ext.Ajax.request({
                                                            url: 'app/api/upload_workflow.py',
                                                            method: 'post',
                                                            params: {
                                                                package: Ext.getCmp("packages").getValue(),
                                                                workflow: event.target.result
                                                            },
                                                            success: function (response) {
                                                                if (response.responseText == "") {
                                                                    Ext.Msg.alert('Error!', 'Error importing Workflow!', Ext.emptyFn);
                                                                } else {
                                                                    WorkflowApp.app.wkfCtrl.importFromJSON(response.responseText);
                                                                    var result = JSON.parse(response.responseText);
                                                                    var json = result["workflows"];
                                                                    WorkflowApp.app.wkfCtrl.workflows["workflows"][0]["metadata"]["longname"] = json[0]["metadata"]["longname"];
                                                                    Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</span></pre>");
                                                                    if (Ext.getCmp("workflow_name")) {
                                                                        Ext.getCmp("workflow_name").setValue(json[0]["metadata"]["longname"]);
                                                                    }
                                                                    if (Ext.getCmp("workflow_name2")) {
                                                                        Ext.getCmp("workflow_name2").setValue(json[0]["metadata"]["longname"]);
                                                                    }
                                                                }
                                                            }
                                                        });
                                                        event.target.files = [];
                                                        Ext.getCmp("fileForUpload").setValue("");
                                                        document.getElementById(cmp.getId() + '-button-fileInputEl').value = "";
                                                    }
                                                });
                                            } else {
                                                Ext.Ajax.request({
                                                    url: 'app/api/upload_workflow.py',
                                                    method: 'post',
                                                    params: {
                                                        package: Ext.getCmp("packages").getValue(),
                                                        workflow: event.target.result
                                                    },
                                                    success: function (response) {
                                                        if (response.responseText == "") {
                                                            Ext.Msg.alert('Error!', 'Error importing Workflow!', Ext.emptyFn);
                                                        } else {
                                                            WorkflowApp.app.wkfCtrl.importFromJSON(response.responseText);
                                                        }
                                                    }
                                                });
                                                event.target.files = [];
                                                Ext.getCmp("fileForUpload").setValue("");
                                                document.getElementById(cmp.getId() + '-button-fileInputEl').value = "";
                                            }


                                        };
                                    }, false);
                                }
                            }
                        },
                        {
                            xtype: 'label',
                            style: {
                                cursor: 'pointer',
                                border: 'solid 0.5px rgb(95, 162, 221)',
                                padding: '1px',
                                margin: '0px 4px 2px 0px'
                            },
                            tip: 'Download workflow',
                            html: "<img src='img/download-icon.png' width='25px' height='25px' >",
                            listeners: {
                                render: function (c) {
                                    Ext.create('Ext.tip.ToolTip', {
                                        target: c.getEl(),
                                        html: c.tip,
                                        tooltipType: 'title',
                                    });
                                    c.getEl().on('click', function () {
                                        var textToWrite = JSON.stringify(WorkflowApp.app.wkfCtrl.workflows);
                                        Ext.Ajax.request({
                                            url: 'app/api/download_workflow.py',
                                            method: 'post',
                                            params: {
                                                package: Ext.getCmp("packages").getValue(),
                                                workflow: textToWrite
                                            },
                                            success: function (response) {
                                                textToWrite = response.responseText;
                                                var textFileAsBlob = new Blob([textToWrite], {type: 'application/json'});
                                                var fileNameToSaveAs = WorkflowApp.app.wkfCtrl.workflows["workflows"][0]['metadata']['longname'] + ".json";
                                                if (Ext.getCmp("packages").getValue() == "QGIS") {
                                                    textFileAsBlob = new Blob([textToWrite], {type: 'application/model'});
                                                    fileNameToSaveAs = "Workflow.model";
                                                }
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
                                    });
                                }
                            }
                        },
                        {
                            xtype: 'label',
                            style: {
                                cursor: 'pointer',
                                border: 'solid 0.5px rgb(95, 162, 221)',
                                padding: '1px',
                                margin: '0px 4px 2px 0px'
                            },
                            tip: 'Remove Operations',
                            html: "<img src='img/trash-icon.png' width='25px' height='25px' >",
                            listeners: {
                                render: function (c) {
                                    Ext.create('Ext.tip.ToolTip', {
                                        target: c.getEl(),
                                        html: c.tip,
                                        tooltipType: 'title',
                                    });
                                    c.getEl().on('click', function () {
                                        if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length > 0) {
                                            Ext.MessageBox.show({
                                                title: 'Clear the current workflow?',
                                                msg: 'This will delete the current processes.',
                                                buttons: Ext.MessageBox.YESNO,
                                                buttonText: {
                                                    yes: "Yes, Clear!",
                                                    no: "No, Retain!"
                                                },
                                                fn: function (btn) {
                                                    if (btn == "yes") {
                                                        for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; i++) {
                                                            d3.selectAll("#rect_" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].id).remove();
                                                        }

                                                        d3.selectAll("#WorkflowPanel-innerCt svg").remove();
                                                        d3.selectAll("line").remove();
                                                        d3.selectAll("rect.xxx-box").remove();
                                                        d3.selectAll("div.text_inputs").remove();
                                                        d3.select("#WorkflowPanel-innerCt").append("svg")
                                                                .attr("width", Ext.getCmp("WorkflowPanel").getWidth() * 1.5)
                                                                .attr("height", Ext.getCmp("WorkflowPanel").getHeight() * 1.5);
                                                        WorkflowApp.app.wkfCtrl.workflows = {
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
                                                        };
                                                        WorkflowApp.app.wkfCtrl.map.eachLayer(function (lyr) {
                                                            if (lyr.options.id == "ProcessLayers") {
                                                                WorkflowApp.app.wkfCtrl.map.removeLayer(lyr);
                                                            }
                                                        });
                                                        WorkflowApp.app.wkfCtrl.layers = {};
                                                        Ext.getCmp("layers_control_panel").removeAll();
                                                        Ext.getCmp("result_control_panel").removeAll();
                                                        Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</span></pre>");
                                                    }
                                                }
                                            })
                                        }

                                    });
                                }
                            }
                        },
                        {
                            xtype: 'label',
                            style: {
                                cursor: 'pointer',
                                border: 'solid 0.5px rgb(95, 162, 221)',
                                padding: '1px',
                                margin: '0px 4px 2px 0px'
                            },
                            html: "<img src='img/execute.png' width='25px' height='25px' >",
                            tip: 'Execute workflow',
                            listeners: {
                                render: function (c) {
                                    Ext.create('Ext.tip.ToolTip', {
                                        target: c.getEl(),
                                        html: c.tip,
                                        tooltipType: 'title',
                                    });
                                    c.getEl().on("click", function () {
                                        WorkflowApp.app.wkfCtrl.executeWorkflow();
                                    });
                                }
                            }
                        },
                        {
                            xtype: 'panel',
                            flex: 1,
                            margin: '0 2',
                            border: false,
                            layout: {
                                type: 'hbox',
                                pack: 'end',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'textfield',
                                    width: 200,
                                    id: 'workflow_name',
                                    tip: 'Name of your workflow',
                                    listeners: {
                                        afterrender: function (c) {
                                            Ext.create('Ext.tip.ToolTip', {
                                                target: c.getEl(),
                                                html: c.tip,
                                                tooltipType: 'title',
                                            });
                                            this.setValue(WorkflowApp.app.wkfCtrl.workflows["workflows"][0]['metadata']['longname']);
                                        }
                                    }
                                },
                                {
                                    xtype: 'button',
                                    text: 'Update',
                                    tip: 'Change the name of your workflow',
                                    listeners: {
                                        render: function (c) {
                                            Ext.create('Ext.tip.ToolTip', {
                                                target: c.getEl(),
                                                html: c.tip,
                                                tooltipType: 'title',
                                            });
                                        },
                                        click: function () {
                                            if (Ext.getCmp("workflow_name2")) {
                                                Ext.getCmp("workflow_name2").setValue(Ext.getCmp("workflow_name").getValue());
                                            }
                                            WorkflowApp.app.wkfCtrl.workflows["workflows"][0]['metadata']['longname'] = Ext.getCmp("workflow_name").getValue();
                                            Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</span></pre>");

                                        }
                                    }
                                }
                            ]
                        }
                    ]
                },
                {
                    xtype: 'panel',
                    id: 'WorkflowPanel',
                    itemId: 'WorkflowPanel',
                    border: true,
                    margin: 3,
                    flex: 1,
                    autoScroll: 'true',
                    overflowY: 'auto',
                    listeners: {
                        resize: function () {

                        },
                        render: function (p) {
                            p.body.on('scroll', function () {
                                d3.select("#WorkflowPanel-innerCt svg")
                                        .transition().duration(0)
                                        .attr("width", Ext.getCmp("WorkflowPanel").getWidth() * 2)
                                        .attr("height", Ext.getCmp("WorkflowPanel").getHeight() * 2);
                            }, p);
                        }
                    }
                }
            ]
        },
        {
            xtype: 'panel',
            title: 'JSON',
            border: false,
            layout: {
                type: 'vbox',
                pack: 'start',
                align: 'stretch'
            },
            items: [
                {
                    xtype: 'panel',
                    height: 40,
                    layout: {
                        type: 'hbox',
                        pack: 'start',
                        align: ''
                    },
                    bodyPadding: '1 5 1 1',
                    items: [
                        {
                            xtype: 'combobox',
                            anchor: '100%',
                            id: 'packages2',
                            width: '200px',
                            multiSelect: false,
                            inputWrapCls: '',
                            style: {
                                border: 'solid 0.5px #cccccc'
                            },
                            store: Ext.create('Ext.data.Store', {
                                fields: ['name', 'title'],
                                data: [{'name': 'Standard', title: 'Standard Format'},{'name': 'ILWIS', title: 'ILWIS Model Builder'}, {'name': 'QGIS', title: 'QGIS Processing Modeler'}, {'name': 'ERDAS Imagine', title: 'ERDAS Spatial Modeler'}, {'name': 'ArcGIS', title: 'ArcMap Modeler'}],
                            }),
                            queryMode: 'local',
                            displayField: 'title',
                            valueField: 'name',
                            margin: '0 2',
                            listeners: {
                                afterrender: function () {
                                    this.setValue(this.store.getAt(0).get('name'));
                                },
                                select: function () {
                                    Ext.getCmp("fileForUpload2").fileInputEl.set({
                                        accept: this.getValue() === "QGIS" ? ".model" : ".json"
                                    })
                                }
                            }
                        },
                        {
                            xtype: 'filefield',
                            allowBlank: true,
                            buttonText: '',
                            buttonOnly: true,
                            hideLabel: true,
                            id: 'fileForUpload2',
                            buttonConfig: {
                                xtype: 'filebutton',
                                ui: 'default-toolbar-small',
                                tooltip: 'Upload workflow',
                                tooltipType: 'title',
                                width: 25,
                                cls: 'upload-icon',
                                style: {
                                    border: 'solid 0px rgb(95, 162, 221);'
                                },
                                handler: function () {
                                    document.getElementById(this.getId()).style.background = 'url(img/upload-icon.png)';
                                    document.getElementById(this.getId()).style['background-repeat'] = 'no-repeat';
                                    document.getElementById(this.getId()).style['background-size'] = '20px 20px';
                                    document.getElementById(this.getId()).style['background-position'] = 'center';
                                }
                            },
                            style: {
                                border: 'solid 0.5px rgb(95, 162, 221);',
                                padding: '1px',
                                margin: '0px 4px 2px 4px'
                            },
                            listeners: {
                                afterrender: function (cmp) {
                                    cmp.fileInputEl.set({
                                        accept: '.json'
                                    });
                                    document.getElementById(cmp.getId() + '-button-fileInputEl').addEventListener('change', function (event) {
                                        var file = event.target.files[0];
                                        var reader = new FileReader();
                                        reader.readAsText(file, "UTF-8");
                                        reader.onload = function (event) {
                                            if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length > 0) {
                                                Ext.MessageBox.show({
                                                    title: 'Clear the current workflow?',
                                                    msg: 'This will delete the current processes and replace with the uploaded',
                                                    buttons: Ext.MessageBox.YESNO,
                                                    buttonText: {
                                                        yes: "Yes, Clear!",
                                                        no: "No, Retain!"
                                                    },
                                                    fn: function (btn) {
                                                        if (btn == "yes") {
                                                            for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; i++) {
                                                                d3.selectAll("#rect_" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].id).remove();
                                                            }
                                                            d3.selectAll("#WorkflowPanel-innerCt svg").remove();
                                                            d3.selectAll("line").remove();
                                                            d3.selectAll("rect.xxx-box").remove();
                                                            d3.selectAll("div.text_inputs").remove();
                                                            d3.select("#WorkflowPanel-innerCt").append("svg")
                                                                    .attr("width", Ext.getCmp("WorkflowPanel").getWidth() * 1.5)
                                                                    .attr("height", Ext.getCmp("WorkflowPanel").getHeight() * 1.5);
                                                            WorkflowApp.app.wkfCtrl.workflows = {
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
                                                            };
                                                            WorkflowApp.app.wkfCtrl.map.eachLayer(function (lyr) {
                                                                if (lyr.options.id == "ProcessLayers") {
                                                                    WorkflowApp.app.wkfCtrl.map.removeLayer(lyr);
                                                                }
                                                            });
                                                            WorkflowApp.app.wkfCtrl.layers = {};
                                                            Ext.getCmp("layers_control_panel").removeAll();
                                                            Ext.getCmp("result_control_panel").removeAll();
                                                            Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</span></pre>");
                                                        }
                                                        Ext.Ajax.request({
                                                            url: 'app/api/upload_workflow.py',
                                                            method: 'post',
                                                            params: {
                                                                package: Ext.getCmp("packages2").getValue(),
                                                                workflow: event.target.result
                                                            },
                                                            success: function (response) {
                                                                if (response.responseText == "") {
                                                                    Ext.Msg.alert('Error!', 'Error importing Workflow!', Ext.emptyFn);
                                                                } else {
                                                                    WorkflowApp.app.wkfCtrl.importFromJSON(response.responseText);
                                                                }
                                                            }
                                                        });
                                                        event.target.files = [];
                                                        Ext.getCmp("fileForUpload2").setValue("");
                                                        document.getElementById(cmp.getId() + '-button-fileInputEl').value = "";
                                                    }
                                                });
                                            } else {
                                                Ext.Ajax.request({
                                                    url: 'app/api/upload_workflow.py',
                                                    method: 'post',
                                                    params: {
                                                        package: Ext.getCmp("packages2").getValue(),
                                                        workflow: event.target.result
                                                    },
                                                    success: function (response) {
                                                        if (response.responseText == "") {
                                                            Ext.Msg.alert('Error!', 'Error importing Workflow!', Ext.emptyFn);
                                                        } else {
                                                            WorkflowApp.app.wkfCtrl.importFromJSON(response.responseText);
                                                            var result = JSON.parse(response.responseText);
                                                            var json = result["workflows"];
                                                            WorkflowApp.app.wkfCtrl.workflows["workflows"][0]["metadata"]["longname"] = json[0]["metadata"]["longname"];
                                                            Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</span></pre>");
                                                            if (Ext.getCmp("workflow_name")) {
                                                                Ext.getCmp("workflow_name").setValue(json[0]["metadata"]["longname"]);
                                                            }
                                                            if (Ext.getCmp("workflow_name2")) {
                                                                Ext.getCmp("workflow_name2").setValue(json[0]["metadata"]["longname"]);
                                                            }
                                                        }
                                                    }
                                                });
                                                event.target.files = [];
                                                Ext.getCmp("fileForUpload2").setValue("");
                                                document.getElementById(cmp.getId() + '-button-fileInputEl').value = "";
                                            }


                                        };
                                    }, false);
                                }
                            },
                            regex: /^.*\.(json|JSON)$/,
                            regexText: 'Only JSON file formats are accepted'
                        },
                        {
                            xtype: 'label',
                            style: {
                                cursor: 'pointer',
                                border: 'solid 0.5px rgb(95, 162, 221)',
                                padding: '1px',
                                margin: '0px 4px 2px 0px'
                            },
                            tip: 'Download workflow',
                            html: "<img src='img/download-icon.png' width='25px' height='25px' >",
                            listeners: {
                                render: function (c) {
                                    Ext.create('Ext.tip.ToolTip', {
                                        target: c.getEl(),
                                        html: c.tip,
                                        tooltipType: 'title',
                                    });
                                    c.getEl().on('click', function () {
                                        var textToWrite = JSON.stringify(WorkflowApp.app.wkfCtrl.workflows);
                                        Ext.Ajax.request({
                                            url: 'app/api/download_workflow.py',
                                            method: 'post',
                                            params: {
                                                package: Ext.getCmp("packages2").getValue(),
                                                workflow: textToWrite
                                            },
                                            success: function (response) {
                                                textToWrite = response.responseText;
                                                var textFileAsBlob = new Blob([textToWrite], {type: 'application/json'});
                                                var fileNameToSaveAs = WorkflowApp.app.wkfCtrl.workflows["workflows"][0]['metadata']['longname'] + ".json";
                                                if (Ext.getCmp("packages").getValue() == "QGIS") {
                                                    textFileAsBlob = new Blob([textToWrite], {type: 'application/model'});
                                                    fileNameToSaveAs = "Workflow.model";
                                                }
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
                                    });
                                }
                            }
                        },
                        {
                            xtype: 'label',
                            style: {
                                cursor: 'pointer',
                                border: 'solid 0.5px rgb(95, 162, 221)',
                                padding: '1px',
                                margin: '0px 4px 2px 0px'
                            },
                            tip: 'Remove Operations',
                            html: "<img src='img/trash-icon.png' width='25px' height='25px' >",
                            listeners: {
                                render: function (c) {
                                    Ext.create('Ext.tip.ToolTip', {
                                        target: c.getEl(),
                                        html: c.tip,
                                        tooltipType: 'title',
                                    });
                                    c.getEl().on('click', function () {
                                        if (WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length > 0) {
                                            Ext.MessageBox.show({
                                                title: 'Clear the current workflow?',
                                                msg: 'This will delete the current processes.',
                                                buttons: Ext.MessageBox.YESNO,
                                                buttonText: {
                                                    yes: "Yes, Clear!",
                                                    no: "No, Retain!"
                                                },
                                                fn: function (btn) {
                                                    if (btn == "yes") {
                                                        for (var i = 0; i < WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations.length; i++) {
                                                            d3.selectAll("#rect_" + WorkflowApp.app.wkfCtrl.workflows["workflows"][0].operations[i].id).remove();
                                                        }

                                                        d3.selectAll("#WorkflowPanel-innerCt svg").remove();
                                                        d3.selectAll("line").remove();
                                                        d3.selectAll("rect.xxx-box").remove();
                                                        d3.selectAll("div.text_inputs").remove();
                                                        d3.select("#WorkflowPanel-innerCt").append("svg")
                                                                .attr("width", Ext.getCmp("WorkflowPanel").getWidth() * 1.5)
                                                                .attr("height", Ext.getCmp("WorkflowPanel").getHeight() * 1.5);
                                                        WorkflowApp.app.wkfCtrl.workflows = {
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
                                                        };
                                                        WorkflowApp.app.wkfCtrl.map.eachLayer(function (lyr) {
                                                            if (lyr.options.id == "ProcessLayers") {
                                                                WorkflowApp.app.wkfCtrl.map.removeLayer(lyr);
                                                            }
                                                        });
                                                        WorkflowApp.app.wkfCtrl.layers = {};
                                                        Ext.getCmp("layers_control_panel").removeAll();
                                                        Ext.getCmp("result_control_panel").removeAll();
                                                        Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</span></pre>");
                                                    }
                                                }
                                            })
                                        }

                                    });
                                }
                            }
                        },
                        {
                            xtype: 'label',
                            style: {
                                cursor: 'pointer',
                                border: 'solid 0.5px rgb(95, 162, 221)',
                                padding: '1px',
                                margin: '0px 4px 2px 0px'
                            },
                            html: "<img src='img/execute.png' width='25px' height='25px' >",
                            tip: 'Execute workflow',
                            listeners: {
                                render: function (c) {
                                    Ext.create('Ext.tip.ToolTip', {
                                        target: c.getEl(),
                                        html: c.tip,
                                        tooltipType: 'title',
                                    });
                                    c.getEl().on("click", function () {
                                        WorkflowApp.app.wkfCtrl.executeWorkflow();
                                    });
                                }
                            }
                        },
                        {
                            xtype: 'panel',
                            flex: 1,
                            margin: '0 2',
                            border: false,
                            layout: {
                                type: 'hbox',
                                pack: 'end',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'textfield',
                                    width: 200,
                                    id: 'workflow_name2',
                                    tip: 'Name of your workflow',
                                    listeners: {
                                        afterrender: function (c) {
                                            Ext.create('Ext.tip.ToolTip', {
                                                target: c.getEl(),
                                                html: c.tip,
                                                tooltipType: 'title',
                                            });
                                            this.setValue(WorkflowApp.app.wkfCtrl.workflows["workflows"][0]['metadata']['longname']);
                                        }
                                    }
                                },
                                {
                                    xtype: 'button',
                                    text: 'Update',
                                    tip: 'Change the name of your workflow',
                                    listeners: {
                                        render: function (c) {
                                            Ext.create('Ext.tip.ToolTip', {
                                                target: c.getEl(),
                                                html: c.tip,
                                                tooltipType: 'title',
                                            });
                                        },
                                        click: function () {
                                            if (Ext.getCmp("workflow_name")) {
                                                Ext.getCmp("workflow_name").setValue(Ext.getCmp("workflow_name2").getValue());
                                            }
                                            WorkflowApp.app.wkfCtrl.workflows["workflows"][0]['metadata']['longname'] = Ext.getCmp("workflow_name2").getValue();
                                            Ext.getCmp("jsonPanel").setHtml("<span><pre>" + JSON.stringify(WorkflowApp.app.wkfCtrl.workflows, null, 2) + "</span></pre>");

                                        }
                                    }
                                }
                            ]
                        }
                    ]
                },
                {
                    xtype: 'panel',
                    flex: 1,
                    layout: 'fit',
                    autoScroll: 'true',
                    overflowY: 'auto',
                    border: true,
                    margin: 3,
                    items: [
                        {
                            xtype: 'label',
                            id: 'jsonPanel',
                            flex: 1,
                            margin: '0 10 10 10',
                            autoScroll: 'true',
                            overflowY: 'auto',
                        }
                    ]
                }
            ]
        }
    ],
    listeners: {
        tabchange: function (tabPanel, tab) {

        },
        resize: function () {
            if (Ext.getCmp("workflow_execute_form")) {
                Ext.getCmp("workflow_execute_form").setX(Ext.getCmp('WorkflowPanel').getX());
                Ext.getCmp("workflow_execute_form").setY(this.getY());
            }

        }
    }
});