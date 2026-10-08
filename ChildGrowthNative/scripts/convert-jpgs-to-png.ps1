Add-Type -AssemblyName System.Drawing

$dirs = @("C:\ClaudeProjects\ChildGrowth\ChildGrowthNative\assets", "C:\ClaudeProjects\ChildGrowth\ChildGrowthNative\src\assets")

$converted = 0
foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        $pngFiles = Get-ChildItem -Path $dir -Filter "*.png" -Recurse
        foreach ($file in $pngFiles) {
            $bytes = Get-Content $file.FullName -Encoding Byte -TotalCount 3
            if ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8 -and $bytes[2] -eq 0xFF) {
                # It's a JPEG! Convert to genuine PNG
                $img = [System.Drawing.Image]::FromFile($file.FullName)
                $bmp = New-Object System.Drawing.Bitmap($img)
                $img.Dispose()
                
                $memStream = New-Object System.IO.MemoryStream
                $bmp.Save($memStream, [System.Drawing.Imaging.ImageFormat]::Png)
                $bmp.Dispose()
                
                [System.IO.File]::WriteAllBytes($file.FullName, $memStream.ToArray())
                $memStream.Dispose()
                
                Write-Output "Converted to true PNG: $($file.FullName)"
                $converted++
            }
        }
    }
}
Write-Output "Total converted files: $converted"
