const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Custom fetch with timeout — only applies signal if none already provided
const customFetch = (url, options = {}) => {
  if (options.signal) {
    // Supabase Auth already has its own signal, don't override it
    return fetch(url, options);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
};

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { transport: ws },
  global: {
    fetch: customFetch,
  },
});

// Test the connection
supabase
  .from('users')
  .select('count', { count: 'exact', head: true })
  .then(({ error }) => {
    if (error) console.error('❌ Supabase connection failed:', error.message);
    else console.log('✅ Supabase connected');
  })
  .catch((err) => console.error('❌ Supabase connection error:', err.message));

module.exports = supabase;