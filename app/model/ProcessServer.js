Ext.define('WorkflowApp.model.ProcessServer', {
    extend: 'Ext.data.TreeModel',
    fields: [
        {
            name: 'text',
            mapping: 'name',
            type: 'string'
        }
    ],
    idProperty:'name'
});