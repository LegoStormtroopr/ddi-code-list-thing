// export function handler(event, context, callback) {
//   console.log(event)
//   callback(null, {
//     statusCode: 200,
//     body: JSON.stringify({msg: "Hello, World!"})
//   })
// }

const axios = require('axios')
const handlebars = require('handlebars')
const fs = require('fs')
const util = require('util')
require('util.promisify').shim();

const baseurl = 'https://ddi-alliance.aristotlecloud.io/api/graphql/api';
const uuid_regex = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')

// Convert fs.readFile into Promise version   
// Thanks to https://stackoverflow.com/a/46867579
const readFile = util.promisify(fs.readFile);

exports.handler = async (event, context, callback) => {

  // Get uuid
  var uuid = event.queryStringParameters.uuid

  // Validate uuid
  if (uuid === undefined) {
    console.log('No uuid provided')
    return {
      statusCode: 404,
      body: 'No uuid provided'
    }
  }

  // Get ddi
  var ddi_version = event.queryStringParameters.ddi

  var ddi_template_filename;
  if (ddi_version == "3.2") {
    ddi_template_filename = 'ddi-codelist-template-3.2.xml'
    ddi_template_filename = "https://raw.githubusercontent.com/LegoStormtroopr/ddi-code-list-thing/master/ddi-codelist-template-3.2.xml"
  }
  else if (ddi_version == "3.3") {
    ddi_template_filename = 'ddi-codelist-template-3.3.xml'
    ddi_template_filename = "https://raw.githubusercontent.com/LegoStormtroopr/ddi-code-list-thing/master/ddi-codelist-template-3.3.xml"
  }
  // Validate ddi
  if (ddi_template_filename === undefined) {
    console.log('No ddi version provided')
    return {
      statusCode: 404,
      body: 'No ddi version provided'
    }
  }

  var valid = uuid_regex.test(uuid)
  if (!valid) {
    console.log('invalid uuid')
    return {
      statusCode: 404,
      body: 'invalid uuid'
    }
  }

  // Build graphql query
  var query = `query {
    valueDomains (uuid: "${uuid}") {
      edges {
        node {
          uuid
          name
          definition
          version
          conceptualDomain {
            name
            definition
            comments
            originUri
            ConceptPtr {
              slots {
                edges {
                  node {
                    name
                    value
                  }
                }
              }
              identifiers {
                identifier
                version
              }
            }
          }
          permissiblevalueSet {
            value
            valueMeaning {
              name
              definition
              order
            }
          }
          supplementaryvalueSet {
            value
            valueMeaning {
              name
              definition
              order
            }
          }
        }
      }
    }
  }`
  
  // Read xml template file
  var ddi_template_string
  try {
    // axios options
    var options = {}
    ddi_template_string = await axios(ddi_template_filename, options);
    console.log(ddi_template_string);
    // ddi_template_string = await readFile(ddi_template_filename, {encoding: 'utf-8'})
  } catch(err) {
    console.log(err);
    return {
      statusCode: 404,
      body: 'Template not Found'
    }
  }

  // Compile handlebars template
  var template = handlebars.compile(ddi_template_string.data)
  
  // axios options
  var options = {
    params: {
      raw: true,
      query: query  
    }
  }
  
  // Perform graphql query
  var result
  try {
    result = await axios(baseurl, options);
  } catch (err) {
    console.log(err.message)
    return {
      statusCode: 404,
      body: err.message
    }
  }

  // Setup context
  var context = result.data.data.valueDomains.edges[0].node

  var cdslots = {}
  var edges = context.conceptualDomain.ConceptPtr.slots.edges
  for (var edge of edges) {
    cdslots[edge.node.name] = edge.node.value
  }
  context.conceptualDomain.slots = cdslots

  context.conceptualDomain.identifier = context.conceptualDomain.ConceptPtr.identifiers[0]
  
  // Render template
  var xml_response = template(context)

  // Return response
  var response = {
    statusCode: 200,
    body: xml_response
  }
  return response
};