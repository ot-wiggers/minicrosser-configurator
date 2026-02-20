import { NextResponse } from 'next/server'
import { Resend } from 'resend'

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
  return new Resend(apiKey)
}

export async function POST(request: Request) {
  try {
    const { toEmail, subject, htmlBody, pdfBase64, filename } = await request.json()

    if (!toEmail || !subject || !pdfBase64 || !filename) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const resend = getResend()
    const { error } = await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: toEmail,
      subject,
      html: htmlBody || '<p>Anbei Ihr Dokument.</p>',
      attachments: [
        {
          filename,
          content: pdfBase64,
        },
      ],
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
