import { spawn } from 'node:child_process';

// Tarayıcı sayfası gerçek bir dosya sistemi yolu veremez (güvenlik kısıtı).
// Sunucu kullanıcının kendi makinesinde çalıştığı için klasör penceresini
// burada açıp seçilen yolu geri veriyoruz.
//
// Not: FolderBrowserDialog STA iş parçacığı ister, bu yüzden -STA şart.
const PS_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms | Out-Null
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'İndirilen dosyaların kaydedileceği klasörü seç'
$dialog.ShowNewFolderButton = $true
if ($env:CEKICI_INITIAL_DIR -and (Test-Path $env:CEKICI_INITIAL_DIR)) {
  $dialog.SelectedPath = $env:CEKICI_INITIAL_DIR
}
# Pencere diger pencerelerin arkasinda kalmasin
$top = New-Object System.Windows.Forms.Form
$top.TopMost = $true
if ($dialog.ShowDialog($top) -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::Out.Write($dialog.SelectedPath)
}
$top.Dispose()
`;

/**
 * Yerel klasör seçme penceresini açar.
 * @returns {Promise<string|null>} seçilen yol, iptal edilirse null
 */
export function pickFolder(initialDir, { platform = process.platform } = {}) {
  if (platform !== 'win32') {
    return Promise.reject(new Error('Klasör seçici şu an sadece Windows üzerinde destekleniyor.'));
  }
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'powershell',
      ['-STA', '-NoProfile', '-NonInteractive', '-Command', PS_SCRIPT],
      { env: { ...process.env, CEKICI_INITIAL_DIR: initialDir ?? '' } },
    );
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (c) => (stdout += c));
    proc.stderr.on('data', (c) => (stderr += c));
    proc.on('error', (err) => reject(new Error(`Klasör penceresi açılamadı: ${err.message}`)));
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr.trim() || `Klasör seçici ${code} koduyla çıktı`));
      const chosen = stdout.trim();
      resolve(chosen || null); // boş çıktı = kullanıcı iptal etti
    });
  });
}
