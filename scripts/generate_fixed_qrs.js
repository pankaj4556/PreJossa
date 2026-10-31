const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const apps = [
  { file: 'qr-navi.png', vpa: '8000859195@naviaxis', name: 'Pankaj Kumar' },
  { file: 'qr-phonepe.png', vpa: '8000859195-oc44@ibl', name: 'Pankaj Kumar' },
  { file: 'qr-paytm.png', vpa: '8000859195@ptsbi', name: 'Pankaj Kumar' }
];

async function generateQRs() {
  const targetDir = path.resolve(__dirname, '../public/images');
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  for (const app of apps) {
    // Official NPCI UPI URI with am=49 (fixed amount)
    const upiUri = `upi://pay?pa=${app.vpa}&pn=${encodeURIComponent(app.name)}&am=49&cu=INR&tn=${encodeURIComponent('PreJOSAA Choice List')}`;
    const dest = path.join(targetDir, app.file);
    await QRCode.toFile(dest, upiUri, {
      margin: 2,
      width: 420,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    });
    console.log(`Generated fixed ₹49 QR: ${app.file} -> ${upiUri}`);
  }
}

generateQRs().catch(console.error);
