const { execSync } = require('child_process');
const os = require('os');

// Set environment variables to disable signing
const env = {
  ...process.env,
  CSC_IDENTITY_AUTO_DISCOVERY: 'false',
  // Disable code signing completely
  WIN_CSC_LINK: '',
  WIN_CSC_KEY_PASSWORD: ''
};

console.log('========================================');
console.log('RimWorld Mod Downloader Build Script');
console.log('========================================');
console.log();

// Step 1: Build the app
console.log('[1/3] Building application...');
try {
  execSync('npm run build', { stdio: 'inherit', env });
  console.log('✓ Build completed');
} catch (e) {
  console.error('✗ Build failed:', e.message);
  process.exit(1);
}
console.log();

// Step 2: Package without signing using electron-builder CLI args
console.log('[2/3] Packaging (portable)...');
try {
  // Use electron-builder with explicit arguments to avoid signing
  const cmd = [
    'npx', 'electron-builder',
    '--win',
    '--x64',
    '--publish', 'never',
    '--config.asar=true',
    '--config.compression=maximum',
    '--config.directories.output=release/1.0.0',
    '--config.win.target=portable',
    '--config.win.signAndEditExecutable=false',
    '--config.win.signDlls=false',
    '--config.portable.artifactName=RimWorld-Mod-Downloader-1.0.0-portable.exe'
  ].join(' ');

  console.log('Running:', cmd);
  execSync(cmd, { stdio: 'inherit', env });
  console.log('✓ Packaging completed');
} catch (e) {
  console.error('✗ Packaging failed:', e.message);
  console.log();
  console.log('Trying alternative approach...');

  // Alternative: Try with a simpler config
  try {
    console.log();
    console.log('[2/3] Alternative packaging approach...');
    const simpleConfig = {
      appId: 'com.rimworld.moddownloader',
      productName: 'RimWorld Mod Downloader',
      directories: { output: 'release/1.0.0' },
      files: ['out/**/*', 'package.json'],
      win: { target: 'dir', signAndEditExecutable: false },
      asar: true
    };
    require('fs').writeFileSync('eb-config.json', JSON.stringify(simpleConfig, null, 2));
    execSync('npx electron-builder --win --config eb-config.json --publish never', { stdio: 'inherit', env });
    require('fs').unlinkSync('eb-config.json');
    console.log('✓ Directory build completed - check release/1.0.0/win-unpacked');
  } catch (e2) {
    console.error('✗ All packaging attempts failed');
    process.exit(1);
  }
}
console.log();

console.log('[3/3] Done!');
console.log('Check the release/1.0.0 folder for output');
