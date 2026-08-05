// Diagnostic script: figures out exactly where documents are being lost
// between a student's upload and a host org seeing them.
//
// Run once with: node scripts/diagnoseDocumentUploads.js

require('dotenv').config();
const supabase = require('../config/db');

const BUCKET = 'application-documents';

(async () => {
  console.log('--- 1. Bucket config ---');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Could not list buckets:', listError.message);
  } else {
    const bucket = buckets.find((b) => b.name === BUCKET);
    console.log(bucket
      ? `Bucket found. public=${bucket.public}, file_size_limit=${bucket.file_size_limit}`
      : 'Bucket NOT found by that exact name.');
  }

  console.log('\n--- 2. Test upload ---');
  const testPath = `diagnostic/${Date.now()}_test.txt`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(testPath, Buffer.from('diagnostic test file'), { contentType: 'text/plain' });

  if (uploadError) {
    console.error('TEST UPLOAD FAILED:', uploadError.message);
  } else {
    console.log('Test upload succeeded at', testPath);
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(testPath);
    console.log('Public URL:', pub.publicUrl);
    // Clean up
    await supabase.storage.from(BUCKET).remove([testPath]);
  }

  console.log('\n--- 3. Recent applications: document_urls values ---');
  const { data: apps, error: appsError } = await supabase
    .from('applications')
    .select('application_id, student_id, org_id, status, created_at, document_urls')
    .order('created_at', { ascending: false })
    .limit(10);

  if (appsError) {
    console.error('Could not read applications:', appsError.message);
  } else if (!apps || apps.length === 0) {
    console.log('No applications found in the table at all.');
  } else {
    apps.forEach((a) => {
      console.log(
        `#${a.application_id} | student ${a.student_id} | org ${a.org_id} | ${a.status} | ${a.created_at} | document_urls: ${JSON.stringify(a.document_urls)}`
      );
    });
  }

  process.exit(0);
})();