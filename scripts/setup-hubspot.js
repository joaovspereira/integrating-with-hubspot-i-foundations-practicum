const axios = require('axios');
const fs = require('node:fs');
const path = require('node:path');
const { PROPERTIES } = require('../index');
async function main() {
  if (!process.env.HUBSPOT_ACCESS_TOKEN || !/^\d+$/.test(process.env.HUBSPOT_TEST_ACCOUNT_ID || '')) throw new Error('Set HUBSPOT_ACCESS_TOKEN and HUBSPOT_TEST_ACCOUNT_ID for your developer test account.');
  const api = axios.create({ baseURL: 'https://api.hubapi.com', timeout: 15000, headers: { Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}` } });
  const tokenInfo = await api.get('/account-info/v3/details');
  if (String(tokenInfo.data.portalId) !== process.env.HUBSPOT_TEST_ACCOUNT_ID) throw new Error('Token account does not match the specified developer test account.');
  if (process.env.CONFIRM_DEVELOPER_TEST_ACCOUNT !== 'yes') throw new Error('After confirming this is a developer TEST account, set CONFIRM_DEVELOPER_TEST_ACCOUNT=yes.');
  const schemas = (await api.get('/crm/v3/schemas')).data.results;
  let schema = schemas.find(item => item.name === 'educational_project');
  if (!schema) {
    schema = (await api.post('/crm/v3/schemas', {
      name: 'educational_project', labels: { singular: 'Educational Project', plural: 'Educational Projects' },
      primaryDisplayProperty: 'project_name', requiredProperties: PROPERTIES,
      searchableProperties: ['project_name'], secondaryDisplayProperties: PROPERTIES.slice(1),
      properties: PROPERTIES.map(name => ({ name, label: name.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' '), type: 'string', fieldType: 'text' }))
    })).data;
  }
  for (const name of PROPERTIES) {
    if (!schema.properties?.some(property => property.name === name && property.type === 'string')) throw new Error(`Existing schema is incompatible: ${name}. No properties were changed.`);
  }
  // Persist only the non-secret identifier; never write the token or invent a CRM URL.
  fs.writeFileSync(path.join(__dirname, '../hubspot-object.json'), JSON.stringify({ objectTypeId: schema.objectTypeId, portalId: tokenInfo.data.portalId }, null, 2) + '\n');
  console.log('Custom object ready. Set HUBSPOT_OBJECT_TYPE=' + schema.objectTypeId);
  console.log('Open the object in your HubSpot developer test account and copy the exact browser URL to README.md.');
}
main().catch(error => { console.error('Setup failed:', error.response?.status || error.message); process.exitCode = 1; });
