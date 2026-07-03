<?php
// scripts/build-email-logo.php
// Regenerates public/img/logo-brand-email.png from public/img/logo-brand.png
// Run via: php scripts/build-email-logo.php

$publicDir = __DIR__ . '/../public';
$src = $publicDir . '/img/logo-brand.png';
$dst = $publicDir . '/img/logo-brand-email.png';

if (!is_file($src)) {
    fwrite(STDERR, "Source not found: $src\n");
    exit(1);
}

$im = imagecreatefrompng($src);
if (!$im) {
    fwrite(STDERR, "GD failed to read $src\n");
    exit(1);
}
$w = imagesx($im); $h = imagesy($im);

$target = 112; // 2x retina for 56x56 display in email
$out = imagecreatetruecolor($target, $target);
imagealphablending($out, false);
imagesavealpha($out, true);
$transparent = imagecolorallocatealpha($out, 0, 0, 0, 127);
imagefilledrectangle($out, 0, 0, $target - 1, $target - 1, $transparent);
imagecopyresampled($out, $im, 0, 0, 0, 0, $target, $target, $w, $h);

imagepng($out, $dst, 9);
imagedestroy($im); imagedestroy($out);

$size = filesize($dst);
echo "Wrote {$dst} ({$target}x{$target} PNG, {$size} bytes)\n";
exit($size > 20 * 1024 ? 2 : 0);