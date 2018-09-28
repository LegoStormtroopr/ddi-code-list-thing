const axios = require('axios')
const handlebars = require('handlebars')
const fs = require('fs')
const util = require('util')
require('util.promisify').shim();

const baseurl = 'https://ddi-alliance.aristotlecloud.io/api/graphql/api';
const url = baseurl;
const uuid_regex = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')

// Convert fs.readFile into Promise version   
// Thanks to https://stackoverflow.com/a/46867579
const readFile = util.promisify(fs.readFile);

exports.process_transform = async (event, query, template_filename, context_processor) => {

// exports.handler = async (event, context, callback) => {

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

  var valid = uuid_regex.test(uuid)
  if (!valid) {
    console.log('invalid uuid')
    return {
      statusCode: 404,
      body: 'invalid uuid'
    }
  }

  // Read xml template file
  var ddi_template_string
  try {
    // axios options
    var options = {};
    // ddi_template_string = await axios(template_filename, options);
    ddi_template_string = await readFile(template_filename, {encoding: 'utf-8'})
  } catch(err) {
    console.log(err);
    return {
      statusCode: 404,
      body: 'Template not Found'
    }
  }

  // Compile handlebars template
  var template = handlebars.compile(ddi_template_string)
  
  // axios options
  var options = {
    params: {
      raw: true,
      query: query,
      variables: {
        "uuid": uuid
      }
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

  console.log(["\n\n\n",JSON.stringify(result.data),"\n\n\n"])
  // Setup context
  if (context_processor === undefined) {
    context_processor = function(result){return result}
  }
  var context = context_processor(result);
  
  // Render template
  var xml_response = template(context)

  // Return response
  var response = {
    statusCode: 200,
    body: xml_response
  }
  return response
};