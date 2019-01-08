Ext.define('WorkflowApp.view.workflow.ResultWindow', {
    extend: 'Ext.window.Window',
    alias: 'widget.resultwindow',
    layout: 'fit',
    draggable: true,
    padding: 1,
    border: true,
    closable: false,
    modal: false,
    resizable: true,
    style: {
        border: '2px solid rgba(0,0,0,0.3)'
    },
    title: 'Result Window',
    height: 580,
    width: 400,
    layout: {
        type: 'vbox',
        pack: 'position',
        align: 'stretch'
    },
    items: [
        {
            xtype: 'panel',
            anchor: '100%',
            id: 'result_map',
            margin: '5',
            flex: 1
        }
    ], dockedItems: [
        {
            dock: "bottom",
            xtype: "toolbar",
            style: {
                background: 'transparent'
            },
            items: [
                {
                    xtype: 'button',
                    text: 'Download',
                    id: "btnDownload",
                }
            ]
        }
    ]
});


