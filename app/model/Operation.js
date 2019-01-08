/*--- Report model ---*/
Ext.define('WorkflowApp.model.Operation', {
    extend: 'Ext.data.Model',
    fields: [        
        {name: 'id', type: 'auto'},
        {name: 'metadata', type: 'auto'},
        {name: 'inputs', type: 'auto'},
        {name: 'outputs', type: 'auto'}
    ],
    idProperty: 'id'
});
/*--- ---*/