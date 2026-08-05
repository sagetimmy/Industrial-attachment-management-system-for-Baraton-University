// One-time setup: creates the Supabase Storage bucket used to hold
// documents students attach to applications (routes/applications.routes.js).
// The bucket was referenced in code but never actually created, which is
// why uploaded documents never made it to host orgs — every upload
// failed silently and applications submitted with an empty document_urls.
//
// Run once with: node backend/scripts/setupApplicationDocumentsBucket.js

require('dotenv').config();
const supabase = require('../config/db');

const BUCKET = 'application-documents';

(async () => {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Failed to list buckets:', listError.message);
    process.exit(1);
  }

  const existing = buckets.find((b) => b.name === BUCKET);

  if (existing) {
    // The bucket existed but was created as private — getPublicUrl() in
    // applications.routes.js / HostApplicants.js / InternDetailScreen.js
    // only works against a public bucket, so URLs generated against a
    // private one silently fail to load.
    if (existing.public) {
      console.log(`Bucket "${BUCKET}" already exists and is already public — nothing to do.`);
      process.exit(0);
    }
    const { error: updateError } = await supabase.storage.updateBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
    });
    if (updateError) {
      console.error(`Failed to make bucket "${BUCKET}" public:`, updateError.message);
      process.exit(1);
    }
    console.log(`Bucket "${BUCKET}" existed but was private — updated it to public.`);
    process.exit(0);
  }

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: true, // documents are opened via public URL in HostApplicants.js / InternDetailScreen.js
    fileSizeLimit: 10 * 1024 * 1024, // matches the 10MB multer limit in applications.routes.js
  });

  if (createError) {
    console.error(`Failed to create bucket "${BUCKET}":`, createError.message);
    process.exit(1);
  }

  console.log(`Bucket "${BUCKET}" created successfully.`);
})();