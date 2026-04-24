const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

const hasConfig =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (hasConfig) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function uploadBuffer(buffer, { folder = 'clube-do-filme/posters' } = {}) {
  if (!hasConfig) {
    return Promise.reject(new Error('cloudinary_not_configured'));
  }
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => {
        if (err) return reject(err);
        resolve({ url: result.secure_url, public_id: result.public_id });
      },
    );
    Readable.from(buffer).pipe(upload);
  });
}

async function destroyAsset(publicId) {
  if (!hasConfig || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch {
    // best-effort
  }
}

module.exports = { uploadBuffer, destroyAsset, hasConfig };
