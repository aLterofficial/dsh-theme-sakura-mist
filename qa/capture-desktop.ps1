param([string]$Out = (Join-Path (Join-Path $PSScriptRoot '..') 'preview\desktop-blurred.png'))
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class WinCap {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int max);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
}
'@

$targets = @()
$cb = {
  param($hWnd, $lParam)
  if (-not [WinCap]::IsWindowVisible($hWnd)) { return $true }
  $pid_ = 0
  [void][WinCap]::GetWindowThreadProcessId($hWnd, [ref]$pid_)
  try { $proc = Get-Process -Id $pid_ -ErrorAction Stop } catch { return $true }
  if ($proc.ProcessName -ne 'DeepSeek Harness') { return $true }
  $len = [WinCap]::GetWindowTextLength($hWnd)
  $sb = New-Object System.Text.StringBuilder ($len + 1)
  [void][WinCap]::GetWindowText($hWnd, $sb, $sb.Capacity)
  $r = New-Object WinCap+RECT
  [void][WinCap]::GetWindowRect($hWnd, [ref]$r)
  $w = $r.Right - $r.Left; $h = $r.Bottom - $r.Top
  if ($w -lt 400 -or $h -lt 300) { return $true }
  $script:targets += [pscustomobject]@{ Hwnd = $hWnd; Title = $sb.ToString(); X = $r.Left; Y = $r.Top; W = $w; H = $h; Pid = $pid_ }
  return $true
}
[void][WinCap]::EnumWindows($cb, [IntPtr]::Zero)

$targets | Format-Table -AutoSize | Out-String | Write-Output
if ($targets.Count -eq 0) { Write-Error 'no window'; exit 1 }
$t = $targets | Sort-Object { $_.W * $_.H } -Descending | Select-Object -First 1

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Out) | Out-Null

# 1) PrintWindow without stealing focus
$bmp = New-Object System.Drawing.Bitmap($t.W, $t.H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
$ok = [WinCap]::PrintWindow($t.Hwnd, $hdc, 2)
$g.ReleaseHdc($hdc)
$g.Dispose()
if ($ok) { $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png) }

# brightness check to detect a black PrintWindow result
$sample = New-Object System.Drawing.Bitmap($bmp)
$sum = 0; $n = 0
for ($x = 10; $x -lt $sample.Width; $x += 97) {
  for ($y = 10; $y -lt $sample.Height; $y += 97) {
    $c = $sample.GetPixel($x, $y); $sum += ($c.R + $c.G + $c.B); $n++
  }
}
$avg = if ($n -gt 0) { $sum / ($n * 3) } else { 0 }
$sample.Dispose()
Write-Output ("PrintWindow ok=$ok avg=$([math]::Round($avg,1)) size=$($t.W)x$($t.H) title=$($t.Title)")

if (-not $ok -or $avg -lt 8) {
  # 2) fallback: bring to front and copy from screen
  [void][WinCap]::ShowWindow($t.Hwnd, 9)
  [void][WinCap]::SetForegroundWindow($t.Hwnd)
  Start-Sleep -Milliseconds 450
  $r = New-Object WinCap+RECT
  [void][WinCap]::GetWindowRect($t.Hwnd, [ref]$r)
  $w = $r.Right - $r.Left; $h = $r.Bottom - $r.Top
  $bmp2 = New-Object System.Drawing.Bitmap($w, $h)
  $g2 = [System.Drawing.Graphics]::FromImage($bmp2)
  $g2.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp2.Size)
  $g2.Dispose()
  $bmp2.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp2.Dispose()
  Write-Output "Fallback CopyFromScreen saved $Out"
}
$bmp.Dispose()
