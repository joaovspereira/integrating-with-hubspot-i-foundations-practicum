const express = require('express');
const axios = require('axios');
const path = require('node:path');
const PROPERTIES = ['project_name', 'project_type', 'target_audience', 'project_status'];

function createApp({ token = process.env.HUBSPOT_ACCESS_TOKEN, objectType = process.env.HUBSPOT_OBJECT_TYPE, client } = {}) {
  if (!token || !/^2-\d+$/.test(objectType || '')) {
    throw new Error('Set HUBSPOT_ACCESS_TOKEN and a custom object HUBSPOT_OBJECT_TYPE (2-...).');
  }
  const api = client || axios.create({
    baseURL: `https://api.hubapi.com/crm/v3/objects/${objectType}`,
    timeout: 15000,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  const app = express();
  app.disable('x-powered-by');
  app.set('view engine', 'pug');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    // This practicum runs locally; reject cross-origin form submissions.
    if (req.method === 'POST' && req.get('origin') && req.get('origin') !== `${req.protocol}://${req.get('host')}`) {
      return res.status(403).send('Cross-origin submission rejected.');
    }
    next();
  });
  function failure(res, error, template, locals) {
    const upstream = error.response?.status;
    const status = upstream === 404 ? 404 : upstream === 429 ? 503 : 502;
    const message = upstream === 404 ? 'Project not found.' : upstream === 429 ? 'HubSpot rate limit reached. Please try again shortly.' : 'HubSpot request failed. Check your test-account credentials, scopes and object configuration.';
    // Never log Axios config: it contains the Authorization header.
    console.error('HubSpot request failed:', upstream || error.code || 'network error');
    return res.status(status).render(template, { ...locals, error: message });
  }
  // ROUTE 1: retrieve custom object records and display the new homepage.
  app.get('/', async (req, res) => {
    const after = req.query.after;
    if (after !== undefined && (typeof after !== 'string' || !/^\d{1,30}$/.test(after))) return res.status(400).send('Invalid page cursor.');
    try {
      const response = await api.get('', { params: { properties: PROPERTIES.join(','), limit: 100, ...(after ? { after } : {}) } });
      res.render('homepage', { title: 'Educational Projects', projects: response.data.results, next: response.data.paging?.next?.after, error: null });
    } catch (error) { failure(res, error, 'homepage', { title: 'Educational Projects', projects: [], next: null }); }
  });
  // ROUTE 2: show a blank form or retrieve an existing record for editing.
  app.get('/project-form', async (req, res) => {
    const id = req.query.id;
    const locals = { title: 'Create Educational Project', recordId: '', values: {}, error: null };
    if (id === undefined) return res.render('project-form', locals);
    if (typeof id !== 'string' || !/^\d+$/.test(id)) return res.status(400).send('Invalid record ID.');
    try {
      const response = await api.get(`/${id}`, { params: { properties: PROPERTIES.join(',') } });
      res.render('project-form', { ...locals, title: 'Update Educational Project', recordId: id, values: response.data.properties });
    } catch (error) { failure(res, error, 'project-form', locals); }
  });
  // ROUTE 3: create with POST or update with PATCH, then redirect home.
  app.post('/project-form', async (req, res) => {
    const recordId = req.body.record_id ?? '';
    const values = Object.fromEntries(PROPERTIES.map(key => [key, typeof req.body[key] === 'string' ? req.body[key].trim() : '']));
    const locals = { title: recordId ? 'Update Educational Project' : 'Create Educational Project', recordId: typeof recordId === 'string' ? recordId : '', values };
    if (typeof recordId !== 'string' || (recordId && !/^\d+$/.test(recordId)) || PROPERTIES.some(key => !values[key] || values[key].length > 200)) {
      return res.status(400).render('project-form', { ...locals, error: 'All fields are required (maximum 200 characters); the record ID must be valid.' });
    }
    try {
      const data = { properties: values };
      if (recordId) await api.patch(`/${recordId}`, data);
      else await api.post('', data);
      res.redirect(303, '/');
    } catch (error) { failure(res, error, 'project-form', locals); }
  });
  return app;
}
if (require.main === module) {
  try { createApp().listen(Number(process.env.PORT) || 3000, '127.0.0.1', () => console.log('Listening on http://localhost:' + (process.env.PORT || 3000))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { createApp, PROPERTIES };
