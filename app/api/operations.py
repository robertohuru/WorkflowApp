import ilwis
from xml.dom import minidom

doc = minidom.Document()
root = doc.createElement('operations')
doc.appendChild(root)

ilwis.Engine.setWorkingCatalog("file:///C:/ms4w/Apache/htdocs/WorkflowApp/app/api")
def addTag1(parent, name):
    child = doc.createElement(name)
    parent.appendChild(child)
    return child

def addTag2(parent, name, value):
    if len(value) > 0 and value != '?':
        child = doc.createElement(name)
        text = doc.createTextNode(value)
        child.appendChild(text)
        parent.appendChild(child)

def addAttribute(parent, name, value):
    parent.setAttribute(name, value)

def getType(type):
    types = {68719476736: 'String',
             4294967296: 'Signed 64-bits Integer',
             32768: 'Flat Table',
             16384: 'Attribute Table',
             288230376151711744: 'Column',
             274877906944: 'Time',
             137438953472: 'Date',
             17179869184: 'Double Precision Floating Point Value',
             8589934592: 'Single Precision Floating Point Value',
             2147483648: 'Unsigned 64-bits Integer',
             1073741824: 'Signed 32-bits Integer',
             536870912: 'Unsigned 32-bits Integer',
             268435456: 'Signed 16-bits Integer',
             134217728: 'Unsigned 16-bits Integer',
             67108864: 'Signed 8-bits Integer',
             33554432: 'Unsigned 8-bits Integer',
             16777216: 'Boolean value',
             144115188075855872: 'Lat/Lon Coordinate',
             549755813888: 'Metric Coordinate',
             1099511627776: 'Pixel'}
    if type in types:
        return types[type]
    else:
        return ''

def type2Name(type):
    tp = getType(type)
    if len(tp) > 0:
        return tp
    else:
        bits = bin(int(type))[2:]
        val = int(pow(2, len(bits) - 1))
        type2 = ''
        for b in bits:
            if b == '1':
                if len(type2) > 0:
                    type2 += ','
                probe = getType(val)
                if len(probe) > 0:
                    type2 += probe
                else:
                    type2 += str(val)
                    print(val)
            val = int(val / 2)
        return type2

csy = ilwis.CoordinateSystem('epsg:4326') # dummy object for performing type2Name

operations = ilwis.Engine.operations()

