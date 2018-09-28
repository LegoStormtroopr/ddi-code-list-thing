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
const utils = require('./utils');
require('util.promisify').shim();

const baseurl = 'https://ddi-alliance.aristotlecloud.io/api/graphql/api';
const uuid_regex = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')

// Convert fs.readFile into Promise version   
// Thanks to https://stackoverflow.com/a/46867579
const readFile = util.promisify(fs.readFile);

exports.handler = async (event, context, callback) => {

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

  // Build graphql query
  var query = `query ($uuid: UUID) {
    valueDomains (uuid: $uuid) {
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

  return utils.process_transform(
    event, query, ddi_template_filename, function(result){
        var context = result.data.data.valueDomains.edges[0].node
      
        var cdslots = {}
        var edges = context.conceptualDomain.ConceptPtr.slots.edges
        for (var edge of edges) {
          cdslots[edge.node.name] = edge.node.value
        }
        context.conceptualDomain.slots = cdslots
      
        context.conceptualDomain.identifier = context.conceptualDomain.ConceptPtr.identifiers[0]
        return context
    }
  )
};