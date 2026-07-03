{{-- Custom password reset email template. --}}
{{-- Pure HTML + inline CSS for max compatibility across email clients. --}}
{{-- Registered via Illuminate\Auth\Notifications\ResetPassword::toMailUsing() in AppServiceProvider. --}}

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>Reset your ThinkChat password</title>
</head>
<body style="margin:0;padding:0;background-color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;-webkit-text-size-adjust:100%;">
    {{-- Preheader: shows in inbox previews before the user opens the email. --}}
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#fafafa;opacity:0;">
        Reset your ThinkChat password. The link expires in {{ $expiresIn ?? 60 }} minutes.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafafa;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);">

                    {{-- BRAND HEADER: logo on indigo background + ThinkChat wordmark. --}}
                    <tr>
                        <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px 32px 36px 32px;text-align:center;">
                            <img src="{{ $logoUrl ?? url('/img/logo-brand.png') }}" alt="ThinkChat" width="56" height="56" style="display:block;margin:0 auto 12px auto;border:0;outline:none;text-decoration:none;border-radius:12px;background-color:#1a1a2e;" />
                            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em;">ThinkChat</h1>
                            <p style="margin:6px 0 0 0;color:rgba(255,255,255,0.85);font-size:13px;">AI conversations, simplified.</p>
                        </td>
                    </tr>

                    {{-- BODY: greeting + explanation. --}}
                    <tr>
                        <td style="padding:36px 32px 8px 32px;">
                            <h2 style="margin:0 0 12px 0;color:#111827;font-size:22px;font-weight:700;letter-spacing:-0.015em;">Reset your password</h2>
                            <p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.55;">
                                @if(!empty($userName))
                                    Hi {{ $userName }},
                                @else
                                    Hi there,
                                @endif
                                we received a request to reset the password for your ThinkChat account. Tap the button below to choose a new one.
                            </p>
                        </td>
                    </tr>

                    {{-- CTA BUTTON: gradient pill matching the in-app brand. --}}
                    <tr>
                        <td style="padding:8px 32px 8px 32px;text-align:center;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center">
                                        <a href="{{ $resetUrl }}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:10px;letter-spacing:0.01em;box-shadow:0 4px 14px rgba(102,126,234,0.35);">
                                            Reset password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- FALLBACK URL for clients that strip buttons. --}}
                    <tr>
                        <td style="padding:24px 32px 0 32px;">
                            <p style="margin:0 0 4px 0;color:#6b7280;font-size:13px;line-height:1.5;">
                                Or paste this link into your browser:
                            </p>
                            <p style="margin:0;word-break:break-all;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;color:#4b5563;font-size:12px;font-family:'SF Mono',Monaco,Consolas,'Liberation Mono','Courier New',monospace;line-height:1.4;">
                                <a href="{{ $resetUrl }}" target="_blank" rel="noopener" style="color:#667eea;text-decoration:none;">{{ $resetUrl }}</a>
                            </p>
                        </td>
                    </tr>

                    {{-- EXPIRY CALLOUT: amber tone for "time-sensitive" info. --}}
                    <tr>
                        <td style="padding:24px 32px 8px 32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
                                <tr>
                                    <td style="padding:14px 16px;">
                                        <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                                            <strong style="font-weight:600;">This link expires in {{ $expiresIn ?? 60 }} minutes.</strong> For your security, you can only use it once.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:8px 32px 32px 32px;">
                            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.55;">
                                If you didn&rsquo;t request a password reset, you can safely ignore this email &mdash; your account is still secure.
                            </p>
                        </td>
                    </tr>

                    {{-- SIGN-OFF: closing block before footer. --}}
                    <tr>
                        <td style="padding:0 32px 32px 32px;">
                            <p style="margin:0;color:#374151;font-size:15px;line-height:1.55;">
                                Best regards,<br />
                                <span style="font-weight:600;color:#111827;">The ThinkChat Team</span>
                            </p>
                        </td>
                    </tr>

                    {{-- FOOTER: copyright only. --}}
                    <tr>
                        <td style="padding:20px 32px 24px 32px;border-top:1px solid #f3f4f6;background-color:#fafafa;">
                            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;text-align:center;">
                                &copy; {{ date('Y') }} ThinkChat. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