for operation in operations:
    print(operation)
    if 'production' in operation:
        syntax = ilwis.Engine.operationMetaData(operation,'syntax').split(';')
        longname = ilwis.Engine.operationMetaData(operation,'longname').split(';')
        description = ilwis.Engine.operationMetaData(operation,'description').split(';')
        namespace = ilwis.Engine.operationMetaData(operation,'namespace').split(';')
        keyword = ilwis.Engine.operationMetaData(operation,'keyword').split(';')
        nrOps = len(namespace)
        for op in range(0, nrOps):
            inparams = ilwis.Engine.operationMetaData(operation,'inparameters').split(';')[op]
            inparams = inparams.split('|')
            maxinparams = int(inparams[len(inparams) - 1])
            outparams = ilwis.Engine.operationMetaData(operation,'outparameters').split(';')[op]
            outparams = outparams.split('|')
            maxoutparams = int(outparams[len(outparams) - 1])
            oper = addTag1(root, 'operation')
            addTag2(oper, 'name', operation)
            addTag2(oper, 'longname', longname[op])
            addTag2(oper, 'description', description[op])
            addTag2(oper, 'namespace', namespace[op])
            keyw = addTag1(oper, 'keywords')
            for k in keyword[op].split(','):
                addTag2(keyw, 'keyword', k)
            addTag2(oper, 'syntax', syntax[op])

            inp = addTag1(oper, 'input_parameters')

            for i in range(1,maxinparams + 1):
                type = ilwis.Engine.operationMetaData(operation,'pin_' + str(i) + '_type').split(';')[op]

                if type == '?':
                    continue
                if csy.type2Name(int(type)) != '?':
                    type = csy.type2Name(int(type))
                else:
                    bits = bin(int(type))[2:]
                    val = int(pow(2, len(bits) - 1))
                    type2 = ''
                    for b in bits:
                        if b == '1':
                            probe = csy.type2Name(val)
                            if len(probe) > 0 and probe != '?':
                                if len(type2) > 0:
                                    type2 += ','
                                type2 += probe
                        val = int(val / 2)
                    if len(type2) > 0:
                        type = type2
                    else:
                        type2 = type2Name(type)
                        if len(type2) > 0:
                            type = type2

                term = ilwis.Engine.operationMetaData(operation,'pin_' + str(i) + '_term').split(';')[op]
                name = ilwis.Engine.operationMetaData(operation,'pin_' + str(i) + '_name').split(';')[op]
                name = name.lstrip('0123456789.- ')
                desc = ilwis.Engine.operationMetaData(operation,'pin_' + str(i) + '_desc').split(';')[op]
                optional = ilwis.Engine.operationMetaData(operation,'pin_' + str(i) + '_optional').split(';')[op]
                needsquotes = ilwis.Engine.operationMetaData(operation,'pin_' + str(i) + '_needsquotes').split(';')[op]
                altUIType = ilwis.Engine.operationMetaData(operation,'pin_' + str(i) + '_altUIType').split(';')[op]
                validationsource = ilwis.Engine.operationMetaData(operation,'pin_' + str(i) + '_validationsource').split(';')[op]
                validationcondition = ilwis.Engine.operationMetaData(operation,'pin_' + str(i) + '_validationcondition').split(';')[op]
                parm = addTag1(inp, 'parameter')
                addTag2(parm, 'name', name)
                tps = addTag1(parm, 'types')
                for t in type.split(','):
                    addTag2(tps, 'type', t)
                addTag2(parm, 'term', term)
                addTag2(parm, 'desc', desc)
                addTag2(parm, 'optional', optional)
                addTag2(parm, 'needsquotes', needsquotes)
                addTag2(parm, 'altUIType', altUIType)
                addTag2(parm, 'validationsource', validationsource)
                addTag2(parm, 'validationcondition', validationcondition)

            outp = addTag1(oper, 'output_parameters')

            for i in range(1,maxoutparams + 1):
                type = ilwis.Engine.operationMetaData(operation,'pout_' + str(i) + '_type').split(';')[op]
                if type == '?':
                    continue
                if csy.type2Name(int(type)) != '?':
                    type = csy.type2Name(int(type))
                else:
                    bits = bin(int(type))[2:]
                    val = int(pow(2, len(bits) - 1))
                    type2 = ''
                    for b in bits:
                        if b == '1':
                            probe = csy.type2Name(val)
                            if len(probe) > 0 and probe != '?':
                                if len(type2) > 0:
                                    type2 += ','
                                type2 += probe
                        val = int(val / 2)
                    if len(type2) > 0:
                        type = type2
                    else:
                        type2 = type2Name(type)
                        if len(type2) > 0:
                            type = type2
                term = ilwis.Engine.operationMetaData(operation,'pout_' + str(i) + '_term').split(';')[op]
                name = ilwis.Engine.operationMetaData(operation,'pout_' + str(i) + '_name').split(';')[op]
                desc = ilwis.Engine.operationMetaData(operation,'pout_' + str(i) + '_desc').split(';')[op]
                optional = ilwis.Engine.operationMetaData(operation,'pout_' + str(i) + '_optional').split(';')[op]
                needsquotes = ilwis.Engine.operationMetaData(operation,'pout_' + str(i) + '_needsquotes').split(';')[op]
                altUIType = ilwis.Engine.operationMetaData(operation,'pout_' + str(i) + '_altUIType').split(';')[op]
                validationsource = ilwis.Engine.operationMetaData(operation,'pout_' + str(i) + '_validationsource').split(';')[op]
                validationcondition = ilwis.Engine.operationMetaData(operation,'pout_' + str(i) + '_validationcondition').split(';')[op]
                input = ilwis.Engine.operationMetaData(operation,'pout_' + str(i) + '_input').split(';')[op]
                parm = addTag1(outp, 'parameter')
                addTag2(parm, 'name', name)
                tps = addTag1(parm, 'types')
                for t in type.split(','):
                    addTag2(tps, 'type', t)
                addTag2(parm, 'term', term)
                addTag2(parm, 'desc', desc)
                addTag2(parm, 'optional', optional)
                addTag2(parm, 'needsquotes', needsquotes)
                addTag2(parm, 'altUIType', altUIType)
                addTag2(parm, 'validationsource', validationsource)
                addTag2(parm, 'validationcondition', validationcondition)
                addTag2(parm, 'output_is_input', input)

print('\n')

xml_str = doc.toprettyxml(indent='  ')
print(xml_str)

with open("ilwis_operations.xml", "w") as f:
    f.write(xml_str)

