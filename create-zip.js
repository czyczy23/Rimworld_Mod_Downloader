const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceDir = path.join(__dirname, 'release/1.0.0/win-unpacked');
const outputFile = path.join(__dirname, 'release/1.0.0/RimWorld-Mod-Downloader-1.0.0-win64.zip');

console.log('Creating ZIP archive...');
console.log('Source:', sourceDir);
console.log('Output:', outputFile);

// 确保输出目录存在
fs.mkdirSync(path.dirname(outputFile), { recursive: true });

// 删除已存在的文件
if (fs.existsSync(outputFile)) {
  fs.unlinkSync(outputFile);
}

try {
  // 使用 PowerShell 创建压缩包
  const powershellCommand = `Compress-Archive -Path "${sourceDir}\\*" -DestinationPath "${outputFile}" -Force`;
  execSync(powershellCommand, { stdio: 'inherit', shell: 'powershell.exe' });

  console.log('\n✓ ZIP archive created successfully!');
  console.log('  File:', outputFile);
  const stats = fs.statSync(outputFile);
  console.log('  Size:', (stats.size / (1024 * 1024)).toFixed(2), 'MB');
} catch (error) {
  console.error('\n✗ Failed to create ZIP archive:', error.message);
  process.exit(1);
}
