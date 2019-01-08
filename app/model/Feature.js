/*--- Feature model ---*/
Ext.define('WorkflowApp.model.Feature', {
    extend: 'Ext.data.Model',
    fields: [        
        {name: 'url', type: 'string'},
        {name: 'name', type: 'string'},
        {name: 'title', type: 'string'},
        {name: 'abstract', type: 'string'},
        {name: 'defaultCRS', type: 'string'},
        {name: 'properties', type: 'auto'}
    ],
    idProperty: 'name'
});

